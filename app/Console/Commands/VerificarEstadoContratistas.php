<?php

namespace App\Console\Commands;

use App\Models\Contratista;
use App\Models\User;
use App\Notifications\ContratoVencidoNotification;
use App\Notifications\ContratoVencimientoNotification;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Notification;

class VerificarEstadoContratistas extends Command
{
    protected $signature   = 'contratistas:verificar-estado';
    protected $description = 'Verifica vencimientos de contratos y actualiza estados. Envía alertas por correo.';

    public function handle(): void
    {
        $hoy = now()->startOfDay();

        // Contratistas con contrato activo (no suspendidos manualmente)
        $contratistas = Contratista::whereNotNull('fecha_fin')
            ->where('estado_contrato', '!=', 'suspendido')
            ->get();

        $usuariosPorPersona = User::whereIn('persona_id', $contratistas->pluck('persona_id')->filter()->unique())
            ->get()->keyBy('persona_id');

        $vencidos      = 0;
        $porVencer     = 0;
        $normalizados  = 0;

        foreach ($contratistas as $c) {
            $usuario = $usuariosPorPersona->get($c->persona_id);
            $dias = (int) $hoy->diffInDays($c->fecha_fin, false); // negativo = ya venció

            // ── Vencido ────────────────────────────────────────────────
            if ($dias < 0) {
                if ($c->estado_contrato !== 'vencido') {
                    $c->update(['estado_contrato' => 'vencido']);

                    // Bloquear acceso al sistema
                    if ($user = $usuario) {
                        $user->update(['activo' => false]);
                    }

                    // Notificar a admins y supervisores
                    $this->notificarAdmins(new ContratoVencidoNotification($c));

                    // Notificar al propio contratista
                    if ($user = $usuario) {
                        $user->notify(new ContratoVencidoNotification($c));
                    }

                    $vencidos++;
                } else {
                    // Ya marcado como vencido: sincronizar activo por si quedó desincronizado
                    if ($user = $usuario) {
                        if ($user->activo) {
                            $user->update(['activo' => false]);
                        }
                    }
                }
                continue;
            }

            // ── Por vencer ─────────────────────────────────────────────
            if ($dias <= 30) {
                $updates = ['estado_contrato' => 'por_vencer'];

                if ($dias <= 7 && !$c->notificado_7d) {
                    $updates['notificado_7d'] = true;
                    $this->notificarAdmins(new ContratoVencimientoNotification($c, 7));
                    if ($user = $usuario) {
                        $user->notify(new ContratoVencimientoNotification($c, 7));
                    }
                    $porVencer++;
                } elseif ($dias <= 15 && !$c->notificado_15d) {
                    $updates['notificado_15d'] = true;
                    $this->notificarAdmins(new ContratoVencimientoNotification($c, 15));
                    if ($user = $usuario) {
                        $user->notify(new ContratoVencimientoNotification($c, 15));
                    }
                    $porVencer++;
                } elseif ($dias <= 30 && !$c->notificado_30d) {
                    $updates['notificado_30d'] = true;
                    $this->notificarAdmins(new ContratoVencimientoNotification($c, 30));
                    if ($user = $usuario) {
                        $user->notify(new ContratoVencimientoNotification($c, 30));
                    }
                    $porVencer++;
                }

                $c->update($updates);
                continue;
            }

            // ── Vigente (más de 30 días restantes) ─────────────────────
            if ($c->estado_contrato !== 'vigente') {
                $c->update(['estado_contrato' => 'vigente']);
                $normalizados++;
            }
        }

        $this->info("Vencidos: {$vencidos} | Alertas enviadas: {$porVencer} | Normalizados: {$normalizados}");
    }

    private function notificarAdmins($notification): void
    {
        \App\Models\User::whereIn('rol', ['admin', 'supervisor_contratos'])
            ->where('activo', true)
            ->each(fn($u) => $u->notify($notification));
    }
}
