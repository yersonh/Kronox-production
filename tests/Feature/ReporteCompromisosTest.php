<?php

namespace Tests\Feature;

use App\Models\Evento;
use App\Models\EventoInvitado;
use App\Models\TareaCompromiso;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Regresión: GET /reportes/compromisos bloqueaba con 403 a cualquiera que no
 * fuera gestor, aunque el usuario fuera el responsable o un invitado del evento
 * consultado — rompiendo el flujo real de EventoDetalleModal.jsx, donde un
 * contratista responsable no podía ver los compromisos que él mismo asignó.
 */
class ReporteCompromisosTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.core_api.url' => 'https://core-fake.test',
            'services.core_api.token' => 'test-token',
        ]);

        Http::fake([
            'core-fake.test/api/personas/lote' => Http::response([], 200),
            'core-fake.test/api/dependencias' => Http::response([], 200),
        ]);
    }

    private function evento(int $responsableId): Evento
    {
        $creador = User::factory()->create(['rol' => 'digitador']);

        return Evento::create([
            'numero' => 'EVT-TEST',
            'tema' => 'Evento de prueba',
            'fecha_hora' => now()->addDay(),
            'responsable_id' => $responsableId,
            'estado' => 'programado',
            'user_id' => $creador->id,
        ]);
    }

    public function test_gestor_puede_consultar_sin_evento_id_y_con_cualquier_persona_id(): void
    {
        $gestor = User::factory()->create(['rol' => 'admin']);
        $evento = $this->evento(responsableId: 111);
        TareaCompromiso::create([
            'evento_id' => $evento->id, 'persona_id' => 999, 'descripcion' => 'Compromiso ajeno',
        ]);

        $this->actingAs($gestor)
            ->getJson('/api/reportes/compromisos?persona_id=999')
            ->assertOk()
            ->assertJsonCount(1, 'compromisos');
    }

    public function test_responsable_ve_todos_los_compromisos_de_su_evento(): void
    {
        $personaResponsable = 222;
        $evento = $this->evento(responsableId: $personaResponsable);
        TareaCompromiso::create(['evento_id' => $evento->id, 'persona_id' => 301, 'descripcion' => 'Para el asistente A']);
        TareaCompromiso::create(['evento_id' => $evento->id, 'persona_id' => 302, 'descripcion' => 'Para el asistente B']);

        $responsable = User::factory()->create(['rol' => 'persona', 'persona_id' => $personaResponsable]);

        // Manda persona_id=301 tratando de acotar — como es no-gestor, debe ignorarse
        // y seguir viendo AMBOS compromisos (incluido el asignado a 302).
        $this->actingAs($responsable)
            ->getJson("/api/reportes/compromisos?evento_id={$evento->id}&persona_id=301")
            ->assertOk()
            ->assertJsonCount(2, 'compromisos');
    }

    public function test_invitado_ve_compromisos_de_su_evento(): void
    {
        $evento = $this->evento(responsableId: 333);
        TareaCompromiso::create(['evento_id' => $evento->id, 'persona_id' => 301, 'descripcion' => 'Compromiso del evento']);

        $personaInvitada = 401;
        EventoInvitado::create(['evento_id' => $evento->id, 'persona_id' => $personaInvitada]);
        $invitado = User::factory()->create(['rol' => 'persona', 'persona_id' => $personaInvitada]);

        $this->actingAs($invitado)
            ->getJson("/api/reportes/compromisos?evento_id={$evento->id}")
            ->assertOk()
            ->assertJsonCount(1, 'compromisos');
    }

    public function test_no_responsable_ni_invitado_recibe_403(): void
    {
        $evento = $this->evento(responsableId: 333);
        $ajeno = User::factory()->create(['rol' => 'persona', 'persona_id' => 999]);

        $this->actingAs($ajeno)
            ->getJson("/api/reportes/compromisos?evento_id={$evento->id}")
            ->assertStatus(403);
    }

    public function test_no_gestor_sin_evento_id_recibe_403(): void
    {
        $usuario = User::factory()->create(['rol' => 'persona', 'persona_id' => 222]);

        $this->actingAs($usuario)
            ->getJson('/api/reportes/compromisos')
            ->assertStatus(403);
    }

    public function test_persona_id_no_permite_bypass_de_autorizacion(): void
    {
        // Evento ajeno: el usuario no es responsable ni invitado. Aunque mande su
        // propio persona_id como filtro, no debe poder ver el evento_id ajeno.
        $evento = $this->evento(responsableId: 333);
        $ajeno = User::factory()->create(['rol' => 'persona', 'persona_id' => 999]);

        $this->actingAs($ajeno)
            ->getJson("/api/reportes/compromisos?evento_id={$evento->id}&persona_id=999")
            ->assertStatus(403);
    }
}
