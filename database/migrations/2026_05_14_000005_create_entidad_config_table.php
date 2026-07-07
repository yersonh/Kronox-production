<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entidad_config', function (Blueprint $table) {
            $table->id();
            $table->string('nombre')->default('');
            $table->string('nit', 30)->nullable();
            $table->string('direccion')->nullable();
            $table->string('eslogan')->nullable();
            $table->string('telefono', 30)->nullable();
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->string('ubicacion_descripcion')->nullable();
            $table->string('logo_ruta')->nullable();
            $table->string('logo_nombre_original')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entidad_config');
    }
};
