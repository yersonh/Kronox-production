<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contratista_planillas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contratista_id')->constrained('contratistas')->cascadeOnDelete();
            $table->string('periodo', 7); // YYYY-MM
            $table->string('ruta');
            $table->string('nombre_original');
            $table->foreignId('subido_por')->constrained('users');
            $table->timestamps();

            $table->unique(['contratista_id', 'periodo']); // una planilla por período
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contratista_planillas');
    }
};
