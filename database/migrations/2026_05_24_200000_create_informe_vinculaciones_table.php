<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('informe_vinculaciones', function (Blueprint $table) {
            $table->id();
            $table->foreignId('contratista_id')->constrained('contratistas')->cascadeOnDelete();
            $table->foreignId('obligacion_id')->constrained('obligaciones')->cascadeOnDelete();
            $table->string('item_type'); // evento | tarea | compromiso
            $table->unsignedBigInteger('item_id');
            $table->timestamps();

            $table->unique(['contratista_id', 'item_type', 'item_id'], 'informe_vinc_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('informe_vinculaciones');
    }
};
