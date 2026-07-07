<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tarea_compromisos', function (Blueprint $table) {
            $table->timestamp('cumplido_at')->nullable()->after('estado');
        });
    }

    public function down(): void
    {
        Schema::table('tarea_compromisos', function (Blueprint $table) {
            $table->dropColumn('cumplido_at');
        });
    }
};
