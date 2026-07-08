<?php

namespace App\Http\Controllers;

use App\Models\Contratista;
use App\Models\ContratistaPlanilla;
use App\Models\Evento;
use App\Models\EventoInvitado;
use App\Models\InformeVinculacion;
use App\Models\Tarea;
use App\Models\TareaCompromiso;
use App\Rules\ArchivoPdf;
use App\Services\PdfApiService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AuxiliarInformeController extends Controller
{
    // GET /api/auxiliar-informe/mis-datos — contratista autenticado
    public function misDatos(Request $request)
    {
        $user = $request->user();
        $contratista = $user->contratista;

        if (!$contratista) {
            return response()->json(['message' => 'No es un contratista'], 403);
        }

        return response()->json($this->buildDatos($request, $contratista));
    }

    // GET /api/auxiliar-informe/contratista/{contratista} — admin
    public function datosContratista(Request $request, Contratista $contratista)
    {
        $user = $request->user();
        if (!in_array($user->rol, ['admin', 'super_admin', 'digitador'])) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        return response()->json($this->buildDatos($request, $contratista));
    }

    private function buildDatos(Request $request, Contratista $contratista): array
    {
        $desde = $request->query('desde'); // YYYY-MM-DD
        $hasta = $request->query('hasta'); // YYYY-MM-DD
        $personaId    = $contratista->persona_id;
        $contratistaId = $contratista->id;

        // 'estado' se eliminó de obligaciones (junto con fecha_cumplimiento, migración
        // 2026_06_22_000001/000002): el seguimiento de cumplimiento ahora vive en el
        // estado propio de cada evento/tarea/compromiso vinculado, no en la obligación.
        $obligaciones = $contratista->obligaciones()
            ->orderBy('created_at')
            ->get(['id', 'descripcion']);

        // Índice de vinculos: 'tipo_id' => vinculacion
        $vinculos = InformeVinculacion::where('contratista_id', $contratistaId)
            ->get()
            ->keyBy(fn($v) => $v->item_type . '_' . $v->item_id);

        $items = collect();

        // ── Eventos (donde el contratista es invitado) ──────────────────────
        $eventoIds = EventoInvitado::where('persona_id', $personaId)->pluck('evento_id');

        $eventosQuery = Evento::with(['fotos', 'sala'])
            ->whereIn('id', $eventoIds);
        if ($desde) $eventosQuery->where('fecha_hora', '>=', $desde . ' 00:00:00');
        if ($hasta) $eventosQuery->where('fecha_hora', '<=', $hasta . ' 23:59:59');

        foreach ($eventosQuery->orderBy('fecha_hora')->get() as $ev) {
            $vinculo = $vinculos->get('evento_' . $ev->id);
            $items->push([
                'tipo'           => 'evento',
                'id'             => $ev->id,
                'titulo'         => $ev->tema,
                'numero'         => $ev->numero,
                'fecha'          => $ev->fecha_hora,
                'fecha_fin'      => $ev->fecha_hora_fin,
                'estado'         => $ev->estado,
                'descripcion'    => $ev->descripcion,
                'conclusiones'   => $ev->conclusiones,
                'lugar'          => $ev->sala?->nombre ?? $ev->sitio,
                'fotos_count'    => $ev->fotos->count(),
                'fotos_ids'      => $ev->fotos->pluck('id')->values(),
                'tiene_soporte'  => !empty($ev->documento_soporte),
                'vinculacion_id' => $vinculo?->id,
                'obligacion_id'  => $vinculo?->obligacion_id,
            ]);
        }

        // ── Tareas ──────────────────────────────────────────────────────────
        $tareasQuery = Tarea::with('fotos')
            ->where('persona_id', $personaId);
        if ($desde) $tareasQuery->where('fecha_hora', '>=', $desde . ' 00:00:00');
        if ($hasta) $tareasQuery->where('fecha_hora', '<=', $hasta . ' 23:59:59');

        foreach ($tareasQuery->orderBy('fecha_hora')->get() as $t) {
            $vinculo = $vinculos->get('tarea_' . $t->id);
            $items->push([
                'tipo'           => 'tarea',
                'id'             => $t->id,
                'titulo'         => $t->asunto,
                'numero'         => $t->numero,
                'fecha'          => $t->fecha_hora,
                'fecha_fin'      => null,
                'estado'         => $t->estado,
                'descripcion'    => $t->descripcion,
                'conclusiones'   => $t->conclusiones,
                'lugar'          => null,
                'fotos_count'    => $t->fotos->count(),
                'fotos_ids'      => $t->fotos->pluck('id')->values(),
                'tiene_soporte'  => !empty($t->soporte_cumplimiento),
                'vinculacion_id' => $vinculo?->id,
                'obligacion_id'  => $vinculo?->obligacion_id,
            ]);
        }

        // ── Compromisos ─────────────────────────────────────────────────────
        $compromisosQuery = TareaCompromiso::with(['fotos', 'evento'])
            ->where('persona_id', $personaId);
        if ($desde) $compromisosQuery->where('fecha_limite', '>=', $desde);
        if ($hasta) $compromisosQuery->where('fecha_limite', '<=', $hasta);

        foreach ($compromisosQuery->orderBy('fecha_limite')->get() as $c) {
            $vinculo = $vinculos->get('compromiso_' . $c->id);
            $items->push([
                'tipo'           => 'compromiso',
                'id'             => $c->id,
                'titulo'         => $c->descripcion,
                'numero'         => $c->numero,
                'fecha'          => $c->fecha_limite,
                'fecha_fin'      => null,
                'estado'         => $c->estado,
                'descripcion'    => $c->descripcion,
                'conclusiones'   => $c->conclusiones,
                'lugar'          => $c->evento ? 'Evento: ' . $c->evento->tema : null,
                'fotos_count'    => $c->fotos->count(),
                'fotos_ids'      => $c->fotos->pluck('id')->values(),
                'tiene_soporte'  => !empty($c->soporte_cumplimiento),
                'vinculacion_id' => $vinculo?->id,
                'obligacion_id'  => $vinculo?->obligacion_id,
            ]);
        }

        $persona = $contratista->coreData();

        return [
            'contratista' => [
                'id'                => $contratista->id,
                'nombre'            => trim(($persona['nombres'] ?? '') . ' ' . ($persona['apellidos'] ?? '')),
                'cedula'            => $persona['numero_identificacion'] ?? null,
                'numero_contrato'   => $contratista->numero_contrato,
                'objeto_contrato'   => $contratista->objeto_contrato,
                'fecha_inicio'      => $contratista->fecha_inicio?->format('Y-m-d'),
                'fecha_fin'         => $contratista->fecha_fin?->format('Y-m-d'),
                'valor_contrato'                   => $contratista->valor_contrato,
                'duracion_contrato'                => $contratista->duracion_contrato,
                'fecha_suscripcion'                => $contratista->fecha_suscripcion,
                'supervisor_nombre'                   => $contratista->supervisor_nombre,
                'supervisor_cedula'                   => $contratista->supervisor_cedula,
                'supervisor_fecha_adicion_prorroga'   => $contratista->supervisor_fecha_adicion_prorroga,
                'supervisor_valor_adicion_prorroga'   => $contratista->supervisor_valor_adicion_prorroga,
            ],
            'obligaciones' => $obligaciones,
            'items'        => $items->values(),
            'planilla'     => $this->planillaParaPeriodo($contratistaId, $desde, $hasta),
        ];
    }

    // POST /api/auxiliar-informe/vincular
    private function planillaParaPeriodo(int $contratistaId, ?string $desde, ?string $hasta): ?array
    {
        $q = fn() => ContratistaPlanilla::where('contratista_id', $contratistaId);

        // Busca primero por el mes de 'hasta', luego por 'desde', luego la más reciente
        $periodos = array_filter(array_unique([
            $hasta ? substr($hasta, 0, 7) : null,
            $desde ? substr($desde, 0, 7) : null,
        ]));

        $p = null;
        foreach ($periodos as $periodo) {
            $p = $q()->where('periodo', $periodo)->first();
            if ($p) break;
        }
        $p = $p ?? $q()->orderByDesc('periodo')->first();

        if (!$p) return null;

        return [
            'numero'        => $p->planilla_numero,
            'fondo_pension' => $p->fondo_pension,
            'arl'           => $p->arl,
            'eps'           => $p->eps,
            'ibc'           => $p->ibc,
            'valor_pension' => $p->valor_pension,
            'valor_salud'   => $p->valor_salud,
            'valor_arl'     => $p->valor_arl,
            'valor_total'   => $p->valor_total,
            'fecha_pago'    => $p->fecha_pago,
        ];
    }

    public function vincular(Request $request)
    {
        $request->validate([
            'contratista_id' => 'nullable|exists:contratistas,id',
            'obligacion_id'  => 'nullable|exists:obligaciones,id',
            'item_type'      => 'required|in:evento,tarea,compromiso',
            'item_id'        => 'required|integer|min:1',
        ]);

        $user = $request->user();

        if ($request->filled('contratista_id') && in_array($user->rol, ['admin', 'super_admin', 'digitador'])) {
            $contratistaId = $request->contratista_id;
        } else {
            $contratistaId = $user->contratista?->id;
            if (!$contratistaId) {
                return response()->json(['message' => 'No es un contratista'], 403);
            }
        }

        $where = [
            'contratista_id' => $contratistaId,
            'item_type'      => $request->item_type,
            'item_id'        => $request->item_id,
        ];

        if (!$request->filled('obligacion_id')) {
            InformeVinculacion::where($where)->delete();
            return response()->json(['message' => 'Vínculo eliminado']);
        }

        $vinculo = InformeVinculacion::updateOrCreate(
            $where,
            ['obligacion_id' => $request->obligacion_id]
        );

        return response()->json($vinculo, 201);
    }

    // POST /api/auxiliar-informe/analizar-soportes
    public function analizarSoportes(Request $request)
    {
        $request->validate([
            'items'        => 'required|array|min:1|max:20',
            'items.*.tipo' => 'required|in:evento,tarea,compromiso',
            'items.*.id'   => 'required|integer|min:1',
        ]);

        $user      = $request->user();
        $esGestor  = in_array($user->rol, ['admin', 'super_admin', 'digitador'], true);
        $personaId = $user->persona_id;

        $servicio  = new PdfApiService();
        $resultado = [];

        foreach ($request->items as $item) {
            $clave  = $item['tipo'] . '_' . $item['id'];

            // Un contratista solo puede analizar soportes de sus propios items.
            if (!$esGestor && !$this->itemPerteneceA($item['tipo'], $item['id'], $personaId)) {
                $resultado[$clave] = null;
                continue;
            }

            $modelo = $this->resolverModelo($item['tipo'], $item['id']);

            // Devuelve el análisis cacheado si ya existe
            if ($modelo?->soporte_analisis) {
                $resultado[$clave] = $modelo->soporte_analisis;
                continue;
            }

            // Llama a Gemini y guarda el resultado
            $analisis = $servicio->analizarSoporte($item['tipo'], $item['id']);

            if ($analisis && $modelo) {
                $modelo->update(['soporte_analisis' => $analisis]);
            }

            $resultado[$clave] = $analisis;
        }

        return response()->json($resultado);
    }

    private function resolverModelo(string $tipo, int $id): Evento|Tarea|TareaCompromiso|null
    {
        return match ($tipo) {
            'evento'     => Evento::find($id),
            'tarea'      => Tarea::find($id),
            'compromiso' => TareaCompromiso::find($id),
            default      => null,
        };
    }

    /** Verifica que el item (evento como invitado, tarea o compromiso) pertenezca a la persona. */
    private function itemPerteneceA(string $tipo, int $id, ?int $personaId): bool
    {
        if (!$personaId) {
            return false;
        }

        return match ($tipo) {
            'evento'     => EventoInvitado::where('evento_id', $id)->where('persona_id', $personaId)->exists(),
            'tarea'      => Tarea::where('id', $id)->where('persona_id', $personaId)->exists(),
            'compromiso' => TareaCompromiso::where('id', $id)->where('persona_id', $personaId)->exists(),
            default      => false,
        };
    }

    // DELETE /api/auxiliar-informe/vinculacion/{vinculacion}
    public function desvincular(Request $request, InformeVinculacion $vinculacion)
    {
        $user = $request->user();
        $contratistaId = $user->contratista?->id;

        if (!in_array($user->rol, ['admin', 'super_admin']) && $vinculacion->contratista_id !== $contratistaId) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $vinculacion->delete();
        return response()->json(null, 204);
    }

    // GET /api/auxiliar-informe/planillas — lista planillas del contratista autenticado
    public function listarPlanillas(Request $request)
    {
        $contratista = $request->user()->contratista;
        if (!$contratista) {
            return response()->json(['message' => 'No es un contratista'], 403);
        }

        $planillas = ContratistaPlanilla::where('contratista_id', $contratista->id)
            ->orderByDesc('periodo')
            ->get(['id', 'periodo', 'nombre_original', 'created_at']);

        return response()->json($planillas);
    }

    // POST /api/auxiliar-informe/planillas — sube planilla para un período
    public function subirPlanilla(Request $request)
    {
        $contratista = $request->user()->contratista;
        if (!$contratista) {
            return response()->json(['message' => 'No es un contratista'], 403);
        }

        $request->validate([
            'periodo'  => ['required', 'regex:/^\d{4}-(0[1-9]|1[0-2])$/'],
            'planilla' => ['required', 'file', 'max:51200', new ArchivoPdf],
        ]);

        $archivo   = $request->file('planilla');
        $periodo   = $request->periodo;
        $anio      = substr($periodo, 0, 4);
        $mes       = substr($periodo, 5, 2);
        $ruta      = "planillas/{$anio}/{$mes}/contratista_{$contratista->id}_{$periodo}_" . now()->timestamp . '.pdf';

        Storage::disk('contratos')->put($ruta, file_get_contents($archivo->getRealPath()));

        $planilla = ContratistaPlanilla::updateOrCreate(
            ['contratista_id' => $contratista->id, 'periodo' => $periodo],
            ['ruta' => $ruta, 'nombre_original' => $archivo->getClientOriginalName(), 'subido_por' => $request->user()->id]
        );

        // Análisis automático al subir/reemplazar
        try {
            $analisis = app(PdfApiService::class)->analyzePlanilla($ruta, $archivo->getClientOriginalName());
            if ($analisis && ($analisis['success'] ?? false)) {
                $updates = [];
                foreach (['planilla_numero','fondo_pension','arl','eps','ibc','valor_pension','valor_salud','valor_arl','valor_total','fecha_pago'] as $campo) {
                    if (!empty($analisis[$campo])) $updates[$campo] = $analisis[$campo];
                }
                if ($updates) $planilla->update($updates);
            }
        } catch (\Exception) {}

        return response()->json($planilla->fresh(), 201);
    }

    // GET /api/auxiliar-informe/planillas/{planilla} — descarga planilla
    public function descargarPlanilla(Request $request, ContratistaPlanilla $planilla)
    {
        $contratista = $request->user()->contratista;
        if ($planilla->contratista_id !== $contratista?->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if (!Storage::disk('contratos')->exists($planilla->ruta)) {
            return response()->json(['message' => 'Archivo no encontrado'], 404);
        }

        return $this->descargaPdf(
            Storage::disk('contratos')->get($planilla->ruta),
            $planilla->nombre_original
        );
    }
}
