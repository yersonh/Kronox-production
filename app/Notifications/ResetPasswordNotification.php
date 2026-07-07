<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class ResetPasswordNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public $token;

    public function __construct($token)
    {
        $this->token = $token;
    }

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable)
    {
        $url = config('app.url') . '/reset-password?token=' . $this->token . '&email=' . urlencode($notifiable->email);

        return (new MailMessage)
            ->subject('Restablecer Contraseña - Kronox | Alcaldía de Monterrey')
            ->greeting('¡Hola ' . $notifiable->name . '!')
            ->line('Recibimos una solicitud para restablecer la contraseña de tu cuenta en el **Kronox** de la Alcaldía de Monterrey.')
            ->action('Restablecer Contraseña', $url)
            ->line('Este enlace de restablecimiento tiene una validez de **60 minutos**. Si no realizaste esta solicitud, ignora este correo.')
            ->line('---')
            ->line('**Información importante:**')
            ->line('• Este es un correo automático, por favor no responda a esta dirección.')
            ->line('• Si no solicitaste el restablecimiento de contraseña, comuníquese con el Departamento de Sistemas.')
            ->salutation("Atentamente,\n\n**Departamento de Sistemas**\nAlcaldía de Monterrey");
    }
}
