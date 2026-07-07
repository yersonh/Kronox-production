<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('obligaciones', function (Blueprint $table) {
            if (Schema::hasColumn('obligaciones', 'estado')) {
                $table->dropColumn('estado');
            }
        });
    }

    public function down(): void
    {
        Schema::table('obligaciones', function (Blueprint $table) {
            $table->string('estado', 20)->default('pendiente');
        });
    }
};
