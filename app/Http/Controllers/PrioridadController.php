<?php

namespace App\Http\Controllers;

use App\Models\Prioridad;
use App\Http\Middleware\EnsureGestor;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class PrioridadController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware(EnsureGestor::class, only: ['store', 'update', 'destroy'])];
    }

    public function index()
    {
        return response()->json(Prioridad::where('activo', true)->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre'           => 'required|string|max:255',
            'dias_vencimiento' => 'required|integer|min:1',
            'color'            => 'nullable|string|max:20',
        ]);

        $prioridad = Prioridad::create($request->only(['nombre', 'dias_vencimiento', 'color']));
        return response()->json($prioridad, 201);
    }

    public function show(Prioridad $prioridad)
    {
        return response()->json($prioridad);
    }

    public function update(Request $request, Prioridad $prioridad)
    {
        $request->validate([
            'nombre'           => 'required|string|max:255',
            'dias_vencimiento' => 'required|integer|min:1',
            'color'            => 'nullable|string|max:20',
        ]);

        $prioridad->update($request->only(['nombre', 'dias_vencimiento', 'color']));
        return response()->json($prioridad);
    }

    public function destroy(Prioridad $prioridad)
    {
        $prioridad->update(['activo' => false]);
        return response()->json(['message' => 'Prioridad desactivada']);
    }
}