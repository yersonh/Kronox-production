<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class ManualUsuarioController extends Controller
{
    public function descargar(Request $request)
    {
        $rol = $request->user()->rol;
        $ruta = resource_path("manuales/{$rol}.pdf");

        if (! File::exists($ruta)) {
            return response()->json(['message' => 'Manual no disponible para este rol'], 404);
        }

        return response(File::get($ruta), 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="manual_usuario_'.$rol.'.pdf"',
        ]);
    }
}
