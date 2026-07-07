<?php

namespace App\Http\Controllers;

use App\Services\CoreApiClient;

class NivelCargoController extends Controller
{
    public function index(CoreApiClient $core)
    {
        return response()->json($core->obtenerNivelesCargo()->values());
    }

    public function show(CoreApiClient $core, int $nivelCargo)
    {
        $nivel = $core->obtenerNivelesCargo()->get($nivelCargo);

        if (!$nivel) {
            return response()->json(['message' => 'Nivel de cargo no encontrado'], 404);
        }

        return response()->json($nivel);
    }
}
