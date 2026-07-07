<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class TareaCompromiso extends Model
{
    protected $table = 'tarea_compromisos';

    protected $fillable = [
        'numero', 'evento_id', 'persona_id', 'descripcion',
        'fecha_limite', 'estado', 'cumplido_at', 'conclusiones', 'soporte_cumplimiento', 'soporte_analisis'
    ];

    protected $casts = [
        'fecha_limite'     => 'date',
        'cumplido_at'      => 'datetime',
        'soporte_analisis' => 'array',
    ];

    // Relaciones
    public function evento()
    {
        return $this->belongsTo(Evento::class);
    }

    public function fotos()
    {
        return $this->hasMany(TareaFoto::class, 'compromiso_id');
    }
}