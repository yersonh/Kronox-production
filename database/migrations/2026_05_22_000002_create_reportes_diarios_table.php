<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reportes_diarios', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contratista_id')->constrained('contratistas')->cascadeOnDelete();
            $table->unsignedBigInteger('dependencia_id');
            $table->text('descripcion');
            $table->date('fecha');
            $table->string('lugar', 255);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reportes_diarios');
    }
};
