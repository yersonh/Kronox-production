<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RecordatorioContrasenaNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $loginUrl = url('/login');

        return (new MailMessage)
            ->subject('Recordatorio: Cambie su contraseña temporal — Kronox')
            ->greeting('Hola, ' . $notifiable->name)
            ->line('Le recordamos que aún **no ha cambiado su contraseña temporal** en el sistema Kronox de la Alcaldía de Monterrey.')
            ->line('Por seguridad, debe establecer una contraseña personal antes de que venzan las 24 horas desde la creación de su cuenta.')
            ->action('Ingresar y cambiar contraseña', $loginUrl)
            ->line('Al iniciar sesión, el sistema le guiará para establecer su nueva contraseña.')
            ->line('---')
            ->line('• Este es un correo automático, por favor no responda a esta dirección.')
            ->line('• Si tiene problemas para acceder, comuníquese con el Departamento de Sistemas.')
            ->salutation("Atentamente,\n\n**Departamento de Sistemas**\nAlcaldía de Monterrey");
    }
}
