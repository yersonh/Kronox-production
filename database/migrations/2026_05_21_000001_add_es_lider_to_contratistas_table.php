<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contratistas', function (Blueprint $table) {
            $table->boolean('es_lider')->default(false)->after('sector_id');
        });

        // Partial unique index: only one líder per dependencia (NULL dependencias are excluded)
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE UNIQUE INDEX idx_contratista_lider_dep ON contratistas (dependencia_id) WHERE es_lider = true AND dependencia_id IS NOT NULL');
        } else {
            DB::statement('CREATE UNIQUE INDEX idx_contratista_lider_dep ON contratistas (dependencia_id) WHERE es_lider = 1 AND dependencia_id IS NOT NULL');
        }
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS idx_contratista_lider_dep');

        Schema::table('contratistas', function (Blueprint $table) {
            $table->dropColumn('es_lider');
        });
    }
};
