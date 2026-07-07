<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CredencialesAccesoNotification extends Notification implements ShouldQueue
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
            ->subject('Bienvenido(a) a Kronox — Sus credenciales de acceso')
            ->greeting('¡Bienvenido(a) ' . $notifiable->name . '!')
            ->line('Su cuenta ha sido creada en el **Kronox** de la Alcaldía de Monterrey.')
            ->line('A continuación encontrará sus credenciales de acceso al sistema:')
            ->line('**Correo:** ' . $notifiable->email)
            ->line('**Contraseña temporal:** ' . $this->password)
            ->action('Ingresar al sistema', $loginUrl)
            ->line('---')
            ->line('**Importante:** Tan pronto como ingrese al sistema, diríjase a **Mi Perfil** y cargue todos sus documentos requeridos lo antes posible.')
            ->action('Ir a Mi Perfil', url('/perfil'))
            ->line('---')
            ->line('**Importante:** Por seguridad, tiene **24 horas** para cambiar su contraseña temporal.')
            ->line('Al iniciar sesión, el sistema le solicitará que establezca una nueva contraseña personal.')
            ->line('Si no cambia su contraseña en ese plazo, recibirá recordatorios cada 8 horas.')
            ->line('---')
            ->line('• Este es un correo automático, por favor no responda a esta dirección.')
            ->line('• Si no solicitó esta cuenta, comuníquese con el Departamento de Sistemas.')
            ->salutation("Atentamente,\n\n**Departamento de Sistemas**\nAlcaldía de Monterrey");
    }
}
