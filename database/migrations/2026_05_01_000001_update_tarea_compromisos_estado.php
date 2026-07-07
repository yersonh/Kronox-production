<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Amplía el enum de tarea_compromisos para incluir 'cumplido' y 'vencida'
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE tarea_compromisos DROP CONSTRAINT IF EXISTS tarea_compromisos_estado_check');
            DB::statement("ALTER TABLE tarea_compromisos ALTER COLUMN estado TYPE varchar(50) USING estado::varchar");
            DB::statement("ALTER TABLE tarea_compromisos ALTER COLUMN estado SET DEFAULT 'pendiente'");
        } else {
            Schema::table('tarea_compromisos', function (Blueprint $table) {
                $table->string('estado', 50)->default('pendiente')->change();
            });
        }
    }

    public function down(): void
    {
        // Revierta los registros 'vencida'/'cumplido' antes de restringir el enum
        DB::table('tarea_compromisos')->where('estado', 'vencida')->update(['estado' => 'pendiente']);
        DB::table('tarea_compromisos')->where('estado', 'cumplido')->update(['estado' => 'realizado']);

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE tarea_compromisos DROP CONSTRAINT IF EXISTS tarea_compromisos_estado_check');
            DB::statement("ALTER TABLE tarea_compromisos ALTER COLUMN estado TYPE varchar(50) USING estado::varchar");
            DB::statement("ALTER TABLE tarea_compromisos ADD CONSTRAINT tarea_compromisos_estado_check CHECK (estado IN ('pendiente','realizado','cancelado'))");
        } else {
            Schema::table('tarea_compromisos', function (Blueprint $table) {
                $table->enum('estado', ['pendiente', 'realizado', 'cancelado'])->default('pendiente')->change();
            });
        }
    }
};
