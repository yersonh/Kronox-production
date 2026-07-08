<?php

namespace App\Http\Controllers;

use App\Http\Middleware\EnsureGestor;
use App\Services\CoreApiClient;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class NivelCargoController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware(EnsureGestor::class, only: ['store', 'update', 'destroy'])];
    }

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

    public function store(Request $request, CoreApiClient $core)
    {
        $request->validate([
            'nombre' => 'required|string|max:255',
        ]);

        $nivel = $core->crearNivelCargo(['nombre' => $request->nombre]);

        return response()->json($nivel, 201);
    }

    public function update(Request $request, CoreApiClient $core, int $nivelCargo)
    {
        $request->validate([
            'nombre' => 'sometimes|string|max:255',
            'activo' => 'sometimes|boolean',
        ]);

        $nivel = $core->actualizarNivelCargo($nivelCargo, $request->only(['nombre', 'activo']));

        return response()->json($nivel);
    }

    public function destroy(CoreApiClient $core, int $nivelCargo)
    {
        $core->desactivarNivelCargo($nivelCargo);

        return response()->json(['message' => 'Nivel de cargo desactivado']);
    }
}
