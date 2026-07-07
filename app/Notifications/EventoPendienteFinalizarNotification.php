<?php

namespace App\Notifications;

use App\Models\Evento;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class EventoPendienteFinalizarNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Evento $evento) {}

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $evento      = $this->evento;
        $tema        = $evento->tema;
        $fechaFin    = ($evento->fecha_hora_fin ?? $evento->fecha_hora)->format('d/m/Y H:i');
        $appUrl      = config('app.url') . '/eventos/' . $evento->id . '/edit';

        return (new MailMessage)
            ->subject("Evento pendiente de finalizar: '{$tema}' - Kronox Agenda")
            ->greeting('¡Hola ' . $notifiable->name . '!')
            ->line('El evento del que eres responsable **ya superó su hora de finalización** y aún no ha sido cerrado oficialmente.')
            ->line('---')
            ->line('**' . $tema . '**')
            ->line('• **Hora fin programada:** ' . $fechaFin)
            ->line('---')
            ->line('Por favor, ingresa al sistema y **finaliza el evento** registrando las conclusiones y la asistencia. Si no se finaliza manualmente, el sistema lo cerrará automáticamente a medianoche.')
            ->action('Finalizar evento ahora', $appUrl)
            ->line('---')
            ->line('Este es un aviso automático del Sistema de Agenda y Actividades.')
            ->salutation("Atentamente,\n\n**Departamento de Sistemas**\nAlcaldía de Monterrey");
    }
}
