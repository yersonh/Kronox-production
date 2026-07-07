<?php

namespace App\Http\Controllers;

use App\Models\Contratista;
use App\Models\Obligacion;
use Illuminate\Http\Request;

class ObligacionController extends Controller
{
    /** Roles que gestionan obligaciones de contratistas. */
    private function esGestor(Request $request): bool
    {
        return in_array($request->user()->rol, ['admin', 'super_admin', 'digitador', 'supervisor_contratos'], true);
    }

    private function denegarSiNoEsGestor(Request $request)
    {
        return $this->esGestor($request) ? null : response()->json(['message' => 'No autorizado'], 403);
    }

    public function index(Request $request, Contratista $contratista)
    {
        // Gestores ven cualquiera; un contratista solo sus propias obligaciones.
        $esDueno = $request->user()->persona_id === $contratista->persona_id;
        if (! $this->esGestor($request) && ! $esDueno) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $obligaciones = $contratista->obligaciones()
            ->orderBy('created_at')
            ->get();

        return response()->json($obligaciones);
    }

    public function store(Request $request, Contratista $contratista)
    {
        if ($denegado = $this->denegarSiNoEsGestor($request)) {
            return $denegado;
        }

        $data = $request->validate([
            'descripcion' => 'required|string',
            'observaciones' => 'nullable|string',
        ]);

        $obligacion = $contratista->obligaciones()->create($data);

        return response()->json($obligacion, 201);
    }

    public function update(Request $request, Obligacion $obligacion)
    {
        if ($denegado = $this->denegarSiNoEsGestor($request)) {
            return $denegado;
        }

        $data = $request->validate([
            'descripcion' => 'required|string',
            'observaciones' => 'nullable|string',
        ]);

        $obligacion->update($data);

        return response()->json($obligacion);
    }

    public function destroy(Request $request, Obligacion $obligacion)
    {
        if ($denegado = $this->denegarSiNoEsGestor($request)) {
            return $denegado;
        }

        $obligacion->delete();

        return response()->json(null, 204);
    }
}
