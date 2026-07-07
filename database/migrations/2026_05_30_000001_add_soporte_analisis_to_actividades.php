<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('eventos', function (Blueprint $table) {
            $table->json('soporte_analisis')->nullable()->after('documento_soporte');
        });

        Schema::table('tareas', function (Blueprint $table) {
            $table->json('soporte_analisis')->nullable()->after('soporte_cumplimiento');
        });

        Schema::table('tarea_compromisos', function (Blueprint $table) {
            $table->json('soporte_analisis')->nullable()->after('soporte_cumplimiento');
        });
    }

    public function down(): void
    {
        Schema::table('eventos',          fn (Blueprint $t) => $t->dropColumn('soporte_analisis'));
        Schema::table('tareas',           fn (Blueprint $t) => $t->dropColumn('soporte_analisis'));
        Schema::table('tarea_compromisos',fn (Blueprint $t) => $t->dropColumn('soporte_analisis'));
    }
};
