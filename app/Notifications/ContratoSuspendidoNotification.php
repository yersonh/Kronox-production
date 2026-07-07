<?php

namespace App\Notifications;

use App\Models\Contratista;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class ContratoSuspendidoNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Contratista $contratista,
        public string $motivo
    ) {}

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $c      = $this->contratista;
        $core   = $c->coreData();
        $nombre = trim(($core['nombres'] ?? '') . ' ' . ($core['apellidos'] ?? ''));

        return (new MailMessage)
            ->subject("⛔ Contrato suspendido — {$nombre}")
            ->greeting("Hola {$notifiable->name},")
            ->line('Su contrato ha sido **suspendido** por el área de contratación.')
            ->line('---')
            ->line("• **Contrato N°:** " . ($c->numero_contrato ?? 'Sin número'))
            ->line("• **Motivo de suspensión:** " . $this->motivo)
            ->line('---')
            ->line('Su acceso al sistema ha sido desactivado temporalmente. Para mayor información comuníquese con el área de contratación de la entidad.')
            ->line('Este es un aviso automático del sistema.')
            ->salutation("Atentamente,\n\n**Kronox**");
    }
}
