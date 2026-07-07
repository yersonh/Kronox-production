<?php

namespace App\Notifications;

use App\Models\Evento;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class AsistenciaConfirmadaNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /** @param array $persona Datos de la persona devueltos por el Core. */
    public function __construct(
        public Evento  $evento,
        public array   $persona,
        public string  $confirmacion  // 'confirmado' | 'rechazado'
    ) {}

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $evento      = $this->evento;
        $persona     = $this->persona;
        $confirmado  = $this->confirmacion === 'confirmado';
        $nombreInv   = trim(($persona['nombres'] ?? '') . ' ' . ($persona['apellidos'] ?? ''));
        $fecha       = $evento->fecha_hora->format('d/m/Y');
        $hora        = $evento->fecha_hora->format('H:i');
        $appUrl      = config('app.url') . '/eventos';

        $accion = $confirmado ? 'confirmó su asistencia' : 'rechazó la invitación';
        $estado = $confirmado ? 'Confirmada' : 'Rechazada';

        $mensaje = (new MailMessage)
            ->subject(($confirmado ? '[Confirmado]' : '[Rechazado]') . ' Asistencia — ' . $evento->tema)
            ->greeting('¡Hola ' . $notifiable->name . '!')
            ->line("**{$nombreInv}** ha **{$accion}** para el siguiente evento:")
            ->line('---')
            ->line('**' . $evento->tema . '**')
            ->line('• **Fecha:** ' . $fecha . ' a las ' . $hora)
            ->line('• **Asistencia:** ' . $estado);

        if ($evento->sala?->nombre) {
            $mensaje->line('• **Sala:** ' . $evento->sala->nombre);
        } elseif ($evento->sitio) {
            $mensaje->line('• **Lugar:** ' . $evento->sitio);
        }

        return $mensaje
            ->action('Ver evento', $appUrl)
            ->line('---')
            ->line('Este es un aviso automático del sistema.');
    }
}
