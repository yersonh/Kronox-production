<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('eventos', function (Blueprint $table) {
            // Flag para no enviar la notificación de "finaliza tu evento" más de una vez
            $table->boolean('notificado_pendiente_finalizar')->default(false)->after('finalizado_en');
        });
    }

    public function down(): void
    {
        Schema::table('eventos', function (Blueprint $table) {
            $table->dropColumn('notificado_pendiente_finalizar');
        });
    }
};
