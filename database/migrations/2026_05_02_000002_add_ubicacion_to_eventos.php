<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('eventos', function (Blueprint $table) {
            $table->decimal('latitude', 10, 8)->nullable()->after('sitio');
            $table->decimal('longitude', 11, 8)->nullable()->after('latitude');
            $table->string('direccion', 500)->nullable()->after('longitude');
        });
    }

    public function down(): void
    {
        Schema::table('eventos', function (Blueprint $table) {
            $table->dropColumn(['latitude', 'longitude', 'direccion']);
        });
    }
};
