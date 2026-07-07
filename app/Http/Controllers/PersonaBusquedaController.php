<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\BuscaRegistroLocalDePersona;
use App\Services\CoreApiClient;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Request;

class PersonaBusquedaController extends Controller
{
    use BuscaRegistroLocalDePersona;

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

        if (! $persona) {
            return response()->json(['estado' => 'nueva']);
        }

        $registro = $this->buscarRegistroLocalDePersona($persona['id']);

        if ($registro) {
            return response()->json([
                'estado' => 'ya_registrado',
                'persona' => $persona,
                'tipo_registro' => $registro['tipo'],
                'registro_id' => $registro['id'],
                'registro_url' => $this->registroUrlLocal($registro['tipo'], $request->numero_identificacion),
            ]);
        }

        return response()->json(['estado' => 'existente_sin_registro', 'persona' => $persona]);
    }
}
