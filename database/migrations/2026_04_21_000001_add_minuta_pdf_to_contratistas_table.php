<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('contratistas', function (Blueprint $table) {
            $table->string('ruta_contrato_pdf')->nullable()->after('fecha_fin');
            $table->string('nombre_original_pdf')->nullable()->after('ruta_contrato_pdf');
            $table->unsignedBigInteger('tamano_pdf_bytes')->nullable()->after('nombre_original_pdf');
            $table->timestamp('fecha_carga_pdf')->nullable()->after('tamano_pdf_bytes');
        });
    }

    public function down(): void
    {
        Schema::table('contratistas', function (Blueprint $table) {
            $table->dropColumn(['ruta_contrato_pdf', 'nombre_original_pdf', 'tamano_pdf_bytes', 'fecha_carga_pdf']);
        });
    }
};
