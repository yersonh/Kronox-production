<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class CoreApiClient
{
    /** Catálogo fijo de tipo_identificacion_id del Core. NIT solo aplica a empresas, no a personas. */
    public const TIPOS_IDENTIFICACION = [
        'CC' => 1,
        'CE' => 2,
        'TI' => 3,
        'PA' => 4,
        'RC' => 5,
        'PEP' => 6,
        'NIT' => 7,
    ];

    private function client()
    {
        return Http::baseUrl(config('services.core_api.url'))
            ->withToken(config('services.core_api.token'))
            ->acceptJson();
    }

    // ───────────────────────── Personas ─────────────────────────

    public function obtenerPersona(int $coreId): ?array
    {
        $res = $this->client()->get("/api/personas/{$coreId}");

        return $res->successful() ? $res->json() : null;
    }

    /**
     * Trae varias personas por sus IDs del Core en lote (evita N+1 por HTTP).
     * POST /api/personas/lote, body {"ids": [...]}, respuesta: array plano de personas
     * (IDs inexistentes se omiten). Límite de 500 ids por llamada — se trocea si hace falta.
     */
    public function buscarPersonasPorIds(array $ids): Collection
    {
        $ids = array_values(array_unique(array_filter($ids)));

        if (empty($ids)) {
            return collect();
        }

        $personas = collect();

        foreach (array_chunk($ids, 500) as $lote) {
            $res = $this->client()->post('/api/personas/lote', ['ids' => $lote]);

            if ($res->successful()) {
                $personas = $personas->merge(collect($res->json())->keyBy('id'));
            }
        }

        return $personas;
    }

    public function buscarOCrearPersona(array $datos): array
    {
        $res = $this->client()->post('/api/personas/buscar-o-crear', $datos);
        $res->throw();

        return $res->json();
    }

    public function actualizarPersona(int $personaId, array $datos): array
    {
        $res = $this->client()->patch("/api/personas/{$personaId}", $datos);
        $res->throw();

        return $res->json();
    }

    // ───────────────────────── Funcionarios ─────────────────────────

    public function obtenerFuncionario(int $coreId): ?array
    {
        $res = $this->client()->get("/api/funcionarios/{$coreId}");

        return $res->successful() ? $res->json() : null;
    }

    public function buscarOCrearFuncionario(array $datosPersona, array $datosFuncionario): array
    {
        $res = $this->client()->post('/api/funcionarios/buscar-o-crear', [
            'persona' => $datosPersona,
            'funcionario' => $datosFuncionario,
        ]);
        $res->throw();

        return $res->json();
    }

    public function actualizarFuncionario(int $coreFuncionarioId, array $datos): array
    {
        $res = $this->client()->patch("/api/funcionarios/{$coreFuncionarioId}", $datos);
        $res->throw();

        return $res->json();
    }

    // ───────────────────────── Contratistas ─────────────────────────

    public function obtenerContratista(int $coreId): ?array
    {
        $res = $this->client()->get("/api/contratistas/{$coreId}");

        return $res->successful() ? $res->json() : null;
    }

    public function buscarOCrearContratista(array $datosPersona, array $datosContratista): array
    {
        $res = $this->client()->post('/api/contratistas/buscar-o-crear', [
            'persona' => $datosPersona,
            'contratista' => $datosContratista,
        ]);
        $res->throw();

        return $res->json();
    }

    public function actualizarContratista(int $coreContratistaId, array $datos): array
    {
        $res = $this->client()->patch("/api/contratistas/{$coreContratistaId}", $datos);
        $res->throw();

        return $res->json();
    }

    public function crearRenovacionContrato(int $coreContratistaId, array $datos): array
    {
        $res = $this->client()->post("/api/contratistas/{$coreContratistaId}/renovaciones", $datos);
        $res->throw();

        return $res->json();
    }

    // ───────────────────────── Catálogos (cacheados: son fijos y chicos) ─────────────────────────

    public function obtenerDependencias(): Collection
    {
        return Cache::remember('core.dependencias', 3600, function () {
            $res = $this->client()->get('/api/dependencias');

            return $res->successful() ? collect($res->json())->keyBy('id') : collect();
        });
    }

    public function obtenerSectores(): Collection
    {
        return Cache::remember('core.sectores', 3600, function () {
            $res = $this->client()->get('/api/sectores');

            return $res->successful() ? collect($res->json())->keyBy('id') : collect();
        });
    }

    public function obtenerNivelesCargo(): Collection
    {
        return Cache::remember('core.niveles_cargo', 3600, function () {
            $res = $this->client()->get('/api/niveles-cargo');

            return $res->successful() ? collect($res->json())->keyBy('id') : collect();
        });
    }

    // ───────────────────────── Caché local ─────────────────────────

    /**
     * Sincroniza dependencia_id/sector_id en la caché local de un Contratista/Funcionario
     * a partir de los datos devueltos por el Core, sin disparar observers.
     */
    public function sincronizarCacheLocal(Model $model, ?int $dependenciaId, ?int $sectorId = null): void
    {
        $model->newQuery()->whereKey($model->getKey())->update([
            'dependencia_id' => $dependenciaId,
            'sector_id' => $sectorId,
        ]);

        $model->dependencia_id = $dependenciaId;
        $model->sector_id = $sectorId;
    }
}
