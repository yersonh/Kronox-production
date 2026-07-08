<?php

namespace Tests\Feature;

use App\Models\Evento;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Regresión para el bug de serializarEvento(): dependencia_ids/sector_ids (solo IDs)
 * y el objeto crudo de persona (nombres/apellidos) del Core no coincidían con lo que
 * el frontend espera (dependencias/sectores como {id, nombre}, responsable como
 * {nombre, apellido}) — dejaba "—" en los listados y, más grave, hacía que
 * EventoModal/EventoForm precargaran el multiselect de dependencias vacío al editar,
 * bloqueando el guardado por la validación required|array|min:1.
 */
class EventoSerializationTest extends TestCase
{
    use RefreshDatabase;

    private int $personaId = 555555;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.core_api.url' => 'https://core-fake.test',
            'services.core_api.token' => 'test-token',
        ]);

        $personaFake = [
            'id' => $this->personaId,
            'nombres' => 'Juan',
            'apellidos' => 'Pérez',
            'email' => 'juan@test.com',
        ];

        $dependenciasFake = [
            ['id' => 1, 'nombre' => 'Alcaldía'],
            ['id' => 2, 'nombre' => 'Secretaría de Salud'],
        ];

        Http::fake([
            'core-fake.test/api/personas/lote' => Http::response([$personaFake], 200),
            'core-fake.test/api/personas/*' => Http::response($personaFake, 200),
            'core-fake.test/api/dependencias' => Http::response($dependenciasFake, 200),
            'core-fake.test/api/sectores' => Http::response([], 200),
        ]);
    }

    private function eventoConDependencias(array $dependenciaIds): Evento
    {
        $creador = User::factory()->create(['rol' => 'digitador']);
        $evento = Evento::create([
            'numero' => 'EVT-TEST',
            'tema' => 'Evento de prueba',
            'fecha_hora' => now()->addDay(),
            'responsable_id' => $this->personaId,
            'estado' => 'programado',
            'user_id' => $creador->id,
        ]);
        $evento->sincronizarDependencias($dependenciaIds);

        return $evento;
    }

    public function test_show_devuelve_dependencias_como_objetos_id_nombre(): void
    {
        $evento = $this->eventoConDependencias([1, 2]);
        $user = User::factory()->create(['rol' => 'digitador']);

        $response = $this->actingAs($user)->getJson("/api/eventos/{$evento->id}");

        $response->assertOk();
        $this->assertEquals(
            [1, 2],
            collect($response->json('dependencias'))->pluck('id')->all()
        );
        $this->assertEquals(
            ['Alcaldía', 'Secretaría de Salud'],
            collect($response->json('dependencias'))->pluck('nombre')->all()
        );
    }

    public function test_show_devuelve_responsable_como_nombre_apellido(): void
    {
        $evento = $this->eventoConDependencias([1]);
        $user = User::factory()->create(['rol' => 'digitador']);

        $response = $this->actingAs($user)->getJson("/api/eventos/{$evento->id}");

        $response->assertOk();
        $response->assertJson(['responsable' => ['nombre' => 'Juan', 'apellido' => 'Pérez']]);
    }

    public function test_index_tambien_devuelve_dependencias_resueltas(): void
    {
        $this->eventoConDependencias([1, 2]);
        $user = User::factory()->create(['rol' => 'digitador']);

        $response = $this->actingAs($user)->getJson('/api/eventos');

        $response->assertOk();
        $primero = $response->json('data.0');
        $this->assertEquals([1, 2], collect($primero['dependencias'])->pluck('id')->all());
    }

    /**
     * El caso crítico: editar un evento reenviando exactamente las dependencias que
     * el propio show() acaba de devolver (tal como hace EventoModal/EventoForm al
     * precargar el formulario) no debe fallar la validación ni vaciar las dependencias.
     */
    public function test_editar_evento_reenviando_las_dependencias_del_show_no_falla(): void
    {
        $evento = $this->eventoConDependencias([1, 2]);
        $user = User::factory()->create(['rol' => 'digitador']);

        $detalle = $this->actingAs($user)->getJson("/api/eventos/{$evento->id}")->json();

        // Esto es exactamente lo que hacen EventoModal.jsx/EventoForm.jsx al precargar:
        // evento.dependencias?.map(d => d.id) — antes del fix, esto daba [].
        $dependenciaIdsPrecargados = collect($detalle['dependencias'])->pluck('id')->all();
        $this->assertNotEmpty($dependenciaIdsPrecargados, 'El multiselect no debe precargar vacío');

        $response = $this->actingAs($user)->putJson("/api/eventos/{$evento->id}", [
            'fecha_hora' => $evento->fecha_hora->toDateTimeString(),
            'tema' => $evento->tema,
            'responsable_id' => $evento->responsable_id,
            'dependencias' => $dependenciaIdsPrecargados,
        ]);

        $response->assertOk();
        $this->assertEquals([1, 2], $evento->dependenciaIds()->sort()->values()->all());
    }
}
