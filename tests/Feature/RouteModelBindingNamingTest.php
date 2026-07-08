<?php

namespace Tests\Feature;

use Illuminate\Contracts\Routing\UrlRoutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route as RouteFacade;
use Illuminate\Support\Str;
use ReflectionMethod;
use Tests\TestCase;

/**
 * Guarda contra la clase de bug encontrada en UserController y TipoEventoController:
 * un parámetro de método tipado como modelo Eloquent (p.ej. `User $user`) cuyo nombre
 * no coincide (ni en camelCase ni en snake_case) con el nombre del parámetro de ruta
 * (p.ej. `{usuario}`) hace que Laravel descarte el binding implícito en silencio.
 * El contenedor termina inyectando un modelo vacío no guardado en vez del real, y
 * cualquier escritura sobre él (`->update()`) es un no-op silencioso que igual
 * responde 200 — sin este test, el único síntoma es "no pasa nada" en producción.
 *
 * Este test recorre TODAS las rutas registradas (no hace falta mantenerlo al agregar
 * controladores nuevos) y replica la misma lógica de resolución de nombre que usa
 * Illuminate\Routing\ImplicitRouteBinding::getParameterName().
 */
class RouteModelBindingNamingTest extends TestCase
{
    public function test_los_parametros_de_ruta_tipados_como_modelo_coinciden_con_su_nombre_de_ruta(): void
    {
        $fallos = [];

        foreach (RouteFacade::getRoutes() as $route) {
            $action = $route->getAction();

            if (! isset($action['controller']) || ! is_string($action['controller']) || ! str_contains($action['controller'], '@')) {
                continue;
            }

            [$class, $method] = explode('@', $action['controller']);

            if (! class_exists($class) || ! method_exists($class, $method)) {
                continue;
            }

            $routeParameterNames = $route->parameterNames();

            foreach ((new ReflectionMethod($class, $method))->getParameters() as $parametro) {
                $tipo = $parametro->getType();

                if (! $tipo || $tipo->isBuiltin()) {
                    continue;
                }

                $tipoClase = $tipo->getName();

                // Solo nos interesan los parámetros que Laravel intentaría enlazar por ruta
                // (modelos Eloquent u otros UrlRoutable) — Request, servicios, etc. se ignoran.
                if ($tipoClase === Request::class || ! is_subclass_of($tipoClase, UrlRoutable::class)) {
                    continue;
                }

                $nombre = $parametro->getName();
                $nombreSnake = Str::snake($nombre);

                $coincide = in_array($nombre, $routeParameterNames, true)
                    || in_array($nombreSnake, $routeParameterNames, true);

                if (! $coincide) {
                    $fallos[] = sprintf(
                        '%s::%s(%s $%s) — la ruta "%s" [%s] tiene los parámetros [%s], ninguno coincide con "%s" ni "%s"',
                        $class, $method, $tipoClase, $nombre,
                        $route->uri(), implode('|', $route->methods()),
                        implode(', ', $routeParameterNames), $nombre, $nombreSnake
                    );
                }
            }
        }

        $this->assertEmpty(
            $fallos,
            "Se encontraron parámetros de método con binding de modelo roto (nombre no coincide con la ruta):\n\n"
                .implode("\n", $fallos)
        );
    }
}
