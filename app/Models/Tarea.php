<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Tarea extends Model
{
    protected $table = 'tareas';

    protected $fillable = [
        'numero', 'fecha_hora', 'descripcion', 'asunto', 'observaciones',
        'link_adjunto', 'persona_id', 'prioridad_id', 'dependencia_id',
        'sector_id', 'user_id', 'cerrado_por', 'fecha_vencimiento',
        'estado', 'cerrado_at', 'conclusiones', 'soporte_cumplimiento', 'soporte_analisis'
    ];

    protected $casts = [
        'fecha_hora'        => 'datetime:Y-m-d\TH:i:s',
        'fecha_vencimiento' => 'date',
        'cerrado_at'        => 'datetime:Y-m-d\TH:i:s',
        'soporte_analisis'  => 'array',
    ];

    // Relaciones
    public function prioridad()
    {
        return $this->belongsTo(Prioridad::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function cerradoPor()
    {
        return $this->belongsTo(User::class, 'cerrado_por');
    }

    public function fotos()
    {
        return $this->hasMany(TareaFoto::class, 'tarea_id');
    }
}