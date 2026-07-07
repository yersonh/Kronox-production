<?php

namespace App\Http\Controllers;

use App\Models\Evento;
use App\Services\CoreApiClient;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AuditoriaController extends Controller
{
    public function eventosVencidos(Request $request)
    {
        if ($request->user()->rol !== 'super_admin') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $desde = $request->query('desde') ? Carbon::parse($request->query('desde'))->startOfDay() : null;
        $hasta = $request->query('hasta') ? Carbon::parse($request->query('hasta'))->endOfDay() : null;

        // Caso 1: cerrados automáticamente por el sistema sin que el responsable los finalizara
        $cerradosSinFinalizar = Evento::with('tipoEvento')
            ->where('estado', 'cerrado')
            ->whereNull('finalizado_en')
            ->when($desde, fn($q) => $q->where('fecha_hora', '>=', $desde))
            ->when($hasta, fn($q) => $q->where('fecha_hora', '<=', $hasta))
            ->orderBy('fecha_hora_fin', 'asc');

        // Caso 2: aún en_curso pero la hora fin ya pasó (se cerrarán esta noche)
        $enCursoVencidos = Evento::with('tipoEvento')
            ->where('estado', 'en_curso')
            ->when($desde, fn($q) => $q->where('fecha_hora', '>=', $desde))
            ->when($hasta, fn($q) => $q->where('fecha_hora', '<=', $hasta))
            ->where(function ($q) {
                $q->where(function ($q2) {
                    $q2->whereNotNull('fecha_hora_fin')->where('fecha_hora_fin', '<', now());
                })->orWhere(function ($q2) {
                    $q2->whereNull('fecha_hora_fin')->where('fecha_hora', '<', now());
                });
            })
            ->orderBy('fecha_hora_fin', 'asc');

        $todos = $cerradosSinFinalizar->get()->concat($enCursoVencidos->get());

        $core = app(CoreApiClient::class);
        $personas = $core->buscarPersonasPorIds($todos->pluck('responsable_id')->filter()->unique()->all());
        $dependencias = $core->obtenerDependencias();

        $resultado = $todos->map(function ($evento) use ($personas, $dependencias) {
            $referencia = $evento->fecha_hora_fin ?? $evento->fecha_hora;
            $responsable = $evento->responsable_id ? $personas->get($evento->responsable_id) : null;

            return [
                'id'             => $evento->id,
                'numero'         => $evento->numero,
                'tema'           => $evento->tema,
                'estado'         => $evento->estado,
                'fecha_hora'     => $evento->fecha_hora,
                'fecha_hora_fin' => $evento->fecha_hora_fin,
                'responsable'    => $responsable
                    ? ['nombre' => $responsable['nombres'] ?? null, 'apellido' => $responsable['apellidos'] ?? null]
                    : null,
                'dependencias'   => $evento->dependenciaIds()->map(fn ($id) => $dependencias->get($id)['nombre'] ?? null)->filter()->values(),
                'tipo_evento'    => $evento->tipoEvento?->nombre,
                'dias_vencido'   => (int) Carbon::parse($referencia)->diffInDays(now()),
            ];
        })->sortBy('dias_vencido')->values();

        return response()->json($resultado);
    }
}
