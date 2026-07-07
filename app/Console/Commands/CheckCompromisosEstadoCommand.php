<?php

namespace App\Console\Commands;

use App\Models\Tarea;
use App\Models\TareaCompromiso;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class CheckCompromisosEstadoCommand extends Command
{
    protected $signature   = 'compromisos:check-estado';
    protected $description = 'Transiciona tareas y compromisos vencidos cuando su fecha límite ya pasó';

    public function handle(): void
    {
        $hoy = Carbon::today()->toDateString();

        $tareasVencidas = Tarea::where('estado', 'pendiente')
            ->whereNotNull('fecha_vencimiento')
            ->where('fecha_vencimiento', '<', $hoy)
            ->update(['estado' => 'vencido']);

        $compromisosVencidos = TareaCompromiso::where('estado', 'pendiente')
            ->whereNotNull('fecha_limite')
            ->where('fecha_limite', '<', $hoy)
            ->update(['estado' => 'vencida']);

        $this->info("Tareas vencidas: {$tareasVencidas} — Compromisos vencidos: {$compromisosVencidos}");
    }
}
