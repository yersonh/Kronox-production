<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('eventos', function (Blueprint $table) {
            $table->id();
            $table->string('numero')->unique();
            $table->unsignedBigInteger('tipo_evento_id')->nullable();
            $table->dateTime('fecha_hora');
            $table->dateTime('fecha_hora_fin')->nullable();
            $table->unsignedBigInteger('sala_id')->nullable();
            $table->string('sitio')->nullable();
            $table->string('tema');
            $table->string('entidad')->nullable();
            $table->string('area')->nullable();
            $table->string('responsable');
            $table->unsignedBigInteger('dependencia_id');
            $table->unsignedBigInteger('sector_id')->nullable();
            $table->text('observaciones')->nullable();
            $table->text('conclusiones')->nullable();
            $table->string('enlace_meet')->nullable();
            $table->string('documento_soporte')->nullable();
            $table->string('acta_reunion')->nullable();
            $table->boolean('es_publica')->default(false);
            $table->enum('estado', ['pendiente', 'realizado', 'cancelado','aplazado'])->default('pendiente');
            $table->unsignedBigInteger('user_id');
            $table->timestamps();

            $table->foreign('tipo_evento_id')->references('id')->on('tipos_evento')->onDelete('set null');
            $table->foreign('sala_id')->references('id')->on('salas')->onDelete('set null');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('eventos');
    }
};