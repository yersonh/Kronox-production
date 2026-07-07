<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ContratistaPlanilla extends Model
{
    protected $table = 'contratista_planillas';

    protected $fillable = [
        'contratista_id', 'periodo', 'ruta', 'nombre_original', 'subido_por',
        'planilla_numero', 'fondo_pension', 'arl', 'eps', 'ibc',
        'valor_pension', 'valor_salud', 'valor_arl', 'valor_total', 'fecha_pago',
    ];

    public function contratista()
    {
        return $this->belongsTo(Contratista::class);
    }

    public function subidoPor()
    {
        return $this->belongsTo(User::class, 'subido_por');
    }
}
