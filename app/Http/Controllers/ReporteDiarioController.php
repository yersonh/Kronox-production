<?php

namespace App\Http\Controllers;

use App\Models\ReporteDiario;
use App\Models\User;
use App\Notifications\ReporteDiarioNotification;
use App\Services\CoreApiClient;
use Illuminate\Http\Request;

class ReporteDiarioController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        $query = ReporteDiario::with('contratista')
            ->orderByDesc('fecha')
            ->orderByDesc('created_at');

        if ($user->rol !== 'super_admin') {
            $dependenciaId = $this->getDependenciaId($user);

            if (!$dependenciaId) {
                return response()->json(['message' => 'No tiene dependencia asignada'], 422);
            }

            $query->where('dependencia_id', $dependenciaId);
        }

        if ($request->fecha_inicio) {
            $query->where('fecha', '>=', $request->fecha_inicio);
        }

        if ($request->fecha_fin) {
            $query->where('fecha', '<=', $request->fecha_fin);
        }

        $paginator = $query->paginate($request->integer('per_page', 15));

        $core = app(CoreApiClient::class);
        $reportes = $paginator->getCollection();
        $personas = $core->buscarPersonasPorIds($reportes->pluck('contratista.persona_id')->filter()->all());
        $dependencias = $core->obtenerDependencias();

        $paginator->setCollection($reportes->map(function ($r) use ($personas, $dependencias) {
            $arr = $r->toArray();
            $arr['contratista']['persona'] = $r->contratista ? $personas->get($r->contratista->persona_id) : null;
            $arr['dependencia'] = $dependencias->get($r->dependencia_id);
            return $arr;
        }));

        return response()->json($paginator);
    }

    public function store(Request $request)
    {
        $user = $request->user();

        if ($user->rol !== 'contratista') {
            return response()->json(['message' => 'Solo los contratistas pueden crear reportes de actividades'], 403);
        }

        $contratista = $user->contratista;

        if (!$contratista || !$contratista->es_lider) {
            return response()->json(['message' => 'Solo el lider de la dependencia puede crear reportes de actividades'], 403);
        }

        if (!$contratista->dependencia_id) {
            return response()->json(['message' => 'No tiene dependencia asignada'], 422);
        }

        $request->validate([
            'descripcion' => 'required|string',
            'fecha'       => 'required|date',

            'lugar'       => 'required|string|max:255',
        ]);

        $reporte = ReporteDiario::create([
            'contratista_id' => $contratista->id,
            'dependencia_id' => $contratista->dependencia_id,
            'descripcion'    => $request->descripcion,
            'fecha'          => $request->fecha,

            'lugar'          => $request->lugar,
        ]);

        $reporte->load('contratista');

        $this->notificarDependencia($contratista->dependencia_id, $reporte);

        return response()->json($reporte, 201);
    }

    private function getDependenciaId($user): ?int
    {
        if ($user->rol === 'contratista') {
            return $user->contratista?->dependencia_id;
        }

        return $user->funcionario?->dependencia_id;
    }

    private function notificarDependencia(int $dependenciaId, ReporteDiario $reporte): void
    {
        $personaIds = \App\Models\Contratista::where('dependencia_id', $dependenciaId)->pluck('persona_id')
            ->merge(\App\Models\Funcionario::where('dependencia_id', $dependenciaId)->pluck('persona_id'));

        $users = User::where('activo', true)
            ->whereIn('persona_id', $personaIds)
            ->get();

        foreach ($users as $user) {
            $user->notify(new ReporteDiarioNotification($reporte));
        }
    }
}
