<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Compromisos marcados como cumplido sin fecha de cumplimiento — backfill con updated_at
        DB::table('tarea_compromisos')
            ->where('estado', 'cumplido')
            ->whereNull('cumplido_at')
            ->update(['cumplido_at' => DB::raw('updated_at')]);

        // Tareas marcadas como realizado sin fecha de cierre — backfill con updated_at
        DB::table('tareas')
            ->where('estado', 'realizado')
            ->whereNull('cerrado_at')
            ->update(['cerrado_at' => DB::raw('updated_at')]);
    }

    public function down(): void
    {
        // No revertible: no sabemos cuáles eran null antes
    }
};
