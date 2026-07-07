<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ContrasenaReseteadaNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private string $password) {}

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $loginUrl = url('/login');

        return (new MailMessage)
            ->subject('Kronox — Su contraseña fue restablecida')
            ->greeting('Hola ' . $notifiable->name . ',')
            ->line('Su contraseña en el **Kronox** de la Alcaldía de Monterrey fue restablecida por un administrador.')
            ->line('A continuación encontrará sus nuevas credenciales de acceso:')
            ->line('**Correo:** ' . $notifiable->email)
            ->line('**Contraseña temporal:** ' . $this->password)
            ->action('Ingresar al sistema', $loginUrl)
            ->line('---')
            ->line('**Importante:** Al iniciar sesión, el sistema le solicitará que establezca una nueva contraseña personal.')
            ->line('---')
            ->line('• Este es un correo automático, por favor no responda a esta dirección.')
            ->line('• Si usted no solicitó este cambio, comuníquese de inmediato con el Departamento de Sistemas.')
            ->salutation("Atentamente,\n\n**Departamento de Sistemas**\nAlcaldía de Monterrey");
    }
}
