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

    /**
     * El Core no tiene (ni tendrá) un endpoint combinado de buscar-o-crear:
     * se busca primero por tipo+número de identificación y solo se crea si no existe.
     */
    public function buscarOCrearPersona(array $datos): array
    {
        $res = $this->client()->get('/api/personas', [
            'tipo_identificacion_id' => $datos['tipo_identificacion_id'],
            'numero_identificacion' => $datos['numero_identificacion'],
        ]);
        $res->throw();
        $existentes = $res->json('data', $res->json());

        if (! empty($existentes)) {
            return $existentes[0];
        }

        $res = $this->client()->post('/api/personas', $datos);
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
        $persona = $this->buscarOCrearPersona($datosPersona);
        $funcionario = $this->buscarOCrearPorPersonaId('/api/funcionarios', $persona['id'], $datosFuncionario);

        return ['persona' => $persona, 'funcionario' => $funcionario];
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
        $persona = $this->buscarOCrearPersona($datosPersona);
        $contratista = $this->buscarOCrearPorPersonaId('/api/contratistas', $persona['id'], $datosContratista);

        return ['persona' => $persona, 'contratista' => $contratista];
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

    /**
     * Busca un funcionario/contratista por persona_id (GET) y solo lo crea (POST)
     * si no existe todavía — el Core no expone una ruta combinada de buscar-o-crear.
     */
    private function buscarOCrearPorPersonaId(string $endpoint, int $personaId, array $datosCrear): array
    {
        $res = $this->client()->get($endpoint, ['persona_id' => $personaId]);
        $res->throw();
        $existentes = $res->json('data', $res->json());

        if (! empty($existentes)) {
            return $existentes[0];
        }

        $res = $this->client()->post($endpoint, array_merge($datosCrear, ['persona_id' => $personaId]));
        $res->throw();

        return $res->json();
    }

    // ───────────────────────── Catálogos (cacheados: son fijos y chicos) ─────────────────────────

    public function obtenerDependencias(): Collection
    {
        return collect($this->cachearCatalogo('core.dependencias.v2', '/api/dependencias'))->keyBy('id');
    }

    public function obtenerSectores(): Collection
    {
        return collect($this->cachearCatalogo('core.sectores.v2', '/api/sectores'))->keyBy('id');
    }

    public function obtenerNivelesCargo(): Collection
    {
        return collect($this->cachearCatalogo('core.niveles_cargo.v2', '/api/niveles-cargo'))->keyBy('id');
    }

    /**
     * Cachea la respuesta cruda (array) de un catálogo, nunca un Collection ya armado:
     * serializar un objeto Illuminate\Support\Collection vía el driver 'database' puede
     * devolver __PHP_Incomplete_Class en procesos de consola recién arrancados si la
     * clase no se resuelve exactamente igual al momento del unserialize automático.
     * Un array plano no tiene esa dependencia de autoload.
     */
    private function cachearCatalogo(string $key, string $endpoint): array
    {
        return Cache::remember($key, 3600, function () use ($endpoint) {
            $res = $this->client()->get($endpoint);

            return $res->successful() ? $res->json() : [];
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
