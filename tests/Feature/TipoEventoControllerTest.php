<?php

namespace Tests\Feature;

use App\Models\TipoEvento;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Regresión para el bug de route-model binding roto: apiResource('tipos-evento', ...)
 * generaba por defecto el wildcard {tipos_evento} (plural), que no coincidía con el
 * parámetro TipoEvento $tipoEvento de show(). El contenedor inyectaba un TipoEvento
 * vacío no guardado, y el endpoint respondía 200 con un objeto vacío en vez del
 * registro real. Se corrigió fijando el wildcard explícito a 'tipoEvento' en la ruta.
 */
class TipoEventoControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_show_devuelve_el_tipo_de_evento_solicitado(): void
    {
        $admin = User::factory()->create(['rol' => 'admin']);
        $tipoEvento = TipoEvento::create(['nombre' => 'Reunión de prueba', 'activo' => true]);

        $response = $this->actingAs($admin)
            ->getJson("/api/tipos-evento/{$tipoEvento->id}");

        $response->assertOk();
        $response->assertJson([
            'id' => $tipoEvento->id,
            'nombre' => 'Reunión de prueba',
            'activo' => true,
        ]);
    }
}
