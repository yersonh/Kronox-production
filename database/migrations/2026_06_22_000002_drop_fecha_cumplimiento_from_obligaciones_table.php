<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('obligaciones', function (Blueprint $table) {
            if (Schema::hasColumn('obligaciones', 'fecha_cumplimiento')) {
                $table->dropColumn('fecha_cumplimiento');
            }
        });
    }

    public function down(): void
    {
        Schema::table('obligaciones', function (Blueprint $table) {
            $table->date('fecha_cumplimiento')->nullable();
        });
    }
};
