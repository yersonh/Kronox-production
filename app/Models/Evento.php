<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class Evento extends Model
{
    protected $table = 'eventos';

    protected $fillable = [
        'numero', 'tipo_evento_id', 'fecha_hora', 'fecha_hora_fin',
        'sala_id', 'sitio', 'tema', 'entidad', 'area',
        'responsable_id', 'descripcion',
        'conclusiones', 'enlace_meet', 'documento_soporte', 'acta_reunion', 'resumen_acta',
        'es_publica', 'estado', 'finalizado_en', 'user_id',
        'lista_asistencia', 'latitude', 'longitude', 'direccion',
        'notificado_pendiente_finalizar',
        'razon_aplazamiento', 'soporte_analisis',
    ];

    protected $casts = [
        'fecha_hora'                      => 'datetime:Y-m-d\TH:i:s',
        'fecha_hora_fin'                  => 'datetime:Y-m-d\TH:i:s',
        'finalizado_en'                   => 'datetime:Y-m-d\TH:i:s',
        'es_publica'                      => 'boolean',
        'latitude'                        => 'decimal:8',
        'longitude'                       => 'decimal:8',
        'notificado_pendiente_finalizar'  => 'boolean',
        'soporte_analisis'               => 'array',
    ];

    // Estados válidos del workflow
    const ESTADOS = ['programado', 'en_curso', 'finalizado', 'cerrado', 'aplazado', 'cancelado'];

    // Relaciones
    public function tipoEvento()
    {
        return $this->belongsTo(TipoEvento::class);
    }

    public function sala()
    {
        return $this->belongsTo(Sala::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function invitados()
    {
        return $this->hasMany(EventoInvitado::class);
    }

    public function compromisos()
    {
        return $this->hasMany(TareaCompromiso::class);
    }

    public function fotos()
    {
        return $this->hasMany(EventoFoto::class);
    }

    public function ubicaciones()
    {
        return $this->hasMany(EventoUbicacion::class);
    }

    // Dependencias/sectores viven en el Core: evento_dependencias/evento_sectores solo guardan sus IDs.
    public function dependenciaIds(): Collection
    {
        return DB::table('evento_dependencias')->where('evento_id', $this->id)->pluck('dependencia_id');
    }

    public function sectorIds(): Collection
    {
        return DB::table('evento_sectores')->where('evento_id', $this->id)->pluck('sector_id');
    }

    public function sincronizarDependencias(array $ids): void
    {
        DB::table('evento_dependencias')->where('evento_id', $this->id)->delete();
        $rows = collect($ids)->unique()->map(fn ($id) => [
            'evento_id' => $this->id,
            'dependencia_id' => $id,
            'created_at' => now(),
            'updated_at' => now(),
        ])->all();
        if ($rows) {
            DB::table('evento_dependencias')->insert($rows);
        }
    }

    public function sincronizarSectores(array $ids): void
    {
        DB::table('evento_sectores')->where('evento_id', $this->id)->delete();
        $rows = collect($ids)->unique()->map(fn ($id) => [
            'evento_id' => $this->id,
            'sector_id' => $id,
            'created_at' => now(),
            'updated_at' => now(),
        ])->all();
        if ($rows) {
            DB::table('evento_sectores')->insert($rows);
        }
    }
}
