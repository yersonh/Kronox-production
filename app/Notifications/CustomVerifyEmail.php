<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;

class CustomVerifyEmail extends VerifyEmail implements ShouldQueue
{
    use Queueable;

    /**
     * Get the mail representation of the notification.
     */
    public function toMail($notifiable)
    {
        $verificationUrl = $this->verificationUrl($notifiable);

        return (new MailMessage)
            ->subject('Verificación de Cuenta - Kronox | Alcaldía de Monterrey')
            ->greeting('¡Bienvenido(a) ' . $notifiable->name . '!')
            ->line('Su cuenta ha sido creada en el **Kronox** de la Alcaldía de Monterrey.')
            ->line('Para garantizar la seguridad de su cuenta y acceder a todas las funcionalidades del sistema, es necesario que verifique su dirección de correo electrónico.')
            ->action('Verificar mi cuenta', $verificationUrl)
            ->line('Este enlace de verificación tiene una validez de **60 minutos**. Si el enlace expira, deberá solicitar uno nuevo a su administrador.')
            ->line('---')
            ->line('**Información importante:**')
            ->line('• Este es un correo automático, por favor no responda a esta dirección.')
            ->line('• Si no ha solicitado esta cuenta, comuníquese con el Departamento de Sistemas.')
            ->salutation("Atentamente,\n\n**Departamento de Sistemas**\nAlcaldía de Monterrey");
    }
}