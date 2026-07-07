<?php

namespace App\Notifications;

use App\Models\Tarea;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class TareaAsignadaNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Tarea $tarea) {}

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $tarea      = $this->tarea;
        $fechaHora  = $tarea->fecha_hora->format('d/m/Y H:i');
        $vencimiento = $tarea->fecha_vencimiento?->format('d/m/Y') ?? 'No definido';
        $prioridad  = $tarea->prioridad?->nombre ?? 'Normal';
        $appUrl     = config('app.url') . '/mis-tareas';

        $mensaje = (new MailMessage)
            ->subject('Nueva tarea asignada: ' . $tarea->asunto)
            ->greeting('¡Hola ' . $notifiable->name . '!')
            ->line('Se te ha asignado una nueva tarea en el sistema **Kronox**:')
            ->line('---')
            ->line('**' . $tarea->asunto . '**')
            ->line('• **Prioridad:** ' . $prioridad)
            ->line('• **Fecha de asignación:** ' . $fechaHora)
            ->line('• **Fecha de vencimiento:** ' . $vencimiento);

        if ($tarea->descripcion) {
            $mensaje->line('---')->line('**Descripción:**')->line($tarea->descripcion);
        }

        return $mensaje
            ->action('Ver mis tareas', $appUrl)
            ->line('---')
            ->line('Si tienes dudas sobre esta tarea comunícate con tu superior inmediato.');
    }
}
