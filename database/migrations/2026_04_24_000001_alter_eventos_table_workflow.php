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
            // En PostgreSQL el enum crea un check constraint — hay que dropearlo antes de cambiar el tipo
            DB::statement("ALTER TABLE eventos DROP CONSTRAINT IF EXISTS eventos_estado_check");
            DB::statement("ALTER TABLE eventos ALTER COLUMN estado TYPE varchar(50) USING estado::varchar");
            DB::statement("ALTER TABLE eventos ALTER COLUMN estado SET DEFAULT 'programado'");
        } else {
            Schema::table('eventos', function (Blueprint $table) {
                $table->string('estado', 50)->default('programado')->change();
            });
        }

        // Migrar datos históricos al nuevo vocabulario
        DB::table('eventos')->where('estado', 'pendiente')->update(['estado' => 'programado']);
        DB::table('eventos')->where('estado', 'realizado')->update(['estado' => 'finalizado']);

        // Agregar columnas nuevas
        Schema::table('eventos', function (Blueprint $table) {
            $table->unsignedBigInteger('responsable_id')->nullable()->after('responsable');
            $table->timestamp('finalizado_en')->nullable()->after('estado');
        });
    }

    public function down(): void
    {
        Schema::table('eventos', function (Blueprint $table) {
            $table->dropColumn(['responsable_id', 'finalizado_en']);
        });

        DB::table('eventos')->where('estado', 'programado')->update(['estado' => 'pendiente']);
        DB::table('eventos')->where('estado', 'finalizado')->update(['estado' => 'realizado']);
        DB::table('eventos')->whereIn('estado', ['en_curso', 'cerrado'])->update(['estado' => 'pendiente']);

        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE eventos ALTER COLUMN estado TYPE varchar(50)");
        }
    }
};
