<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Prioridad extends Model
{
    protected $table = 'prioridades';

    protected $primaryKey = 'id';

    protected $fillable = ['nombre', 'dias_vencimiento', 'color', 'activo'];

    protected $casts = [
        'activo'           => 'boolean',
        'dias_vencimiento' => 'integer',
    ];

    public function getRouteKeyName()
    {
        return 'id';
    }

    public function tareas()
    {
        return $this->hasMany(Tarea::class);
    }
}
