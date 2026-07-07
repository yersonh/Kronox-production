<?php

namespace App\Notifications;

use App\Models\Evento;
use App\Services\CoreApiClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class EventoInvitadoNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Evento $evento) {}

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $evento   = $this->evento->loadMissing(['sala', 'tipoEvento']);
        $core     = app(CoreApiClient::class);
        $persona  = $evento->responsable_id ? $core->obtenerPersona($evento->responsable_id) : null;
        $fecha    = $evento->fecha_hora->format('d/m/Y');
        $hora     = $evento->fecha_hora->format('H:i');
        $horaFin  = $evento->fecha_hora_fin?->format('H:i');
        $appUrl   = config('app.url') . '/mis-eventos';

        $mensaje = (new MailMessage)
            ->subject('Invitación a evento: ' . $evento->tema . ' — ' . $fecha)
            ->greeting('¡Hola ' . $notifiable->name . '!')
            ->line('Has sido invitado(a) a un evento en el sistema **Kronox** de la Alcaldía de Monterrey:')
            ->line('---')
            ->line('## ' . $evento->tema);

        if ($evento->tipoEvento?->nombre) {
            $mensaje->line('• **Tipo:** ' . $evento->tipoEvento->nombre);
        }

        $duracion = $hora . ($horaFin ? ' — ' . $horaFin : '');
        $mensaje->line('• **Fecha:** ' . $fecha . ' · ' . $duracion)
                ->line('• **Responsable:** ' . ($persona['nombres'] ?? '') . ' ' . ($persona['apellidos'] ?? ''));

        if ($evento->sala?->nombre) {
            $mensaje->line('• **Sala:** ' . $evento->sala->nombre);
        } elseif ($evento->sitio) {
            $mensaje->line('• **Lugar:** ' . $evento->sitio);
        }

        $deps = $core->obtenerDependencias()->only($evento->dependenciaIds())->pluck('nombre')->join(', ');
        if ($deps) {
            $mensaje->line('• **Dependencia(s):** ' . $deps);
        }

        if ($evento->enlace_meet) {
            $mensaje->line('• **Enlace Meet:** ' . $evento->enlace_meet);
        }

        if ($evento->descripcion) {
            $mensaje->line('---')->line('**Descripción:**')->line($evento->descripcion);
        }

        if ($evento->observaciones) {
            $mensaje->line('**Observaciones:** ' . $evento->observaciones);
        }

        return $mensaje
            ->action('Ver mis eventos', $appUrl)
            ->line('---')
            ->line('Si tienes dudas sobre este evento comunícate con el responsable indicado.');
    }
}
