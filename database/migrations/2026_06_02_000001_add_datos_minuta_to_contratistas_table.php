<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contratistas', function (Blueprint $table) {
            $table->string('valor_contrato')->nullable()->after('fecha_fin');
            $table->string('duracion_contrato')->nullable()->after('valor_contrato');
            $table->string('fecha_suscripcion')->nullable()->after('duracion_contrato');
        });
    }

    public function down(): void
    {
        Schema::table('contratistas', function (Blueprint $table) {
            $table->dropColumn(['valor_contrato', 'duracion_contrato', 'fecha_suscripcion']);
        });
    }
};
