<?php

namespace App\Notifications;

use App\Models\Evento;
use App\Services\CoreApiClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class EventoCanceladoNotification extends Notification implements ShouldQueue
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
        $persona = $evento->responsable_id ? app(CoreApiClient::class)->obtenerPersona($evento->responsable_id) : null;
        $responsable = $persona ? trim(($persona['nombres'] ?? '') . ' ' . ($persona['apellidos'] ?? '')) : 'N/A';
        $appUrl  = config('app.url') . '/mis-eventos';

        $mensaje = (new MailMessage)
            ->subject('Evento Cancelado - Kronox | Alcaldía de Monterrey')
            ->greeting('¡Hola ' . $notifiable->name . '!')
            ->line('Te informamos que el siguiente evento ha sido **cancelado**:')
            ->line('---')
            ->line('**' . $evento->tema . '**')
            ->line('**Fecha Original:** ' . $evento->fecha_hora->format('d/m/Y') . ' a las ' . $evento->fecha_hora->format('H:i'))
            ->line('**Responsable:** ' . $responsable);

        if ($evento->sala?->nombre) {
            $mensaje->line('**Sala:** ' . $evento->sala->nombre);
        } elseif ($evento->sitio) {
            $mensaje->line('**Lugar:** ' . $evento->sitio);
        }

        if ($evento->observaciones) {
            $mensaje->line('**Motivo/Observaciones:** ' . $evento->observaciones);
        }

        return $mensaje
            ->line('---')
            ->line('**Este evento ha sido cancelado y no se llevará a cabo.**')
            ->action('Ver mis eventos', $appUrl)
            ->line('Si tienes preguntas, comunícate con el responsable del evento.')
            ->line('Este es un correo automático, por favor no responda a esta dirección.')
            ->salutation("Atentamente,\n**Departamento de Sistemas**\nAlcaldía de Monterrey");
    }
}
