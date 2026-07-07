<?php

namespace App\Notifications;

use App\Models\Evento;
use App\Services\CoreApiClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class EventoAplazadoNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Evento $evento) {}

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $evento  = $this->evento;
        $fecha   = $evento->fecha_hora->format('d/m/Y');
        $hora    = $evento->fecha_hora->format('H:i');
        $persona = $evento->responsable_id ? app(CoreApiClient::class)->obtenerPersona($evento->responsable_id) : null;
        $responsable = $persona ? trim(($persona['nombres'] ?? '') . ' ' . ($persona['apellidos'] ?? '')) : 'N/A';
        $appUrl  = config('app.url') . '/mis-eventos';

        $mensaje = (new MailMessage)
            ->subject('Evento Aplazado - Kronox | Alcaldía de Monterrey')
            ->greeting('¡Hola ' . $notifiable->name . '!')
            ->line('Te informamos que el siguiente evento ha sido **aplazado** a una nueva fecha:')
            ->line('---')
            ->line('**' . $evento->tema . '**')
            ->line('**Nueva Fecha:** ' . $fecha . ' a las ' . $hora)
            ->line('**Responsable:** ' . $responsable);

        if ($evento->sala?->nombre) {
            $mensaje->line('**Sala:** ' . $evento->sala->nombre);
        } elseif ($evento->sitio) {
            $mensaje->line('**Lugar:** ' . $evento->sitio);
        }

        if ($evento->enlace_meet) {
            $mensaje->line('**Enlace Meet:** ' . $evento->enlace_meet);
        }

        if ($evento->observaciones) {
            $mensaje->line('**Observaciones:** ' . $evento->observaciones);
        }

        return $mensaje
            ->line('---')
            ->line('**Por favor, confirma tu asistencia a la nueva fecha.**')
            ->action('Ver mis eventos', $appUrl)
            ->line('Este es un correo automático, por favor no responda a esta dirección.')
            ->salutation("Atentamente,\n**Departamento de Sistemas**\nAlcaldía de Monterrey");
    }
}
