<?php

namespace App\Http\Controllers;

use App\Models\Contratista;
use App\Models\Evento;
use App\Models\Funcionario;
use App\Models\Tarea;
use App\Models\TareaCompromiso;
use App\Services\CoreApiClient;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class EstadisticasController extends Controller
{
    private const MESES_ABBR = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    /** Devuelve respuesta 403 si el usuario no es super_admin, o null si está autorizado. */
    private function autorizar(Request $request)
    {
        if ($request->user()->rol !== 'super_admin') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        return null;
    }

    // ───────────────────────── Helpers de puntualidad ─────────────────────────

    /** Una tarea realizada se considera "tarde" si se cerró después del fin del día de vencimiento. */
    private function tareaTarde($t): bool
    {
        return $t->estado === 'realizado' && $t->cerrado_at && $t->fecha_vencimiento
            && Carbon::parse($t->cerrado_at)->gt(Carbon::parse($t->fecha_vencimiento)->endOfDay());
    }

    /** Un compromiso cumplido se considera "tarde" si se cumplió después del fin del día límite. */
    private function compromisoTarde($c): bool
    {
        return $c->estado === 'cumplido' && $c->cumplido_at && $c->fecha_limite
            && Carbon::parse($c->cumplido_at)->gt(Carbon::parse($c->fecha_limite)->endOfDay());
    }

    private function pct(int $parte, int $total): ?int
    {
        return $total > 0 ? (int) round($parte / $total * 100) : null;
    }

    // ───────────────────────── Panorama general (resumen ejecutivo) ─────────────────────────

    public function panorama(Request $request)
    {
        if ($r = $this->autorizar($request)) {
            return $r;
        }

        $hoy = Carbon::today();

        // KPI date range filter (optional)
        $desde = $request->query('desde') ? Carbon::parse($request->query('desde'))->startOfDay() : null;
        $hasta = $request->query('hasta') ? Carbon::parse($request->query('hasta'))->endOfDay() : null;
        $hayFiltro = $desde !== null || $hasta !== null;

        // Tendencia range — explicit t_desde/t_hasta, or default to últimos 6 meses
        $tDesde = $request->query('t_desde')
            ? Carbon::parse($request->query('t_desde'))->startOfMonth()
            : Carbon::today()->startOfMonth()->subMonths(5);
        $tHasta = $request->query('t_hasta')
            ? Carbon::parse($request->query('t_hasta'))->endOfMonth()
            : Carbon::today()->endOfMonth();

        // Returns true if a given date falls within the KPI period (always true when no filter).
        $enKpi = fn ($fecha) => ! $hayFiltro || (
            $fecha
            && ($desde === null || Carbon::parse($fecha)->gte($desde))
            && ($hasta === null || Carbon::parse($fecha)->lte($hasta))
        );

        // EVENTOS — a_tiempo = finalizado sin destiempo; destiempo = finalizado tardío o cerrado por abandono
        $eventos = Evento::select('id', 'estado', 'en_destiempo', 'finalizado_en', 'fecha_hora')->get();
        $evCompletados = $eventos->filter(fn ($e) => in_array($e->estado, ['finalizado', 'cerrado']) && $enKpi($e->fecha_hora));
        $evFinalizado = $evCompletados->filter(fn ($e) => $e->estado === 'finalizado' && ! $e->en_destiempo)->count();
        $evCerrado    = $evCompletados->filter(fn ($e) => $e->estado === 'cerrado' || ($e->estado === 'finalizado' && $e->en_destiempo))->count();
        $evRealizados = $evFinalizado + $evCerrado;

        // TAREAS
        $tareas = Tarea::select('id', 'estado', 'cerrado_at', 'fecha_vencimiento')->get();
        $tRealizadas = $tareas->filter(fn ($t) => $t->estado === 'realizado' && $enKpi($t->cerrado_at));
        $tTarde = $tRealizadas->filter(fn ($t) => $this->tareaTarde($t))->count();
        $tATiempo = $tRealizadas->count() - $tTarde;
        $tVencidas = $tareas->filter(fn ($t) => $t->estado === 'vencida'
            || ($t->estado === 'pendiente' && $t->fecha_vencimiento && Carbon::parse($t->fecha_vencimiento)->lt($hoy))
        )->count();
        $tPendientes = $tareas->filter(fn ($t) => $t->estado === 'pendiente' && (! $t->fecha_vencimiento || Carbon::parse($t->fecha_vencimiento)->gte($hoy))
        )->count();

        // COMPROMISOS
        $comp = TareaCompromiso::select('id', 'estado', 'cumplido_at', 'fecha_limite')->get();
        $cCumplidos = $comp->filter(fn ($c) => $c->estado === 'cumplido' && $enKpi($c->cumplido_at));
        $cTarde = $cCumplidos->filter(fn ($c) => $this->compromisoTarde($c))->count();
        $cATiempo = $cCumplidos->count() - $cTarde;
        $cVencidos = $comp->where('estado', 'vencida')->count();
        $cPendientes = $comp->where('estado', 'pendiente')->count();

        // ÍNDICE GENERAL DE CUMPLIMIENTO — de todo lo completado, qué % fue a tiempo
        $totalCompletadas = $evRealizados + $tRealizadas->count() + $cCumplidos->count();
        $totalATiempo = $evFinalizado + $tATiempo + $cATiempo;
        $indice = $this->pct($totalATiempo, $totalCompletadas);

        // TENDENCIA — monthly breakdown within t_desde..t_hasta
        $tendencia = [];
        $curr = $tDesde->copy()->startOfMonth();
        while ($curr->lte($tHasta)) {
            $ini = $curr->copy()->startOfMonth();
            $fin = $curr->copy()->endOfMonth();
            $tendencia[] = [
                'mes' => $curr->format('Y-m'),
                'label' => self::MESES_ABBR[$curr->month].' '.$curr->format('y'),
                'eventos' => $eventos->filter(fn ($e) => in_array($e->estado, ['finalizado', 'cerrado']) && $e->fecha_hora
                    && Carbon::parse($e->fecha_hora)->between($ini, $fin))->count(),
                'tareas' => $tareas->filter(fn ($t) => $t->estado === 'realizado' && $t->cerrado_at
                    && Carbon::parse($t->cerrado_at)->between($ini, $fin))->count(),
                'compromisos' => $comp->filter(fn ($c) => $c->estado === 'cumplido' && $c->cumplido_at
                    && Carbon::parse($c->cumplido_at)->between($ini, $fin))->count(),
            ];
            $curr->addMonth();
        }

        return response()->json([
            'indice_cumplimiento' => $indice,
            'total_completadas' => $totalCompletadas,
            'total_a_tiempo' => $totalATiempo,
            'total_destiempo' => $totalCompletadas - $totalATiempo,
            'eventos' => [
                'realizados' => $evRealizados,
                'a_tiempo' => $evFinalizado,
                'destiempo' => $evCerrado,
                'pct_a_tiempo' => $this->pct($evFinalizado, $evRealizados),
                'programados' => $eventos->where('estado', 'programado')->count(),
                'en_curso' => $eventos->where('estado', 'en_curso')->count(),
                'aplazados' => $eventos->where('estado', 'aplazado')->count(),
                'cancelados' => $eventos->where('estado', 'cancelado')->count(),
            ],
            'tareas' => [
                'realizadas' => $tRealizadas->count(),
                'a_tiempo' => $tATiempo,
                'tarde' => $tTarde,
                'vencidas' => $tVencidas,
                'pendientes' => $tPendientes,
                'pct_a_tiempo' => $this->pct($tATiempo, $tRealizadas->count()),
            ],
            'compromisos' => [
                'cumplidos' => $cCumplidos->count(),
                'a_tiempo' => $cATiempo,
                'tarde' => $cTarde,
                'vencidos' => $cVencidos,
                'pendientes' => $cPendientes,
                'pct_a_tiempo' => $this->pct($cATiempo, $cCumplidos->count()),
            ],
            'tendencia' => $tendencia,
        ]);
    }

    // ───────────────────────── Rendimiento por dependencia y sector ─────────────────────────

    public function actividadesPorDependencia(Request $request)
    {
        if ($r = $this->autorizar($request)) {
            return $r;
        }

        $desde = $request->query('desde') ? Carbon::parse($request->query('desde'))->startOfDay() : null;
        $hasta = $request->query('hasta') ? Carbon::parse($request->query('hasta'))->endOfDay() : null;

        $aplicarFecha = function ($query) use ($desde, $hasta) {
            if ($desde) $query->where('eventos.fecha_hora', '>=', $desde);
            if ($hasta) $query->where('eventos.fecha_hora', '<=', $hasta);
        };

        // Eventos realizados (finalizado|cerrado) con su dependencia y estado
        $porDep = DB::table('evento_dependencias')
            ->join('eventos', 'eventos.id', '=', 'evento_dependencias.evento_id')
            ->whereIn('eventos.estado', ['finalizado', 'cerrado'])
            ->when(true, $aplicarFecha)
            ->select('evento_dependencias.dependencia_id', 'eventos.estado', 'eventos.en_destiempo')
            ->get()
            ->groupBy('dependencia_id');

        // Eventos realizados con su sector
        $porSector = DB::table('evento_sectores')
            ->join('eventos', 'eventos.id', '=', 'evento_sectores.evento_id')
            ->whereIn('eventos.estado', ['finalizado', 'cerrado'])
            ->when(true, $aplicarFecha)
            ->select('evento_sectores.sector_id', 'eventos.estado', 'eventos.en_destiempo')
            ->get()
            ->groupBy('sector_id');

        $core = app(CoreApiClient::class);
        $dependencias = $core->obtenerDependencias()->values()->map(fn ($d) => (object) $d);
        $sectores = $core->obtenerSectores()->values()->map(fn ($s) => (object) $s);

        $evATiempo = fn ($col) => $col->filter(fn ($e) => $e->estado === 'finalizado' && ! $e->en_destiempo)->count();
        $evDestiempo = fn ($col) => $col->filter(fn ($e) => $e->estado === 'cerrado' || ($e->estado === 'finalizado' && $e->en_destiempo))->count();

        $result = $dependencias->map(function ($dep) use ($porDep, $sectores, $porSector, $evATiempo, $evDestiempo) {
            $evs = $porDep->get($dep->id, collect());
            $total = $evs->count();
            $aTiempo = $evATiempo($evs);
            $destiempo = $evDestiempo($evs);

            $sectoresDep = $sectores->where('dependencia_id', $dep->id)->map(function ($s) use ($porSector, $evATiempo, $evDestiempo) {
                $sEvs = $porSector->get($s->id, collect());

                return [
                    'nombre' => $s->nombre,
                    'total' => $sEvs->count(),
                    'a_tiempo' => $evATiempo($sEvs),
                    'destiempo' => $evDestiempo($sEvs),
                    'pct_a_tiempo' => $this->pct($evATiempo($sEvs), $sEvs->count()),
                ];
            })->sortByDesc('total')->values();

            return [
                'id' => $dep->id,
                'nombre' => $dep->nombre,
                'total' => $total,
                'a_tiempo' => $aTiempo,
                'destiempo' => $destiempo,
                'pct_a_tiempo' => $this->pct($aTiempo, $total),
                'por_sector' => $sectoresDep,
            ];
        })->sortByDesc('total')->values();

        return response()->json($result);
    }

    // ───────────────────────── Rendimiento por persona (contratistas + funcionarios) ─────────────────────────

    public function personas(Request $request)
    {
        if ($r = $this->autorizar($request)) {
            return $r;
        }

        $perPage = min(48, max(6, (int) $request->get('per_page', 12)));
        $page = max(1, (int) $request->get('page', 1));
        $tipo = $request->get('tipo', 'todos');
        $buscar = trim((string) $request->get('buscar', ''));

        $hayFiltroFecha = $request->query('desde') && $request->query('hasta');
        if ($hayFiltroFecha) {
            $inicio = Carbon::parse($request->query('desde'))->startOfDay();
            $fin    = Carbon::parse($request->query('hasta'))->endOfDay();
        } else {
            // Backward compat: mes/anio params (defaults to current month)
            $mes  = (int) $request->get('mes', now()->month);
            $anio = (int) $request->get('anio', now()->year);
            $inicio = Carbon::create($anio, $mes, 1)->startOfMonth();
            $fin    = $inicio->copy()->endOfMonth();
            $hayFiltroFecha = true; // siempre filtramos por mes cuando no hay desde/hasta
        }

        // 1) Info base (sin métricas) — 2 consultas locales + UN lote al Core para nombres
        $base = collect();
        $core = app(CoreApiClient::class);
        $dependencias = $core->obtenerDependencias();

        $contratistas = $tipo !== 'funcionario'
            ? Contratista::withCount('obligaciones as total_obligaciones')->get()
            : collect();
        $funcionarios = $tipo !== 'contratista' ? Funcionario::all() : collect();

        $personas = $core->buscarPersonasPorIds(
            $contratistas->pluck('persona_id')->merge($funcionarios->pluck('persona_id'))->filter()->unique()->all()
        );

        foreach ($contratistas as $c) {
            $persona = $personas->get($c->persona_id);
            if (! $persona) {
                continue;
            }
            $base->push([
                'id' => 'c'.$c->id,
                'modelo_id' => $c->id,
                'persona_id' => $c->persona_id,
                'tipo' => 'contratista',
                'nombre' => trim(($persona['nombres'] ?? '').' '.($persona['apellidos'] ?? '')),
                'dependencia' => $c->dependencia_id ? $dependencias->get($c->dependencia_id)['nombre'] ?? null : null,
                'detalle' => $c->numero_contrato ? 'Contrato: '.$c->numero_contrato : null,
                'total_obligaciones' => $c->total_obligaciones,
            ]);
        }

        foreach ($funcionarios as $f) {
            $persona = $personas->get($f->persona_id);
            if (! $persona) {
                continue;
            }
            $base->push([
                'id' => 'f'.$f->id,
                'modelo_id' => $f->id,
                'persona_id' => $f->persona_id,
                'tipo' => 'funcionario',
                'nombre' => trim(($persona['nombres'] ?? '').' '.($persona['apellidos'] ?? '')),
                'dependencia' => $f->dependencia_id ? $dependencias->get($f->dependencia_id)['nombre'] ?? null : null,
                'detalle' => $f->cargo,
                'total_obligaciones' => null,
            ]);
        }

        // 2) Búsqueda por nombre / dependencia / detalle
        if ($buscar !== '') {
            $q = mb_strtolower($buscar);
            $base = $base->filter(fn ($p) => str_contains(mb_strtolower($p['nombre']), $q)
                || str_contains(mb_strtolower((string) $p['dependencia']), $q)
                || str_contains(mb_strtolower((string) $p['detalle']), $q)
            );
        }

        $base = $base->sortBy('nombre', SORT_NATURAL | SORT_FLAG_CASE)->values();
        $total = $base->count();

        // 3) Pre-computar mapas item_id → mes (YYYY-MM) para el período — una sola vez para todos
        // Esto evita N*3 queries adicionales dentro del map y permite calcular meses_con_obligaciones
        $eventoMes = DB::table('eventos')
            ->whereBetween('fecha_hora', [$inicio, $fin])
            ->pluck('fecha_hora', 'id')
            ->map(fn ($d) => Carbon::parse($d)->format('Y-m'));

        $tareaMes = DB::table('tareas')
            ->whereNotNull('cerrado_at')
            ->whereBetween('cerrado_at', [$inicio, $fin])
            ->pluck('cerrado_at', 'id')
            ->map(fn ($d) => Carbon::parse($d)->format('Y-m'));

        $compromisoMes = DB::table('tarea_compromisos')
            ->whereNotNull('cumplido_at')
            ->whereBetween('cumplido_at', [$inicio, $fin])
            ->pluck('cumplido_at', 'id')
            ->map(fn ($d) => Carbon::parse($d)->format('Y-m'));

        // Calcular métricas SOLO de la página actual
        $pagina = $base->slice(($page - 1) * $perPage, $perPage)->values();

        $personas = $pagina->map(function ($p) use ($inicio, $fin, $hayFiltroFecha, $eventoMes, $tareaMes, $compromisoMes) {
            $obligEvidenciadas   = 0;
            $mesesConObligaciones = 0;

            if ($p['tipo'] === 'contratista') {
                $mid = $p['modelo_id'];

                // Traer todas las vinculaciones del contratista con obligacion asignada
                $vinculaciones = DB::table('informe_vinculaciones')
                    ->where('contratista_id', $mid)
                    ->whereNotNull('obligacion_id')
                    ->select('item_type', 'item_id', 'obligacion_id')
                    ->get();

                // Filtrar a las que corresponden a actividades dentro del período
                $enPeriodo = $vinculaciones->filter(function ($v) use ($eventoMes, $tareaMes, $compromisoMes) {
                    return match ($v->item_type) {
                        'evento'      => $eventoMes->has($v->item_id),
                        'tarea'       => $tareaMes->has($v->item_id),
                        'compromiso'  => $compromisoMes->has($v->item_id),
                        default       => false,
                    };
                });

                $obligEvidenciadas = $enPeriodo->pluck('obligacion_id')->unique()->count();

                // Meses distintos en que evidenció al menos una obligación
                $mesesConObligaciones = $enPeriodo->map(function ($v) use ($eventoMes, $tareaMes, $compromisoMes) {
                    return match ($v->item_type) {
                        'evento'     => $eventoMes->get($v->item_id),
                        'tarea'      => $tareaMes->get($v->item_id),
                        'compromiso' => $compromisoMes->get($v->item_id),
                        default      => null,
                    };
                })->filter()->unique()->count();
            }

            return $this->rendimientoPersona($p['persona_id'], $inicio, $fin, [
                'id' => $p['id'],
                'tipo' => $p['tipo'],
                'nombre' => $p['nombre'],
                'dependencia' => $p['dependencia'],
                'detalle' => $p['detalle'],
                'total_obligaciones' => $p['total_obligaciones'],
                'obligaciones_evidenciadas' => $obligEvidenciadas,
                'meses_con_obligaciones'    => $mesesConObligaciones,
            ]);
        });

        return response()->json([
            'desde' => $inicio->toDateString(),
            'hasta' => $fin->toDateString(),
            'personas' => $personas,
            'total' => $total,
            'page' => $page,
            'per_page' => $perPage,
            'last_page' => max(1, (int) ceil($total / $perPage)),
        ]);
    }

    /** Calcula el desglose de actividades y puntualidad de una persona en un rango de fechas. */
    private function rendimientoPersona($personaId, $inicio, $fin, array $base): array
    {
        // Eventos realizados donde participó (invitado o responsable)
        $eventosInvitado = DB::table('evento_invitados')
            ->join('eventos', 'eventos.id', '=', 'evento_invitados.evento_id')
            ->where('evento_invitados.persona_id', $personaId)
            ->whereIn('eventos.estado', ['finalizado', 'cerrado'])
            ->whereBetween('eventos.fecha_hora', [$inicio, $fin])
            ->select('eventos.id', 'eventos.estado', 'eventos.en_destiempo')
            ->get();

        $eventosResp = DB::table('eventos')
            ->where('responsable_id', $personaId)
            ->whereIn('estado', ['finalizado', 'cerrado'])
            ->whereBetween('fecha_hora', [$inicio, $fin])
            ->select('id', 'estado', 'en_destiempo')
            ->get();

        $eventos = $eventosInvitado->concat($eventosResp)->unique('id');
        $eventosMes = $eventos->count();
        $eventosATiempo = $eventos->filter(fn ($e) => $e->estado === 'finalizado' && ! $e->en_destiempo)->count();

        // Tareas realizadas en el mes
        $tareas = Tarea::where('persona_id', $personaId)
            ->where('estado', 'realizado')
            ->whereBetween('cerrado_at', [$inicio, $fin])
            ->get(['id', 'estado', 'cerrado_at', 'fecha_vencimiento']);
        $tareasMes = $tareas->count();
        $tareasTarde = $tareas->filter(fn ($t) => $this->tareaTarde($t))->count();
        $tareasATiempo = $tareasMes - $tareasTarde;

        // Compromisos cumplidos en el mes
        $comp = TareaCompromiso::where('persona_id', $personaId)
            ->where('estado', 'cumplido')
            ->whereBetween('cumplido_at', [$inicio, $fin])
            ->get(['id', 'estado', 'cumplido_at', 'fecha_limite']);
        $compromisosMes = $comp->count();
        $compTarde = $comp->filter(fn ($c) => $this->compromisoTarde($c))->count();
        $compATiempo = $compromisosMes - $compTarde;

        $actividadesMes = $eventosMes + $tareasMes + $compromisosMes;
        $aTiempo = $eventosATiempo + $tareasATiempo + $compATiempo;

        return array_merge($base, [
            'actividades_mes' => $actividadesMes,
            'eventos_mes' => $eventosMes,
            'tareas_mes' => $tareasMes,
            'tareas_a_tiempo' => $tareasATiempo,
            'tareas_tarde' => $tareasTarde,
            'compromisos_mes' => $compromisosMes,
            'compromisos_a_tiempo' => $compATiempo,
            'compromisos_tarde' => $compTarde,
            'a_tiempo' => $aTiempo,
            'destiempo' => $actividadesMes - $aTiempo,
            'indice' => $this->pct($aTiempo, $actividadesMes),
        ]);
    }

    // ───────────────────────── Mapa de calor de actividades ─────────────────────────

    public function mapaCalor(Request $request)
    {
        if ($r = $this->autorizar($request)) {
            return $r;
        }

        $puntos = Evento::whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->select('id', 'tema', 'estado', 'latitude', 'longitude', 'direccion', 'sitio', 'fecha_hora')
            ->get();

        $eventoIds = $puntos->pluck('id');

        $depsPorEvento = DB::table('evento_dependencias')
            ->whereIn('evento_id', $eventoIds)
            ->get()
            ->groupBy('evento_id')
            ->map(fn ($rows) => $rows->pluck('dependencia_id')->values());

        $sectoresPorEvento = DB::table('evento_sectores')
            ->whereIn('evento_id', $eventoIds)
            ->get()
            ->groupBy('evento_id')
            ->map(fn ($rows) => $rows->pluck('sector_id')->values());

        $puntos = $puntos->map(fn ($e) => [
                'id' => $e->id,
                'tema' => $e->tema,
                'estado' => $e->estado,
                'lat' => (float) $e->latitude,
                'lng' => (float) $e->longitude,
                'direccion' => $e->direccion,
                'sitio' => $e->sitio,
                'fecha' => $e->fecha_hora,
                'dependencia_ids' => $depsPorEvento->get($e->id, collect())->values(),
                'sector_ids' => $sectoresPorEvento->get($e->id, collect())->values(),
            ]);

        // Top lugares por nombre de sitio
        $topSitios = Evento::select('sitio', DB::raw('COUNT(*) as total'))
            ->whereNotNull('sitio')
            ->where('sitio', '!=', '')
            ->groupBy('sitio')
            ->orderByDesc('total')
            ->limit(10)
            ->get();

        return response()->json([
            'puntos' => $puntos,
            'top_sitios' => $topSitios,
            'total' => $puntos->count(),
        ]);
    }
}
