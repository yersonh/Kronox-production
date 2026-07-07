<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contratistas', function (Blueprint $table) {
            $table->string('supervisor_nombre')->nullable()->after('fecha_suscripcion');
            $table->string('supervisor_cedula')->nullable()->after('supervisor_nombre');
            $table->string('supervisor_fecha_acta_inicio')->nullable()->after('supervisor_cedula');
            $table->string('supervisor_fecha_terminacion')->nullable()->after('supervisor_fecha_acta_inicio');
            $table->string('supervisor_fecha_adicion_prorroga')->nullable()->after('supervisor_fecha_terminacion');
            $table->string('supervisor_valor_adicion_prorroga')->nullable()->after('supervisor_fecha_adicion_prorroga');
            $table->string('supervisor_periodo_informe')->nullable()->after('supervisor_valor_adicion_prorroga');
            $table->string('supervisor_ciudad_fecha_presentacion')->nullable()->after('supervisor_periodo_informe');
        });
    }

    public function down(): void
    {
        Schema::table('contratistas', function (Blueprint $table) {
            $table->dropColumn([
                'supervisor_nombre', 'supervisor_cedula',
                'supervisor_fecha_acta_inicio', 'supervisor_fecha_terminacion',
                'supervisor_fecha_adicion_prorroga', 'supervisor_valor_adicion_prorroga',
                'supervisor_periodo_informe', 'supervisor_ciudad_fecha_presentacion',
            ]);
        });
    }
};
