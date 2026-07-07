<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evento_invitados', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('evento_id');
            $table->unsignedBigInteger('persona_id');
            $table->enum('confirmacion', ['pendiente', 'confirmado', 'rechazado'])->default('pendiente');
            $table->timestamp('confirmado_at')->nullable();
            $table->boolean('asistio')->nullable();
            $table->integer('notificaciones_enviadas')->default(0);
            $table->timestamps();

            $table->foreign('evento_id')->references('id')->on('eventos')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evento_invitados');
    }
};