<?php

namespace App\Notifications;

use App\Models\Contratista;
use Carbon\Carbon;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class ContratoRenovadoNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /** @param array $renovacion Datos de la renovación devueltos por el Core. */
    public function __construct(
        public Contratista $contratista,
        public array $renovacion,
    ) {}

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $c = $this->contratista;
        $r = $this->renovacion;
        $core = $c->coreData();
        $nombre = trim(($core['nombres'] ?? '') . ' ' . ($core['apellidos'] ?? ''));
        $tipo = match ($r['tipo'] ?? null) {
            'prorroga' => 'Prórroga',
            'adicion' => 'Adición de valor',
            'nuevo_contrato' => 'Nuevo contrato',
            default => 'Actualización',
        };
        $nuevaFin = !empty($r['fecha_fin_nueva']) ? Carbon::parse($r['fecha_fin_nueva'])->format('d/m/Y') : '—';
        $appUrl = config('app.url') . '/auxiliar-informe';

        return (new MailMessage)
            ->subject("Contrato renovado — {$nombre}")
            ->greeting("Hola {$notifiable->name},")
            ->line("Su contrato ha sido actualizado mediante una **{$tipo}**.")
            ->line('---')
            ->line("• **Contrato N°:** " . ($r['numero_nuevo'] ?? $c->numero_contrato ?? '—'))
            ->line("• **Nueva fecha de vencimiento:** {$nuevaFin}")
            ->line("• **Motivo:** " . ($r['motivo'] ?? '—'))
            ->line('---')
            ->line('Su acceso al sistema ha sido reactivado si estaba desactivado.')
            ->action('Ver mi contrato', $appUrl)
            ->line('Este es un aviso automático del sistema.')
            ->salutation("Atentamente,\n\n**Kronox**");
    }
}
