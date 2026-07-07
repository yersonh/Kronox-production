<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EventoFoto extends Model
{
    protected $table = 'evento_fotos';

    protected $fillable = ['evento_id', 'ruta', 'nombre_original'];

    public function evento()
    {
        return $this->belongsTo(Evento::class);
    }
}
