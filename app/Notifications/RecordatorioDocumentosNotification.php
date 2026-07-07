<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class RecordatorioDocumentosNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private array $faltantes) {}

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject('Documentos pendientes — Kronox')
            ->greeting('Hola, ' . $notifiable->name)
            ->line('Hay documentos requeridos que **aún no han sido cargados** en el sistema.')
            ->line('Por favor ingrese a **Mi Perfil** y cárguelos lo antes posible, ya que son necesarios para el correcto registro de su vinculación.')
            ->line('**Documentos pendientes:**');

        foreach ($this->faltantes as $doc) {
            $mail->line('• ' . $doc);
        }

        return $mail
            ->action('Ir a Mi Perfil', url('/perfil'))
            ->line('---')
            ->line('• Este es un correo automático, por favor no responda a esta dirección.')
            ->salutation("Atentamente,\n\n**Departamento de Sistemas**\nAlcaldía de Monterrey");
    }
}
