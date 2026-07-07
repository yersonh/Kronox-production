<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contratistas', function (Blueprint $table) {
            $table->dropColumn([
                'ruta_antecedentes_procuraduria',
                'nombre_antecedentes_procuraduria',
                'ruta_antecedentes_contraloria',
                'nombre_antecedentes_contraloria',
                'ruta_antecedentes_policia',
                'nombre_antecedentes_policia',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('contratistas', function (Blueprint $table) {
            $table->string('ruta_antecedentes_procuraduria')->nullable();
            $table->string('nombre_antecedentes_procuraduria')->nullable();
            $table->string('ruta_antecedentes_contraloria')->nullable();
            $table->string('nombre_antecedentes_contraloria')->nullable();
            $table->string('ruta_antecedentes_policia')->nullable();
            $table->string('nombre_antecedentes_policia')->nullable();
        });
    }
};
