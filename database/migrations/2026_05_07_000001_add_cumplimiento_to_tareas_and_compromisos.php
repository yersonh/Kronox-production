<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tareas', function (Blueprint $table) {
            $table->text('conclusiones')->nullable()->after('estado');
            $table->string('soporte_cumplimiento')->nullable()->after('conclusiones');
        });

        Schema::table('tarea_compromisos', function (Blueprint $table) {
            $table->text('conclusiones')->nullable()->after('estado');
            $table->string('soporte_cumplimiento')->nullable()->after('conclusiones');
        });
    }

    public function down(): void
    {
        Schema::table('tareas', function (Blueprint $table) {
            $table->dropColumn(['conclusiones', 'soporte_cumplimiento']);
        });

        Schema::table('tarea_compromisos', function (Blueprint $table) {
            $table->dropColumn(['conclusiones', 'soporte_cumplimiento']);
        });
    }
};
