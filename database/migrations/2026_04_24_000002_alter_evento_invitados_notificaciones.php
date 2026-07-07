<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('evento_invitados', function (Blueprint $table) {
            $table->boolean('notificado_48h')->default(false)->after('notificaciones_enviadas');
            $table->boolean('notificado_24h')->default(false)->after('notificado_48h');
            $table->boolean('notificado_1h')->default(false)->after('notificado_24h');
        });
    }

    public function down(): void
    {
        Schema::table('evento_invitados', function (Blueprint $table) {
            $table->dropColumn(['notificado_48h', 'notificado_24h', 'notificado_1h']);
        });
    }
};
