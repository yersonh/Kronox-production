<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE tareas DROP CONSTRAINT IF EXISTS tareas_estado_check');
            DB::statement("ALTER TABLE tareas ALTER COLUMN estado TYPE varchar(50) USING estado::varchar");
            DB::statement("ALTER TABLE tareas ALTER COLUMN estado SET DEFAULT 'pendiente'");
        } else {
            Schema::table('tareas', function (Blueprint $table) {
                $table->string('estado', 50)->default('pendiente')->change();
            });
        }
    }

    public function down(): void
    {
        DB::table('tareas')->where('estado', 'vencido')->update(['estado' => 'pendiente']);

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE tareas DROP CONSTRAINT IF EXISTS tareas_estado_check');
            DB::statement("ALTER TABLE tareas ADD CONSTRAINT tareas_estado_check CHECK (estado IN ('pendiente','realizado','cancelado'))");
        } else {
            Schema::table('tareas', function (Blueprint $table) {
                $table->enum('estado', ['pendiente', 'realizado', 'cancelado'])->default('pendiente')->change();
            });
        }
    }
};
