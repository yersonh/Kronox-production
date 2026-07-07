<?php

namespace App\Http\Controllers;

use App\Services\CoreApiClient;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Request;

class PersonaBusquedaController extends Controller
{
    /** Mismo criterio de gestor usado para crear funcionarios/contratistas. */
    private function esGestor(Request $request): bool
    {
        return in_array($request->user()->rol, ['admin', 'super_admin', 'digitador'], true);
    }

    public function buscar(Request $request, CoreApiClient $core)
    {
        if (! $this->esGestor($request)) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $request->validate([
            'numero_identificacion' => 'required|string',
            'tipo_identificacion' => 'nullable|in:CC,CE,TI,PA,RC,PEP',
        ]);

        $tipoIdentificacionId = CoreApiClient::TIPOS_IDENTIFICACION[$request->tipo_identificacion ?? 'CC'];

        try {
            $persona = $core->buscarPersona($tipoIdentificacionId, $request->numero_identificacion);
        } catch (ConnectionException|RequestException $e) {
            return response()->json(['message' => 'No se pudo verificar duplicados: el servicio Core no respondió.'], 503);
        }

        return response()->json(['persona' => $persona]);
    }
}
