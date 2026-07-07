<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Transiciona estados: programado→en_curso y finalizado→cerrado (48h después)
Schedule::command('eventos:check-estado')->everyMinute();

// Envía recordatorios por correo a invitados con eventos en 48h, 24h y 1h
Schedule::command('eventos:notificar-proximos')->everyFifteenMinutes();

// Marca como 'vencida' los compromisos de eventos cuya fecha_limite ya pasó
Schedule::command('compromisos:check-estado')->daily();

// Verifica vencimientos de contratos, actualiza estados y envía alertas
Schedule::command('contratistas:verificar-estado')->dailyAt('07:00');

Artisan::command('perfil:recordar-documentos', function () {
    $users = \App\Models\User::whereIn('rol', ['contratista', 'funcionario'])
        ->where('activo', true)
        ->pluck('id');

    foreach ($users as $userId) {
        \App\Jobs\VerificarDocumentosPendientesJob::dispatch($userId);
    }

    $this->info("Jobs despachados para {$users->count()} usuarios.");
})->purpose('Envía recordatorio de documentos pendientes a contratistas y funcionarios existentes');
