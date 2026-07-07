<?php

namespace App\Notifications;

use App\Models\Contratista;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class ContratoVencimientoNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Contratista $contratista,
        public int $diasRestantes
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
        $fecha  = $c->fecha_fin->format('d/m/Y');
        $dias   = $this->diasRestantes;
        $appUrl = config('app.url') . '/gestion-contratos';
        $dependencia = $c->dependencia_id ? app(\App\Services\CoreApiClient::class)->obtenerDependencias()->get($c->dependencia_id) : null;

        return (new MailMessage)
            ->subject("Contrato por vencer en {$dias} días — {$nombre}")
            ->greeting('¡Atención!')
            ->line("El contrato del contratista **{$nombre}** vence en **{$dias} días**.")
            ->line('---')
            ->line("• **Contrato N°:** " . ($c->numero_contrato ?? 'Sin número'))
            ->line("• **Fecha de vencimiento:** {$fecha}")
            ->line("• **Dependencia:** " . ($dependencia['nombre'] ?? '—'))
            ->line('---')
            ->line('Por favor gestione la renovación o prórroga antes del vencimiento para evitar la suspensión automática del acceso al sistema.')
            ->action('Ir a Gestión de Contratos', $appUrl)
            ->line('Este es un aviso automático del sistema.')
            ->salutation("Atentamente,\n\n**Kronox**");
    }
}
