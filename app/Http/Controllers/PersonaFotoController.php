<?php

namespace App\Http\Controllers;

use App\Models\PersonaFoto;
use Illuminate\Support\Facades\Storage;

class PersonaFotoController extends Controller
{
    public function ver(int $personaId)
    {
        $foto = PersonaFoto::where('persona_id', $personaId)->first();

        if (!$foto?->foto_ruta || !Storage::disk('contratos')->exists($foto->foto_ruta)) {
            return response()->file(public_path('images/imagendefault.png'), [
                'Content-Type'  => 'image/png',
                'Cache-Control' => 'public, max-age=3600',
            ]);
        }

        $ext  = strtolower(pathinfo($foto->foto_ruta, PATHINFO_EXTENSION));
        $mime = match($ext) {
            'png'         => 'image/png',
            'webp'        => 'image/webp',
            default       => 'image/jpeg',
        };

        return response(Storage::disk('contratos')->get($foto->foto_ruta), 200, [
            'Content-Type'  => $mime,
            'Cache-Control' => 'public, max-age=86400, immutable',
        ]);
    }

    public function thumbnail(int $personaId)
    {
        $foto = PersonaFoto::where('persona_id', $personaId)->first();

        if (!$foto?->foto_thumbnail_ruta || !Storage::disk('contratos')->exists($foto->foto_thumbnail_ruta)) {
            return response()->file(public_path('images/imagendefault.png'), [
                'Content-Type'  => 'image/png',
                'Cache-Control' => 'public, max-age=3600',
            ]);
        }

        return response(Storage::disk('contratos')->get($foto->foto_thumbnail_ruta), 200, [
            'Content-Type'  => 'image/jpeg',
            'Cache-Control' => 'public, max-age=86400, immutable',
        ]);
    }
}
