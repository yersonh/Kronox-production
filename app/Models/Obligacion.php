<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Obligacion extends Model
{
    protected $table = 'obligaciones';

    protected $fillable = [
        'contratista_id', 'descripcion', 'observaciones',
    ];

    public function contratista()
    {
        return $this->belongsTo(Contratista::class);
    }
}
