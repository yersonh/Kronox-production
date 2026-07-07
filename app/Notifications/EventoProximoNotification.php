<?php

namespace App\Notifications;

use App\Models\Evento;
use App\Services\CoreApiClient;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class EventoProximoNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public Evento $evento,
        public int $horasRestantes
    ) {}

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $evento  = $this->evento->loadMissing(['sala', 'tipoEvento']);
        $persona = $evento->responsable_id ? app(CoreApiClient::class)->obtenerPersona($evento->responsable_id) : null;
        $fecha   = $evento->fecha_hora->format('d/m/Y');
        $hora    = $evento->fecha_hora->format('H:i');
        $horaFin = $evento->fecha_hora_fin?->format('H:i');
        $appUrl  = config('app.url') . '/mis-eventos';

        $tiempoTexto = match (true) {
            $this->horasRestantes <= 1  => 'en menos de 1 hora',
            $this->horasRestantes <= 24 => 'en ' . $this->horasRestantes . ' horas',
            default                     => 'mañana',
        };

        $mensaje = (new MailMessage)
            ->subject('Recordatorio: "' . $evento->tema . '" ' . $tiempoTexto)
            ->greeting('¡Hola ' . $notifiable->name . '!')
            ->line("Tienes un evento programado **{$tiempoTexto}:**")
            ->line('---')
            ->line('**' . $evento->tema . '**');

        if ($evento->tipoEvento?->nombre) {
            $mensaje->line('• **Tipo:** ' . $evento->tipoEvento->nombre);
        }

        $duracion = $hora . ($horaFin ? ' — ' . $horaFin : '');
        $mensaje->line('• **Fecha:** ' . $fecha . ' · ' . $duracion)
                ->line('• **Responsable:** ' . ($persona['nombres'] ?? '') . ' ' . ($persona['apellidos'] ?? ''));

        if ($evento->sala?->nombre) {
            $mensaje->line('• **Sala:** ' . $evento->sala->nombre);
        } elseif ($evento->sitio) {
            $mensaje->line('• **Lugar:** ' . $evento->sitio);
        }

        if ($evento->enlace_meet) {
            $mensaje->line('• **Enlace Meet:** ' . $evento->enlace_meet);
        }

        if ($evento->observaciones) {
            $mensaje->line('• **Observaciones:** ' . $evento->observaciones);
        }

        return $mensaje
            ->action('Ver mis eventos', $appUrl)
            ->line('---')
            ->line('Este es un recordatorio automático. No respondas a este correo.');
    }
}
