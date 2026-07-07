<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReporteDiario extends Model
{
    protected $table = 'reportes_diarios';

    protected $fillable = [
        'contratista_id', 'dependencia_id', 'descripcion', 'fecha', 'lugar',
    ];

    protected $casts = [
        'fecha' => 'date',
    ];

    public function contratista()
    {
        return $this->belongsTo(Contratista::class);
    }
}
