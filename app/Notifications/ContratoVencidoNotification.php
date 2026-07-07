<?php

namespace App\Notifications;

use App\Models\Contratista;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class ContratoVencidoNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public Contratista $contratista) {}

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $c      = $this->contratista;
        $core   = $c->coreData();
        $nombre = trim(($core['nombres'] ?? '') . ' ' . ($core['apellidos'] ?? ''));
        $fecha  = $c->fecha_fin->format('d/m/Y');
        $appUrl = config('app.url') . '/gestion-contratos';
        $dependencia = $c->dependencia_id ? app(\App\Services\CoreApiClient::class)->obtenerDependencias()->get($c->dependencia_id) : null;

        return (new MailMessage)
            ->subject("Contrato vencido — {$nombre}")
            ->greeting('Aviso de vencimiento de contrato')
            ->line("El contrato del contratista **{$nombre}** ha vencido el **{$fecha}**.")
            ->line('Su acceso al sistema ha sido **desactivado automáticamente**.')
            ->line('---')
            ->line("• **Contrato N°:** " . ($c->numero_contrato ?? 'Sin número'))
            ->line("• **Dependencia:** " . ($dependencia['nombre'] ?? '—'))
            ->line('---')
            ->line('Si el contrato fue renovado o existe un error, por favor comuníquese con el área de contratación para gestionar la reactivación.')
            ->action('Ir a Gestión de Contratos', $appUrl)
            ->line('Este es un aviso automático del sistema.')
            ->salutation("Atentamente,\n\n**Kronox**");
    }
}
