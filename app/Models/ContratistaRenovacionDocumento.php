<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContratistaRenovacionDocumento extends Model
{
    protected $table = 'contratista_renovacion_documentos';

    protected $fillable = [
        'contratista_id', 'core_renovacion_id', 'tipo', 'ruta', 'nombre_original',
    ];

    public function contratista()
    {
        return $this->belongsTo(Contratista::class);
    }
}
