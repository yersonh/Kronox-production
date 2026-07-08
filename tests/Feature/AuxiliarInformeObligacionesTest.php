<?php

namespace Tests\Feature;

use App\Models\Contratista;
use App\Models\Obligacion;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Regresión: AuxiliarInformeController::buildDatos() seleccionaba la columna
 * 'estado' de obligaciones, pero esa columna se eliminó (migración
 * 2026_06_22_000001_drop_estado_from_obligaciones_table, previa a esta sesión) sin
 * que el controlador se actualizara — reventaba con
 * SQLSTATE[42703]: Undefined column "estado" en producción. Nada reemplazó ese
 * campo (el frontend solo usa id/descripcion de cada obligación), así que se quitó
 * del select() sin agregar nada equivalente.
 */
class AuxiliarInformeObligacionesTest extends TestCase
{
    use RefreshDatabase;

    public function test_datos_contratista_no_falla_por_columna_estado_eliminada(): void
    {
        config([
            'services.core_api.url' => 'https://core-fake.test',
            'services.core_api.token' => 'test-token',
        ]);

        $personaId = 777;
        Http::fake([
            'core-fake.test/api/personas/*' => Http::response([
                'id' => $personaId, 'nombres' => 'Ana', 'apellidos' => 'Gómez',
                'numero_identificacion' => '123456',
            ], 200),
        ]);

        $contratista = Contratista::create(['persona_id' => $personaId]);
        Obligacion::create(['contratista_id' => $contratista->id, 'descripcion' => 'Entregar informes mensuales']);

        $admin = User::factory()->create(['rol' => 'admin']);

        $response = $this->actingAs($admin)
            ->getJson("/api/auxiliar-informe/contratista/{$contratista->id}");

        $response->assertOk();
        $response->assertJsonCount(1, 'obligaciones');
        $response->assertJsonPath('obligaciones.0.descripcion', 'Entregar informes mensuales');

        // No basta con "no tiene la clave estado": SQLite (a diferencia de Postgres)
        // no lanza error al seleccionar una columna inexistente entre comillas dobles
        // — la trata como literal de texto y la devuelve bajo una clave rara (la
        // columna sale como `"estado"`, con las comillas incluidas en el nombre). Por
        // eso se compara el conjunto exacto de claves, que sí detecta cualquier
        // columna de más sin importar cómo se llame.
        $this->assertEquals(['id', 'descripcion'], array_keys($response->json('obligaciones.0')));
    }
}
