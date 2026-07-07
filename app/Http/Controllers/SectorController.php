<?php

namespace App\Http\Controllers;

use App\Services\CoreApiClient;
use Illuminate\Http\Request;

class SectorController extends Controller
{
    public function index(Request $request, CoreApiClient $core)
    {
        $sectores = $core->obtenerSectores()->values();

        if ($request->dependencia_id) {
            $depId = (int) $request->dependencia_id;
            $sectores = $sectores->filter(fn ($s) => ($s['dependencia_id'] ?? null) === $depId)->values();
        }

        return response()->json($sectores);
    }

    public function show(CoreApiClient $core, int $sector)
    {
        $s = $core->obtenerSectores()->get($sector);

        if (!$s) {
            return response()->json(['message' => 'Sector no encontrado'], 404);
        }

        return response()->json($s);
    }
}
