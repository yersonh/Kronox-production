<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Permite continuar solo a roles de gestión (admin, super_admin, digitador).
 * Se usa para proteger la escritura de las tablas de parametrización
 * (dependencias, sectores, salas, etc.), dejando la lectura abierta.
 */
class EnsureGestor
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!in_array($request->user()?->rol, ['admin', 'super_admin', 'digitador'], true)) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        return $next($request);
    }
}
