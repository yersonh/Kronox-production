<?php

namespace App\Notifications;

use App\Models\ReporteDiario;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\MailMessage;

class ReporteDiarioNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public ReporteDiario $reporte) {}

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $reporte  = $this->reporte->loadMissing('contratista');
        $lider    = $reporte->contratista->coreData();
        $fecha    = $reporte->fecha->format('d/m/Y');
        $appUrl   = config('app.url') . '/reportes-lider';

        return (new MailMessage)
            ->subject('Nuevo Reporte de Actividades - Kronox | Alcaldía de Monterrey')
            ->greeting('Estimado(a) ' . $notifiable->name . ',')
            ->line('Se ha registrado un nuevo reporte de actividades para su dependencia en el **Kronox** de la Alcaldía de Monterrey:')
            ->line('---')
            ->line('**Reporte de Actividades**')
            ->line('• **Fecha:** ' . $fecha)
            ->line('• **Lugar:** ' . $reporte->lugar)
            ->line('• **Registrado por:** ' . ($lider['nombres'] ?? '') . ' ' . ($lider['apellidos'] ?? '') . ' (Lider de dependencia)')
            ->line('• **Descripcion:**')
            ->line($reporte->descripcion)
            ->action('Ver reportes de actividades', $appUrl)
            ->line('---')
            ->line('**Informacion importante:**')
            ->line('• Este es un correo automatico, por favor no responda a esta direccion.')
            ->line('• Para mas informacion, comuniquese con el lider de su dependencia.')
            ->salutation("Atentamente,\n\n**Departamento de Sistemas**\nAlcaldia de Monterrey");
    }
}
