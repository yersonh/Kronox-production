<?php

namespace App\Notifications;

use App\Models\Evento;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class EventoCerradoAutomaticoNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Evento $evento) {}

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $evento   = $this->evento;
        $fecha    = $evento->fecha_hora->format('d/m/Y');
        $horaFin  = ($evento->fecha_hora_fin ?? $evento->fecha_hora)->format('H:i');
        $appUrl   = config('app.url') . '/eventos';

        return (new MailMessage)
            ->subject('Evento cerrado automáticamente: ' . $evento->tema)
            ->greeting('Hola ' . $notifiable->name . ',')
            ->line('El siguiente evento fue **cerrado automáticamente** por el sistema porque no fue finalizado manualmente antes de la medianoche:')
            ->line('---')
            ->line('**' . $evento->tema . '**')
            ->line('• **Fecha:** ' . $fecha)
            ->line('• **Hora fin programada:** ' . $horaFin)
            ->line('---')
            ->line('Los eventos cerrados automáticamente **no registran conclusiones ni asistencia**. Si necesitas dejar constancia de lo ocurrido, comunícate con un administrador del sistema.')
            ->action('Ver mis eventos', $appUrl)
            ->line('Para evitar cierres automáticos, finaliza el evento desde el sistema antes de que termine el día.');
    }
}
