<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contratista_planillas', function (Blueprint $table) {
            $table->string('planilla_numero')->nullable()->after('nombre_original');
            $table->string('fondo_pension')->nullable()->after('planilla_numero');
            $table->string('arl')->nullable()->after('fondo_pension');
            $table->string('eps')->nullable()->after('arl');
            $table->string('ibc')->nullable()->after('eps');
            $table->string('valor_pension')->nullable()->after('ibc');
            $table->string('valor_salud')->nullable()->after('valor_pension');
            $table->string('valor_arl')->nullable()->after('valor_salud');
            $table->string('valor_total')->nullable()->after('valor_arl');
            $table->string('fecha_pago')->nullable()->after('valor_total');
        });
    }

    public function down(): void
    {
        Schema::table('contratista_planillas', function (Blueprint $table) {
            $table->dropColumn([
                'planilla_numero', 'fondo_pension', 'arl', 'eps', 'ibc',
                'valor_pension', 'valor_salud', 'valor_arl', 'valor_total', 'fecha_pago',
            ]);
        });
    }
};
