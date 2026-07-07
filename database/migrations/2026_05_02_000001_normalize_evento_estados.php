<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Fix feminine estado variants left by old data before the workflow migration
        $map = [
            'programada'  => 'programado',
            'aplazada'    => 'aplazado',
            'cancelada'   => 'cancelado',
            'finalizada'  => 'finalizado',
        ];

        foreach ($map as $wrong => $correct) {
            DB::table('eventos')->where('estado', $wrong)->update(['estado' => $correct]);
        }
    }

    public function down(): void {}
};
