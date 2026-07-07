<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contratistas', function (Blueprint $table) {
            $table->string('ruta_estudios_previos')->nullable()->after('fecha_carga_pdf');
            $table->string('nombre_estudios_previos')->nullable()->after('ruta_estudios_previos');
            $table->string('ruta_rut')->nullable()->after('nombre_estudios_previos');
            $table->string('nombre_rut')->nullable()->after('ruta_rut');
            $table->string('ruta_polizas')->nullable()->after('nombre_rut');
            $table->string('nombre_polizas')->nullable()->after('ruta_polizas');
            $table->string('ruta_antecedentes_procuraduria')->nullable()->after('nombre_polizas');
            $table->string('nombre_antecedentes_procuraduria')->nullable()->after('ruta_antecedentes_procuraduria');
            $table->string('ruta_antecedentes_contraloria')->nullable()->after('nombre_antecedentes_procuraduria');
            $table->string('nombre_antecedentes_contraloria')->nullable()->after('ruta_antecedentes_contraloria');
            $table->string('ruta_antecedentes_policia')->nullable()->after('nombre_antecedentes_contraloria');
            $table->string('nombre_antecedentes_policia')->nullable()->after('ruta_antecedentes_policia');
            $table->string('ruta_paz_salvo_parafiscales')->nullable()->after('nombre_antecedentes_policia');
            $table->string('nombre_paz_salvo_parafiscales')->nullable()->after('ruta_paz_salvo_parafiscales');
            $table->string('ruta_seguridad_social')->nullable()->after('nombre_paz_salvo_parafiscales');
            $table->string('nombre_seguridad_social')->nullable()->after('ruta_seguridad_social');
        });
    }

    public function down(): void
    {
        Schema::table('contratistas', function (Blueprint $table) {
            $table->dropColumn([
                'ruta_estudios_previos', 'nombre_estudios_previos',
                'ruta_rut', 'nombre_rut',
                'ruta_polizas', 'nombre_polizas',
                'ruta_antecedentes_procuraduria', 'nombre_antecedentes_procuraduria',
                'ruta_antecedentes_contraloria', 'nombre_antecedentes_contraloria',
                'ruta_antecedentes_policia', 'nombre_antecedentes_policia',
                'ruta_paz_salvo_parafiscales', 'nombre_paz_salvo_parafiscales',
                'ruta_seguridad_social', 'nombre_seguridad_social',
            ]);
        });
    }
};
