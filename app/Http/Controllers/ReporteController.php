<?php

namespace App\Http\Controllers;

use App\Models\TareaCompromiso;
use App\Services\CoreApiClient;
use Illuminate\Http\Request;

class ReporteController extends Controller
{
    private function soloGestores(Request $request): bool
    {
        return in_array($request->user()->rol, ['admin', 'digitador', 'super_admin']);
    }

    public function compromisos(Request $request)
    {
        if (!$this->soloGestores($request)) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $request->validate([
            'evento_id'    => 'nullable|exists:eventos,id',
            'persona_id'   => 'nullable|integer',
            'estado'       => 'nullable|in:pendiente,realizado,cancelado',
            'fecha_inicio' => 'nullable|date',
            'fecha_fin'    => 'nullable|date|after_or_equal:fecha_inicio',
        ]);

        $query = TareaCompromiso::with('evento');

        if ($request->evento_id) {
            $query->where('evento_id', $request->evento_id);
        }

        if ($request->persona_id) {
            $query->where('persona_id', $request->persona_id);
        }

        if ($request->estado) {
            $query->where('estado', $request->estado);
        }

        if ($request->fecha_inicio && $request->fecha_fin) {
            $query->whereBetween('fecha_limite', [$request->fecha_inicio, $request->fecha_fin]);
        } elseif ($request->fecha_inicio) {
            $query->where('fecha_limite', '>=', $request->fecha_inicio);
        } elseif ($request->fecha_fin) {
            $query->where('fecha_limite', '<=', $request->fecha_fin);
        }

        $compromisos = $query->orderBy('fecha_limite')->get();

        $resumen = [
            'total'     => $compromisos->count(),
            'pendiente' => $compromisos->where('estado', 'pendiente')->count(),
            'realizado' => $compromisos->where('estado', 'realizado')->count(),
            'cancelado' => $compromisos->where('estado', 'cancelado')->count(),
            'vencidos'  => $compromisos->where('estado', 'pendiente')
                ->filter(fn($c) => $c->fecha_limite && $c->fecha_limite->isPast())
                ->count(),
        ];

        $core = app(CoreApiClient::class);
        $personas = $core->buscarPersonasPorIds($compromisos->pluck('persona_id')->filter()->unique()->all());
        $dependencias = $core->obtenerDependencias();

        $items = $compromisos->map(function ($c) use ($personas, $dependencias) {
            $persona = $personas->get($c->persona_id);
            $depId = $c->evento?->dependenciaIds()->first();

            return [
                'id'            => $c->id,
                'numero'        => $c->numero,
                'descripcion'   => $c->descripcion,
                'estado'        => $c->estado,
                'fecha_limite'  => $c->fecha_limite,
                'cumplido_at'   => $c->cumplido_at,
                'conclusiones'  => $c->conclusiones,
                'soporte_cumplimiento' => $c->soporte_cumplimiento,
                'vencido'       => $c->estado === 'pendiente' && $c->fecha_limite?->isPast(),
                'persona'       => $persona ? trim(($persona['nombres'] ?? '') . ' ' . ($persona['apellidos'] ?? '')) : '—',
                'persona_id'    => $c->persona_id,
                'evento'        => $c->evento?->tema,
                'evento_id'     => $c->evento_id,
                'evento_numero' => $c->evento?->numero,
                'dependencia'   => $depId ? $dependencias->get($depId)['nombre'] ?? null : null,
            ];
        });

        return response()->json([
            'resumen'     => $resumen,
            'compromisos' => $items->values(),
        ]);
    }
}
