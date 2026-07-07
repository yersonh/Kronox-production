<?php

namespace App\Http\Controllers;

use App\Models\EntidadConfig;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class EntidadConfigController extends Controller
{
    private function getConfig(): EntidadConfig
    {
        return EntidadConfig::firstOrCreate([]);
    }

    public function show()
    {
        return response()->json($this->getConfig());
    }

    public function update(Request $request)
    {
        $this->requireAdmin($request);

        $request->validate([
            'nombre'               => 'required|string|max:255',
            'nit'                  => 'nullable|string|max:30',
            'direccion'            => 'nullable|string|max:255',
            'eslogan'              => 'nullable|string|max:255',
            'telefono'             => 'nullable|string|max:30',
            'email'                => 'nullable|email|max:255',
            'latitude'             => 'nullable|numeric|between:-90,90',
            'longitude'            => 'nullable|numeric|between:-180,180',
            'ubicacion_descripcion'=> 'nullable|string|max:500',
        ]);

        $config = $this->getConfig();
        $config->update($request->only([
            'nombre', 'nit', 'direccion', 'eslogan', 'telefono', 'email',
            'latitude', 'longitude', 'ubicacion_descripcion',
        ]));

        return response()->json($config->fresh());
    }

    public function subirLogo(Request $request)
    {
        $this->requireAdmin($request);

        $request->validate([
            'logo' => 'required|file|mimes:jpg,jpeg,png,webp,svg|max:2048',
        ]);

        $config  = $this->getConfig();
        $archivo = $request->file('logo');
        $ext     = strtolower($archivo->getClientOriginalExtension());
        $ruta    = 'entidad/logo.' . $ext;

        if ($config->logo_ruta && Storage::disk('contratos')->exists($config->logo_ruta)) {
            Storage::disk('contratos')->delete($config->logo_ruta);
        }

        Storage::disk('contratos')->put($ruta, file_get_contents($archivo->getRealPath()));

        $config->update([
            'logo_ruta'            => $ruta,
            'logo_nombre_original' => $archivo->getClientOriginalName(),
        ]);

        return response()->json($config->fresh());
    }

    public function verLogo()
    {
        $config = EntidadConfig::first();

        if (!$config?->logo_ruta || !Storage::disk('contratos')->exists($config->logo_ruta)) {
            return response()->json(['message' => 'Logo no encontrado'], 404);
        }

        $ext      = strtolower(pathinfo($config->logo_ruta, PATHINFO_EXTENSION));
        $mime     = match ($ext) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png'         => 'image/png',
            'webp'        => 'image/webp',
            'svg'         => 'image/svg+xml',
            default       => 'image/png',
        };
        $contenido = Storage::disk('contratos')->get($config->logo_ruta);

        return response($contenido, 200, [
            'Content-Type'             => $mime,
            'Content-Disposition'      => 'inline; filename="logo.' . $ext . '"',
            'Cache-Control'            => 'public, max-age=3600',
            'X-Content-Type-Options'   => 'nosniff',
            // Si el logo es un SVG, evita que se ejecute JavaScript embebido (XSS).
            'Content-Security-Policy'  => "default-src 'none'; style-src 'unsafe-inline'; img-src 'self' data:",
        ]);
    }

    public function verPublico()
    {
        $config = $this->getConfig();
        return response()->json([
            'nombre'  => $config->nombre ?? 'Kronox Agenda',
            'eslogan' => $config->eslogan ?? 'Sistema de Agenda Corporativa',
        ]);
    }

    private function requireAdmin(Request $request): void
    {
        if (!in_array($request->user()->rol, ['admin', 'super_admin'])) {
            abort(403, 'Sin permisos para modificar la configuración de la entidad');
        }
    }
}
