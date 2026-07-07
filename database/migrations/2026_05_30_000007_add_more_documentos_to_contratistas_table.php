<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contratistas', function (Blueprint $table) {
            $table->string('ruta_arl')->nullable()->after('nombre_seguridad_social');
            $table->string('nombre_arl')->nullable()->after('ruta_arl');
            $table->string('ruta_acta_inicio')->nullable()->after('nombre_arl');
            $table->string('nombre_acta_inicio')->nullable()->after('ruta_acta_inicio');
            $table->string('ruta_certificacion_bancaria')->nullable()->after('nombre_acta_inicio');
            $table->string('nombre_certificacion_bancaria')->nullable()->after('ruta_certificacion_bancaria');
            $table->string('ruta_registro_presupuestal')->nullable()->after('nombre_certificacion_bancaria');
            $table->string('nombre_registro_presupuestal')->nullable()->after('ruta_registro_presupuestal');
            $table->string('ruta_resolucion_supervisor')->nullable()->after('nombre_registro_presupuestal');
            $table->string('nombre_resolucion_supervisor')->nullable()->after('ruta_resolucion_supervisor');
        });
    }

    public function down(): void
    {
        Schema::table('contratistas', function (Blueprint $table) {
            $table->dropColumn([
                'ruta_arl', 'nombre_arl',
                'ruta_acta_inicio', 'nombre_acta_inicio',
                'ruta_certificacion_bancaria', 'nombre_certificacion_bancaria',
                'ruta_registro_presupuestal', 'nombre_registro_presupuestal',
                'ruta_resolucion_supervisor', 'nombre_resolucion_supervisor',
            ]);
        });
    }
};
