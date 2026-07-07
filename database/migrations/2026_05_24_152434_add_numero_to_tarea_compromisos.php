<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tarea_compromisos', function (Blueprint $table) {
            $table->string('numero', 20)->nullable()->unique()->after('id');
        });

        // Backfill: asignar C-0001, C-0002... ordenados por id
        $compromisos = DB::table('tarea_compromisos')->orderBy('id')->get();
        foreach ($compromisos as $c) {
            DB::table('tarea_compromisos')
                ->where('id', $c->id)
                ->update(['numero' => 'C-' . str_pad($c->id, 4, '0', STR_PAD_LEFT)]);
        }
    }

    public function down(): void
    {
        Schema::table('tarea_compromisos', function (Blueprint $table) {
            $table->dropUnique(['numero']);
            $table->dropColumn('numero');
        });
    }
};
