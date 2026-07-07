<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sala extends Model
{
    protected $table = 'salas';

    protected $fillable = ['nombre', 'ubicacion', 'capacidad', 'activo'];

    protected $casts = [
        'activo'    => 'boolean',
        'capacidad' => 'integer',
    ];

    // Relaciones
    public function eventos()
    {
        return $this->hasMany(Evento::class);
    }
}