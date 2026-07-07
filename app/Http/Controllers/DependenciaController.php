<?php

namespace App\Http\Controllers;

use App\Services\CoreApiClient;

class DependenciaController extends Controller
{
    public function index(CoreApiClient $core)
    {
        return response()->json($core->obtenerDependencias()->values());
    }

    public function show(CoreApiClient $core, int $dependencia)
    {
        $dep = $core->obtenerDependencias()->get($dependencia);

        if (!$dep) {
            return response()->json(['message' => 'Dependencia no encontrada'], 404);
        }

        return response()->json($dep);
    }
}
