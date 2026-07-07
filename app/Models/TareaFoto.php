<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TareaFoto extends Model
{
    protected $table = 'tarea_fotos';

    protected $fillable = ['tarea_id', 'compromiso_id', 'ruta', 'nombre_original'];

    public function tarea()
    {
        return $this->belongsTo(Tarea::class);
    }

    public function compromiso()
    {
        return $this->belongsTo(TareaCompromiso::class);
    }
}
