<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EntidadConfig extends Model
{
    protected $table = 'entidad_config';

    protected $fillable = [
        'nombre', 'nit', 'direccion', 'eslogan', 'telefono', 'email',
        'latitude', 'longitude', 'ubicacion_descripcion',
        'logo_ruta', 'logo_nombre_original',
    ];

    protected $casts = [
        'latitude'  => 'decimal:8',
        'longitude' => 'decimal:8',
    ];
}
