<?php

namespace App\Http\Controllers;

use App\Models\Contratista;
use App\Models\Funcionario;
use App\Models\User;
use App\Services\CoreApiClient;
use Illuminate\Http\Request;

class PersonaController extends Controller
{
    /** Roles que pueden consultar/gestionar el directorio de personas. */
    private function esGestor(Request $request): bool
    {
        return in_array($request->user()->rol, ['admin', 'super_admin', 'digitador', 'supervisor_contratos'], true);
    }

    /** IDs (del Core) de las personas registradas localmente como funcionario o contratista. */
    private function personaIdsRegistrados(): \Illuminate\Support\Collection
    {
        return Contratista::pluck('persona_id')
            ->merge(Funcionario::pluck('persona_id'))
            ->filter()
            ->unique()
            ->values();
    }

    public function index(Request $request, CoreApiClient $core)
    {
        if (!$this->esGestor($request)) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $ids = $this->personaIdsRegistrados();

        if ($request->boolean('sin_usuario')) {
            $conUsuario = User::whereNotNull('persona_id')->pluck('persona_id');
            $incluirId = $request->integer('incluir_persona_id');
            $ids = $ids->reject(fn ($id) => $conUsuario->contains($id) && $id !== $incluirId)->values();
        }

        $personas = $core->buscarPersonasPorIds($ids->all());

        return response()->json($ids->map(fn ($id) => $personas->get($id))->filter()->values());
    }

    public function show(Request $request, CoreApiClient $core, int $personaId)
    {
        $esDueno = $request->user()->persona_id === $personaId;
        if (!$this->esGestor($request) && !$esDueno) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $persona = $core->obtenerPersona($personaId);

        if (!$persona) {
            return response()->json(['message' => 'Persona no encontrada'], 404);
        }

        return response()->json(array_merge($persona, [
            'funcionario' => Funcionario::where('persona_id', $personaId)->first(),
            'contratista' => Contratista::where('persona_id', $personaId)->first(),
        ]));
    }

    public function destroy(Request $request, int $personaId)
    {
        if (!in_array($request->user()->rol, ['admin', 'super_admin'], true)) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        // Desactivar una persona es una operación sobre el Core, no hay endpoint definido todavía.
        return response()->json(['message' => 'Operación no disponible: la desactivación de personas se gestiona en el Core'], 501);
    }
}
