<?php

namespace App\Models;

use App\Services\CoreApiClient;
use Illuminate\Database\Eloquent\Model;

class Funcionario extends Model
{
    protected $table = 'funcionarios';

    private ?array $coreDataCache = null;

    protected $fillable = [
        'persona_id', 'core_funcionario_id', 'cargo', 'nivel_cargo_id', 'dependencia_id', 'sector_id', 'fecha_vinculacion',
        'ruta_contrato_pdf', 'nombre_original_pdf', 'tamano_pdf_bytes', 'fecha_carga_pdf',
    ];

    protected $casts = [
        'fecha_vinculacion' => 'date',
        'fecha_carga_pdf'   => 'datetime',
    ];

    protected $appends = ['tiene_minuta'];

    public function getTieneMinutaAttribute(): bool
    {
        return !empty($this->ruta_contrato_pdf);
    }

    /** Datos de la persona en el Core (nombre, apellido, cedula, email, ...), cacheados por request. */
    public function coreData(): array
    {
        if ($this->coreDataCache === null) {
            $this->coreDataCache = $this->persona_id
                ? (app(CoreApiClient::class)->obtenerPersona($this->persona_id) ?? [])
                : [];
        }

        return $this->coreDataCache;
    }

    // Relaciones locales
    public function foto()
    {
        return $this->hasOne(PersonaFoto::class, 'persona_id', 'persona_id');
    }
}
