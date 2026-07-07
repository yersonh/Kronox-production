<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Crear tabla evento_dependencias (relación uno a muchos)
        Schema::create('evento_dependencias', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('evento_id');
            $table->unsignedBigInteger('dependencia_id');
            $table->timestamps();

            $table->foreign('evento_id')->references('id')->on('eventos')->onDelete('cascade');

            $table->unique(['evento_id', 'dependencia_id']);
        });

        // 2. Crear tabla evento_sectores (relación uno a muchos)
        Schema::create('evento_sectores', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('evento_id');
            $table->unsignedBigInteger('sector_id');
            $table->timestamps();

            $table->foreign('evento_id')->references('id')->on('eventos')->onDelete('cascade');

            $table->unique(['evento_id', 'sector_id']);
        });

        // 3. Migrar datos existentes: dependencia_id → evento_dependencias
        DB::table('eventos')
            ->whereNotNull('dependencia_id')
            ->orderBy('id')
            ->each(function ($evento) {
                DB::table('evento_dependencias')->insert([
                    'evento_id'      => $evento->id,
                    'dependencia_id' => $evento->dependencia_id,
                    'created_at'     => now(),
                    'updated_at'     => now(),
                ]);
            });

        // 4. Migrar datos existentes: sector_id → evento_sectores
        DB::table('eventos')
            ->whereNotNull('sector_id')
            ->orderBy('id')
            ->each(function ($evento) {
                DB::table('evento_sectores')->insert([
                    'evento_id'  => $evento->id,
                    'sector_id'  => $evento->sector_id,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            });

        // 5. Eliminar FK y columnas antiguas de eventos
        Schema::table('eventos', function (Blueprint $table) {
            $table->dropColumn(['dependencia_id', 'sector_id']);
        });
    }

    public function down(): void
    {
        // Restaurar columnas antiguas
        Schema::table('eventos', function (Blueprint $table) {
            $table->unsignedBigInteger('dependencia_id')->nullable()->after('area');
            $table->unsignedBigInteger('sector_id')->nullable()->after('dependencia_id');
        });

        // Restaurar un registro de dependencia y sector por evento (el primero encontrado)
        DB::table('evento_dependencias')
            ->select('evento_id', DB::raw('MIN(dependencia_id) as dependencia_id'))
            ->groupBy('evento_id')
            ->orderBy('evento_id')
            ->each(function ($row) {
                DB::table('eventos')
                    ->where('id', $row->evento_id)
                    ->update(['dependencia_id' => $row->dependencia_id]);
            });

        DB::table('evento_sectores')
            ->select('evento_id', DB::raw('MIN(sector_id) as sector_id'))
            ->groupBy('evento_id')
            ->orderBy('evento_id')
            ->each(function ($row) {
                DB::table('eventos')
                    ->where('id', $row->evento_id)
                    ->update(['sector_id' => $row->sector_id]);
            });

        Schema::dropIfExists('evento_sectores');
        Schema::dropIfExists('evento_dependencias');
    }
};
