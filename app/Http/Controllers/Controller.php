<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Symfony\Component\HttpFoundation\HeaderUtils;

abstract class Controller
{
    use AuthorizesRequests;

    /**
     * Construye una respuesta de descarga de PDF segura.
     *
     * Codifica el nombre de archivo con HeaderUtils (evita inyección de
     * cabeceras vía nombres maliciosos) y fuerza nosniff para que el
     * navegador no reinterprete el contenido como otro tipo (anti-XSS).
     */
    protected function descargaPdf(string $contenido, ?string $nombre, string $disposition = HeaderUtils::DISPOSITION_INLINE)
    {
        $nombre   = $nombre ?: 'documento.pdf';
        $fallback = preg_replace('/[^A-Za-z0-9._-]/', '_', $nombre) ?: 'documento.pdf';

        return response($contenido, 200, [
            'Content-Type'           => 'application/pdf',
            'X-Content-Type-Options' => 'nosniff',
            'Content-Disposition'    => HeaderUtils::makeDisposition($disposition, $nombre, $fallback),
        ]);
    }
}
