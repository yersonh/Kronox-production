<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contratistas', function (Blueprint $table) {
            $table->string('estado_contrato')->default('vigente')->after('es_lider');
            $table->boolean('notificado_30d')->default(false)->after('estado_contrato');
            $table->boolean('notificado_15d')->default(false)->after('notificado_30d');
            $table->boolean('notificado_7d')->default(false)->after('notificado_15d');
            $table->text('motivo_suspension')->nullable()->after('notificado_7d');
        });

        // Corregir estados según fechas existentes en la BD
        DB::statement("UPDATE contratistas SET estado_contrato = 'vencido' WHERE fecha_fin < DATE('now') AND fecha_fin IS NOT NULL");
    }

    public function down(): void
    {
        Schema::table('contratistas', function (Blueprint $table) {
            $table->dropColumn(['estado_contrato', 'notificado_30d', 'notificado_15d', 'notificado_7d', 'motivo_suspension']);
        });
    }
};
