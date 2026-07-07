<?php

namespace App\Http\Controllers;

use App\Models\Sala;
use App\Http\Middleware\EnsureGestor;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class SalaController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware(EnsureGestor::class, only: ['store', 'update', 'destroy'])];
    }

    public function index()
    {
        return response()->json(Sala::where('activo', true)->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombre'    => 'required|string|max:255',
            'ubicacion' => 'nullable|string|max:255',
            'capacidad' => 'nullable|integer|min:1',
        ]);

        $sala = Sala::create($request->only(['nombre', 'ubicacion', 'capacidad']));
        return response()->json($sala, 201);
    }

    public function show(Sala $sala)
    {
        return response()->json($sala->load('eventos'));
    }

    public function update(Request $request, Sala $sala)
    {
        $request->validate([
            'nombre'    => 'required|string|max:255',
            'ubicacion' => 'nullable|string|max:255',
            'capacidad' => 'nullable|integer|min:1',
        ]);

        $sala->update($request->only(['nombre', 'ubicacion', 'capacidad']));
        return response()->json($sala);
    }

    public function destroy(Sala $sala)
    {
        $sala->update(['activo' => false]);
        return response()->json(['message' => 'Sala desactivada']);
    }
}