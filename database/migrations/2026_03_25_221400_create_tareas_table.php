<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tareas', function (Blueprint $table) {
            $table->id();
            $table->string('numero')->unique();
            $table->dateTime('fecha_hora');
            $table->text('descripcion');
            $table->string('asunto');
            $table->text('observaciones')->nullable();
            $table->string('link_adjunto')->nullable();
            $table->unsignedBigInteger('persona_id');
            $table->unsignedBigInteger('prioridad_id');
            $table->unsignedBigInteger('dependencia_id');
            $table->unsignedBigInteger('sector_id')->nullable();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('cerrado_por')->nullable();
            $table->date('fecha_vencimiento');
            $table->enum('estado', ['pendiente', 'realizado', 'cancelado'])->default('pendiente');
            $table->timestamp('cerrado_at')->nullable();
            $table->timestamps();

            $table->foreign('prioridad_id')->references('id')->on('prioridades')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('cerrado_por')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tareas');
    }
};