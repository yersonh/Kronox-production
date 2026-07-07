<?php

namespace App\Console\Commands;

use App\Models\Evento;
use App\Models\EventoInvitado;
use App\Models\User;
use App\Notifications\EventoProximoNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class NotificarProximidadEventosCommand extends Command
{
    protected $signature   = 'eventos:notificar-proximos';
    protected $description = 'Envía recordatorios a invitados de eventos próximos (48h, 24h, 1h)';

    // Cada umbral: [horas_ventana_min, horas_ventana_max, flag_columna, horas_param]
    private array $umbrales = [
        ['min' => 47,   'max' => 48,  'flag' => 'notificado_48h', 'horas' => 48],
        ['min' => 23,   'max' => 24,  'flag' => 'notificado_24h', 'horas' => 24],
        ['min' => 0.75, 'max' => 1,   'flag' => 'notificado_1h',  'horas' => 1],
    ];

    public function handle(): void
    {
        $ahora = Carbon::now();
        $total = 0;

        foreach ($this->umbrales as $umbral) {
            $desde = $ahora->copy()->addMinutes((int) ($umbral['min'] * 60));
            $hasta = $ahora->copy()->addMinutes((int) ($umbral['max'] * 60));

            $eventos = Evento::with(['invitados', 'sala'])
                ->whereIn('estado', ['programado', 'en_curso'])
                ->whereBetween('fecha_hora', [$desde, $hasta])
                ->get();

            $personaIds = $eventos->flatMap(fn ($e) => $e->invitados->pluck('persona_id'))->filter()->unique();
            $usuariosPorPersona = User::whereIn('persona_id', $personaIds)->get()->keyBy('persona_id');

            foreach ($eventos as $evento) {
                foreach ($evento->invitados as $invitado) {
                    if ($invitado->{$umbral['flag']}) {
                        continue;
                    }

                    if ($user = $usuariosPorPersona->get($invitado->persona_id)) {
                        $user->notify(
                            new EventoProximoNotification($evento, $umbral['horas'])
                        );
                        $total++;
                    }

                    EventoInvitado::where('id', $invitado->id)
                        ->update([$umbral['flag'] => true]);
                }
            }
        }

        $this->info("Recordatorios encolados: {$total}");
    }
}
