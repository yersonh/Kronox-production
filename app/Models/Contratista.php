<?php

namespace App\Models;

use App\Services\CoreApiClient;
use Illuminate\Database\Eloquent\Model;

class Contratista extends Model
{
    protected $table = 'contratistas';

    private ?array $coreDataCache = null;

    protected $fillable = [
        'persona_id', 'core_contratista_id', 'numero_contrato', 'objeto_contrato',
        'fecha_inicio', 'fecha_fin', 'dependencia_id', 'sector_id',
        'ruta_contrato_pdf', 'nombre_original_pdf', 'tamano_pdf_bytes', 'fecha_carga_pdf',
        'es_lider',
        'estado_contrato', 'notificado_30d', 'notificado_15d', 'notificado_7d', 'motivo_suspension',
        'ruta_estudios_previos', 'nombre_estudios_previos',
        'ruta_rut', 'nombre_rut',
        'ruta_polizas', 'nombre_polizas',
        'ruta_paz_salvo_parafiscales', 'nombre_paz_salvo_parafiscales',
        'ruta_seguridad_social', 'nombre_seguridad_social',
        'ruta_arl', 'nombre_arl',
        'ruta_acta_inicio', 'nombre_acta_inicio',
        'ruta_certificacion_bancaria', 'nombre_certificacion_bancaria',
        'ruta_registro_presupuestal', 'nombre_registro_presupuestal',
        'ruta_resolucion_supervisor', 'nombre_resolucion_supervisor',
        'valor_contrato', 'duracion_contrato', 'fecha_suscripcion',
        'supervisor_nombre', 'supervisor_cedula',
        'supervisor_fecha_adicion_prorroga', 'supervisor_valor_adicion_prorroga',
    ];

    protected $casts = [
        'fecha_inicio'    => 'date',
        'fecha_fin'       => 'date',
        'fecha_carga_pdf'  => 'datetime',
        'es_lider'         => 'boolean',
        'notificado_30d'   => 'boolean',
        'notificado_15d'   => 'boolean',
        'notificado_7d'    => 'boolean',
    ];

    protected $appends = ['tiene_minuta', 'documentos_estado'];

    public function getTieneMinutaAttribute(): bool
    {
        return !empty($this->ruta_contrato_pdf);
    }

    public function getDocumentosEstadoAttribute(): array
    {
        return [
            'estudios_previos'          => !empty($this->ruta_estudios_previos),
            'rut'                       => !empty($this->ruta_rut),
            'polizas'                   => !empty($this->ruta_polizas),
            'paz_salvo_parafiscales'    => !empty($this->ruta_paz_salvo_parafiscales),
            'seguridad_social'          => !empty($this->ruta_seguridad_social),
            'arl'                       => !empty($this->ruta_arl),
            'acta_inicio'               => !empty($this->ruta_acta_inicio),
            'certificacion_bancaria'    => !empty($this->ruta_certificacion_bancaria),
            'registro_presupuestal'     => !empty($this->ruta_registro_presupuestal),
            'resolucion_supervisor'     => !empty($this->ruta_resolucion_supervisor),
        ];
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

    public function obligaciones()
    {
        return $this->hasMany(Obligacion::class);
    }

    public function informeVinculaciones()
    {
        return $this->hasMany(InformeVinculacion::class);
    }

    public function renovacionDocumentos()
    {
        return $this->hasMany(ContratistaRenovacionDocumento::class)->latest();
    }

    public function diasParaVencer(): ?int
    {
        if (!$this->fecha_fin) return null;
        return (int) now()->startOfDay()->diffInDays($this->fecha_fin, false);
    }
}
