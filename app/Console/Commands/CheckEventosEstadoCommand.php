<?php

namespace App\Console\Commands;

use App\Models\Evento;
use App\Models\User;
use App\Notifications\EventoCerradoAutomaticoNotification;
use App\Notifications\EventoPendienteFinalizarNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class CheckEventosEstadoCommand extends Command
{
    protected $signature   = 'eventos:check-estado';
    protected $description = 'Transiciona estados de eventos: programado→en_curso, finalizado→cerrado, y en_curso→cerrado por abandono';

    public function handle(): void
    {
        $ahora = Carbon::now();

        // programado/aplazado → en_curso cuando llega la hora de inicio
        $iniciados = Evento::whereIn('estado', ['programado', 'programada', 'aplazado', 'aplazada'])
            ->where('fecha_hora', '<=', $ahora)
            ->update(['estado' => 'en_curso']);

        // -----------------------------------------------------------------------
        // Notificar al responsable si el evento lleva 2h pasada su hora fin
        // y aún está en_curso (nadie lo finalizó).
        // Se envía UNA sola vez gracias al flag notificado_pendiente_finalizar.
        // -----------------------------------------------------------------------
        $limiteNotificacion = $ahora->copy()->subHours(2);

        $pendientesNotificar = Evento::where('estado', 'en_curso')
            ->where('notificado_pendiente_finalizar', false)
            ->where(function ($q) use ($limiteNotificacion) {
                $q->where(function ($q2) use ($limiteNotificacion) {
                    $q2->whereNotNull('fecha_hora_fin')
                       ->where('fecha_hora_fin', '<', $limiteNotificacion);
                })->orWhere(function ($q2) use ($limiteNotificacion) {
                    $q2->whereNull('fecha_hora_fin')
                       ->where('fecha_hora', '<', $limiteNotificacion);
                });
            })
            ->get();

        $usuariosPorPersona = User::whereIn('persona_id', $pendientesNotificar->pluck('responsable_id')->filter()->unique())
            ->get()->keyBy('persona_id');

        $notificados = 0;
        foreach ($pendientesNotificar as $evento) {
            $user = $usuariosPorPersona->get($evento->responsable_id);

            if ($user) {
                $user->notify(new EventoPendienteFinalizarNotification($evento));
                $notificados++;
            }

            // Marcar como notificado aunque no tenga user para no reintentar en cada minuto
            $evento->update(['notificado_pendiente_finalizar' => true]);
        }

        // -----------------------------------------------------------------------
        // en_curso → cerrado a las 00:00 del día siguiente si nadie lo finalizó
        // (fecha_hora_fin o fecha_hora pertenecen a un día anterior a hoy)
        // -----------------------------------------------------------------------
        $hoy = Carbon::today()->toDateTimeString();

        $eventosAbandonados = Evento::where('estado', 'en_curso')
            ->where(function ($q) use ($hoy) {
                $q->where(function ($q2) use ($hoy) {
                    $q2->whereNotNull('fecha_hora_fin')
                        ->where('fecha_hora_fin', '<', $hoy);
                })->orWhere(function ($q2) use ($hoy) {
                    $q2->whereNull('fecha_hora_fin')
                        ->where('fecha_hora', '<', $hoy);
                });
            })
            ->get();

        $usuariosAbandono = User::whereIn('persona_id', $eventosAbandonados->pluck('responsable_id')->filter()->unique())
            ->get()->keyBy('persona_id');

        foreach ($eventosAbandonados as $evento) {
            $evento->update(['estado' => 'cerrado']);
            $user = $usuariosAbandono->get($evento->responsable_id);
            if ($user) {
                $user->notify(new EventoCerradoAutomaticoNotification($evento));
            }
        }

        $abandonados = $eventosAbandonados->count();

        $this->info("Estados actualizados — iniciados: {$iniciados}, notificados responsables: {$notificados}, cerrados por abandono: {$abandonados}");
    }
}
