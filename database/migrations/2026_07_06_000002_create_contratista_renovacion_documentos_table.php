<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contratista_renovacion_documentos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contratista_id')->constrained('contratistas')->cascadeOnDelete();
            $table->unsignedBigInteger('core_renovacion_id')->nullable();
            $table->enum('tipo', ['minuta', 'acta_inicio']);
            $table->string('ruta');
            $table->string('nombre_original')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contratista_renovacion_documentos');
    }
};
