<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Regresión para el bug de route-model binding roto: $user vs {usuario}
 * en la ruta hacía que el contenedor inyectara un User vacío no guardado,
 * por lo que update() era un no-op silencioso que igual respondía 200.
 * Estos tests verifican el efecto real en BD, no solo el código de estado.
 */
class UserControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // El Core es un servicio externo real: en tests se mockea con Http::fake().
        config([
            'services.core_api.url' => 'https://core-fake.test',
            'services.core_api.token' => 'test-token',
        ]);

        Http::fake([
            'core-fake.test/api/personas/*' => Http::response([
                'id' => 1, 'nombres' => 'Juan', 'apellidos' => 'Pérez',
                'email' => 'juan@test.com', 'activo' => true,
            ], 200),
        ]);
    }

    public function test_reset_password_persiste_password_y_must_change_password(): void
    {
        $admin = User::factory()->create(['rol' => 'admin']);
        $objetivo = User::factory()->create(['rol' => 'digitador', 'must_change_password' => false]);
        $passwordAntes = $objetivo->password;

        $this->actingAs($admin)
            ->postJson("/api/usuarios/{$objetivo->id}/reset-password")
            ->assertOk();

        $objetivo->refresh();

        $this->assertNotSame($passwordAntes, $objetivo->password);
        $this->assertTrue($objetivo->must_change_password);
    }

    public function test_update_persiste_el_nuevo_rol(): void
    {
        $admin = User::factory()->create(['rol' => 'admin']);
        $objetivo = User::factory()->create(['rol' => 'digitador']);

        $this->actingAs($admin)
            ->putJson("/api/usuarios/{$objetivo->id}", ['rol' => 'admin'])
            ->assertOk();

        $this->assertSame('admin', $objetivo->fresh()->rol);
    }

    public function test_destroy_persiste_desactivacion(): void
    {
        $admin = User::factory()->create(['rol' => 'admin']);
        $objetivo = User::factory()->create(['rol' => 'digitador', 'activo' => true]);

        $this->actingAs($admin)
            ->deleteJson("/api/usuarios/{$objetivo->id}")
            ->assertOk();

        $this->assertFalse($objetivo->fresh()->activo);
    }

    public function test_reactivar_persiste_reactivacion(): void
    {
        $admin = User::factory()->create(['rol' => 'admin']);
        $objetivo = User::factory()->create(['rol' => 'digitador', 'activo' => false]);

        $this->actingAs($admin)
            ->postJson("/api/usuarios/{$objetivo->id}/reactivar")
            ->assertOk();

        $this->assertTrue($objetivo->fresh()->activo);
    }
}
