<?php

namespace App\Http\Controllers;

use App\Models\TipoEvento;
use App\Http\Middleware\EnsureGestor;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class TipoEventoController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware(EnsureGestor::class, only: ['store', 'update', 'destroy'])];
    }

    public function index()
    {
        return response()->json(TipoEvento::where('activo', true)->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:255|unique:tipos_evento,nombre',
            'activo' => 'sometimes|boolean'
        ]);

        $tipo = TipoEvento::create($validated);
        
        return response()->json($tipo, 201);
    }

    public function show(TipoEvento $tipoEvento)
    {
        return response()->json($tipoEvento);
    }

    public function update(Request $request, $id)
    {
        $tipoEvento = TipoEvento::findOrFail($id);

        $validated = $request->validate([
            'nombre' => [
                'required',
                'string',
                'max:255',
                'unique:tipos_evento,nombre,' . $tipoEvento->id
            ],
            'activo' => 'sometimes|boolean'
        ]);

        $tipoEvento->update($validated);
        
        return response()->json($tipoEvento);
    }

    public function destroy($id)
    {
        $tipoEvento = TipoEvento::findOrFail($id);
        $tipoEvento->update(['activo' => false]);
        
        return response()->json(['message' => 'Tipo de evento desactivado']);
    }
}