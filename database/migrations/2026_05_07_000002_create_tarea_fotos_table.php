<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tarea_fotos', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tarea_id')->nullable();
            $table->unsignedBigInteger('compromiso_id')->nullable();
            $table->string('ruta');
            $table->string('nombre_original')->nullable();
            $table->timestamps();

            $table->foreign('tarea_id')->references('id')->on('tareas')->cascadeOnDelete();
            $table->foreign('compromiso_id')->references('id')->on('tarea_compromisos')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tarea_fotos');
    }
};
