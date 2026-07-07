<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('eventos', function (Blueprint $table) {
            $table->dropColumn('responsable');
        });

        // Hacer responsable_id NOT NULL
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE eventos ALTER COLUMN responsable_id SET NOT NULL');
        }
    }

    public function down(): void
    {
        Schema::table('eventos', function (Blueprint $table) {
            $table->string('responsable')->nullable()->after('area');
        });

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE eventos ALTER COLUMN responsable_id DROP NOT NULL');
        }
    }
};
