<?php

namespace Tests\Feature;

use App\Models\Evento;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class EventoPolicyTest extends TestCase
{
    use RefreshDatabase;

    private int $personaId = 555555;

    protected function setUp(): void
    {
        parent::setUp();

        // El Core es un servicio externo real: en tests se mockea con Http::fake()
        // usando el mismo formato de respuesta que documentan sus endpoints reales.
        config([
            'services.core_api.url' => 'https://core-fake.test',
            'services.core_api.token' => 'test-token',
        ]);

        $personaFake = [
            'id' => $this->personaId,
            'nombres' => 'Juan',
            'apellidos' => 'Pérez',
            'tipo_identificacion_id' => 1,
            'numero_identificacion' => '12345678',
            'email' => 'juan@test.com',
            'telefono' => '3000000000',
            'whatsapp' => '3000000000',
            'activo' => true,
        ];

        Http::fake([
            'core-fake.test/api/personas/lote' => Http::response([$personaFake], 200),
            'core-fake.test/api/personas/*' => Http::response($personaFake, 200),
        ]);
    }

    private function usuario(string $rol, ?int $persona_id = null): User
    {
        $attrs = ['rol' => $rol];
        if ($persona_id !== null) {
            $attrs['persona_id'] = $persona_id;
        }
        return User::factory()->create($attrs);
    }

    private function evento(array $attrs = []): Evento
    {
        $user = User::factory()->create(['rol' => 'digitador']);
        return Evento::create(array_merge([
            'numero'         => 'EVT-TEST',
            'tema'           => 'Evento de prueba',
            'fecha_hora'     => now()->addDay(),
            'responsable_id' => $this->personaId,
            'estado'         => 'programado',
            'user_id'        => $user->id,
        ], $attrs));
    }

    // ─── create ──────────────────────────────────────────────────────────────

    public function test_gestores_pueden_crear_eventos(): void
    {
        foreach (['admin', 'super_admin', 'digitador'] as $rol) {
            $user = $this->usuario($rol);
            $this->assertTrue(Gate::forUser($user)->allows('create', Evento::class));
        }
    }

    public function test_funcionario_y_contratista_no_pueden_crear(): void
    {
        foreach (['funcionario', 'contratista'] as $rol) {
            $user = $this->usuario($rol);
            $this->assertFalse(Gate::forUser($user)->allows('create', Evento::class));
        }
    }

    // ─── update ──────────────────────────────────────────────────────────────

    public function test_gestor_puede_editar_evento_programado(): void
    {
        $evento = $this->evento(['estado' => 'programado']);
        $user   = $this->usuario('digitador');
        $this->assertTrue(Gate::forUser($user)->allows('update', $evento));
    }

    public function test_gestor_puede_editar_evento_en_curso(): void
    {
        $evento = $this->evento(['estado' => 'en_curso']);
        $user   = $this->usuario('admin');
        $this->assertTrue(Gate::forUser($user)->allows('update', $evento));
    }

    public function test_no_se_puede_editar_evento_cerrado(): void
    {
        $evento = $this->evento(['estado' => 'cerrado']);
        foreach (['admin', 'super_admin', 'digitador'] as $rol) {
            $user = $this->usuario($rol);
            $this->assertFalse(Gate::forUser($user)->allows('update', $evento));
        }
    }

    public function test_no_se_puede_editar_evento_cancelado(): void
    {
        $evento = $this->evento(['estado' => 'cancelado']);
        $user   = $this->usuario('digitador');
        $this->assertFalse(Gate::forUser($user)->allows('update', $evento));
    }

    public function test_funcionario_no_puede_editar(): void
    {
        $evento = $this->evento(['estado' => 'programado']);
        $user   = $this->usuario('funcionario');
        $this->assertFalse(Gate::forUser($user)->allows('update', $evento));
    }

    // ─── delete ──────────────────────────────────────────────────────────────

    public function test_admin_puede_eliminar(): void
    {
        $evento = $this->evento();
        foreach (['admin', 'super_admin'] as $rol) {
            $user = $this->usuario($rol);
            $this->assertTrue(Gate::forUser($user)->allows('delete', $evento));
        }
    }

    public function test_digitador_no_puede_eliminar(): void
    {
        $evento = $this->evento();
        $user   = $this->usuario('digitador');
        $this->assertFalse(Gate::forUser($user)->allows('delete', $evento));
    }

    // ─── finalizar ───────────────────────────────────────────────────────────

    public function test_responsable_puede_finalizar_evento_en_curso(): void
    {
        $evento = $this->evento(['estado' => 'en_curso']);
        $user   = $this->usuario('funcionario', $this->personaId);
        $this->assertTrue(Gate::forUser($user)->allows('finalizar', $evento));
    }

    public function test_admin_puede_finalizar_evento_en_curso(): void
    {
        $evento = $this->evento(['estado' => 'en_curso']);
        $user   = $this->usuario('admin');
        $this->assertTrue(Gate::forUser($user)->allows('finalizar', $evento));
    }

    public function test_no_responsable_no_puede_finalizar(): void
    {
        $evento = $this->evento(['estado' => 'en_curso']);
        $user   = $this->usuario('funcionario', $this->personaId + 1);
        $this->assertFalse(Gate::forUser($user)->allows('finalizar', $evento));
    }

    public function test_no_se_puede_finalizar_evento_programado(): void
    {
        $evento = $this->evento(['estado' => 'programado']);
        $user   = $this->usuario('admin');
        $this->assertFalse(Gate::forUser($user)->allows('finalizar', $evento));
    }

    public function test_no_se_puede_finalizar_evento_ya_finalizado(): void
    {
        $evento = $this->evento(['estado' => 'finalizado']);
        $user   = $this->usuario('admin');
        $this->assertFalse(Gate::forUser($user)->allows('finalizar', $evento));
    }

    // ─── verConclusiones ─────────────────────────────────────────────────────

    public function test_gestores_pueden_ver_conclusiones(): void
    {
        $evento = $this->evento();
        foreach (['admin', 'digitador', 'super_admin'] as $rol) {
            $user = $this->usuario($rol);
            $this->assertTrue(Gate::forUser($user)->allows('verConclusiones', $evento));
        }
    }

    public function test_funcionario_no_puede_ver_conclusiones(): void
    {
        $evento = $this->evento();
        foreach (['funcionario', 'contratista'] as $rol) {
            $user = $this->usuario($rol);
            $this->assertFalse(Gate::forUser($user)->allows('verConclusiones', $evento));
        }
    }

    // ─── Endpoint: finalizar ─────────────────────────────────────────────────

    public function test_endpoint_finalizar_requiere_conclusiones(): void
    {
        $evento = $this->evento(['estado' => 'en_curso']);
        $user   = $this->usuario('admin');

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/eventos/{$evento->id}/finalizar", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['conclusiones']);
    }

    public function test_endpoint_finalizar_cambia_estado(): void
    {
        $evento = $this->evento(['estado' => 'en_curso']);
        $user   = $this->usuario('admin');

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/eventos/{$evento->id}/finalizar", [
                'conclusiones' => 'Las conclusiones del evento de prueba.',
            ])
            ->assertStatus(200);

        $this->assertEquals('finalizado', $evento->fresh()->estado);
        $this->assertNotNull($evento->fresh()->finalizado_en);
    }

    public function test_endpoint_finalizar_rechaza_estado_programado(): void
    {
        $evento = $this->evento(['estado' => 'programado']);
        $user   = $this->usuario('admin');

        $this->actingAs($user, 'sanctum')
            ->postJson("/api/eventos/{$evento->id}/finalizar", [
                'conclusiones' => 'Conclusiones.',
            ])
            ->assertStatus(403);
    }
}
