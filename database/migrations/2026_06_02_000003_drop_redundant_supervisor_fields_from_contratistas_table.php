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
                'supervisor_fecha_acta_inicio',
                'supervisor_fecha_terminacion',
                'supervisor_periodo_informe',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('contratistas', function (Blueprint $table) {
            $table->string('supervisor_fecha_acta_inicio')->nullable();
            $table->string('supervisor_fecha_terminacion')->nullable();
            $table->string('supervisor_periodo_informe')->nullable();
        });
    }
};
