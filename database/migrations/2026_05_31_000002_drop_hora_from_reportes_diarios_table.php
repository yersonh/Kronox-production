<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reportes_diarios', function (Blueprint $table) {
            $table->dropColumn('hora');
        });
    }

    public function down(): void
    {
        Schema::table('reportes_diarios', function (Blueprint $table) {
            $table->time('hora')->nullable()->after('fecha');
        });
    }
};
