<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ManualUsuarioController extends Controller
{
    public function descargar(Request $request)
    {
        $rol = $request->user()->rol;
        $ruta = "manuales/{$rol}.pdf";

        if (! Storage::disk('local')->exists($ruta)) {
            return response()->json(['message' => 'Manual no disponible para este rol'], 404);
        }

        $contenido = Storage::disk('local')->get($ruta);

        return response($contenido, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="manual_usuario_'.$rol.'.pdf"',
        ]);
    }
}
