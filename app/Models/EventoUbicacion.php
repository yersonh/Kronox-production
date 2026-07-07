<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EventoUbicacion extends Model
{
    protected $table = 'evento_ubicaciones';

    protected $fillable = [
        'evento_id', 'latitude', 'longitude', 'direccion', 'user_id', 'tipo'
    ];

    protected $casts = [
        'latitude'  => 'decimal:8',
        'longitude' => 'decimal:8',
    ];

    public function evento()
    {
        return $this->belongsTo(Evento::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
