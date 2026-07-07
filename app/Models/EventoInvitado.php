<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EventoInvitado extends Model
{
    protected $table = 'evento_invitados';

    protected $fillable = [
        'evento_id', 'persona_id', 'confirmacion',
        'confirmado_at', 'asistio', 'notificaciones_enviadas', 'motivo_rechazo'
    ];

    protected $casts = [
        'confirmado_at'          => 'datetime',
        'asistio'                => 'boolean',
        'notificaciones_enviadas' => 'integer',
    ];

    // Relaciones
    public function evento()
    {
        return $this->belongsTo(Evento::class);
    }
}