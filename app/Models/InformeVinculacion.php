<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InformeVinculacion extends Model
{
    protected $table = 'informe_vinculaciones';

    protected $fillable = ['contratista_id', 'obligacion_id', 'item_type', 'item_id'];

    public function contratista()
    {
        return $this->belongsTo(Contratista::class);
    }

    public function obligacion()
    {
        return $this->belongsTo(Obligacion::class);
    }
}
