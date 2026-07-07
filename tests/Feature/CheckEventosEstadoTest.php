<?php

namespace Tests\Feature;

use App\Models\Evento;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckEventosEstadoTest extends TestCase
{
    use RefreshDatabase;

    private function crearEvento(array $attrs): Evento
    {
        $user = User::factory()->create(['rol' => 'digitador']);
        return Evento::create(array_merge([
            'numero'         => 'EVT-' . rand(1000, 9999),
            'tema'           => 'Evento test',
            'fecha_hora'     => now()->addDay(),
            'responsable_id' => 12345,
            'user_id'        => $user->id,
        ], $attrs));
    }

    // ─── programado → en_curso ───────────────────────────────────────────────

    public function test_evento_programado_pasado_pasa_a_en_curso(): void
    {
        $evento = $this->crearEvento([
            'estado'     => 'programado',
            'fecha_hora' => now()->subMinutes(5),
        ]);

        $this->artisan('eventos:check-estado')->assertExitCode(0);

        $this->assertEquals('en_curso', $evento->fresh()->estado);
    }

    public function test_evento_programado_futuro_no_cambia(): void
    {
        $evento = $this->crearEvento([
            'estado'     => 'programado',
            'fecha_hora' => now()->addHour(),
        ]);

        $this->artisan('eventos:check-estado')->assertExitCode(0);

        $this->assertEquals('programado', $evento->fresh()->estado);
    }

    public function test_evento_en_curso_no_se_auto_finaliza(): void
    {
        // El sistema NO auto-finaliza en_curso; eso lo hace el responsable
        $evento = $this->crearEvento([
            'estado'         => 'en_curso',
            'fecha_hora'     => now()->subHours(4),
            'fecha_hora_fin' => now()->subHours(2),
        ]);

        $this->artisan('eventos:check-estado')->assertExitCode(0);

        $this->assertEquals('en_curso', $evento->fresh()->estado);
    }

    // ─── en_curso → cerrado (medianoche, por abandono) ───────────────────────

    public function test_evento_en_curso_de_dia_anterior_pasa_a_cerrado(): void
    {
        // Nadie lo finalizó y su día ya terminó: se cierra a las 00:00.
        $evento = $this->crearEvento([
            'estado'         => 'en_curso',
            'fecha_hora'     => now()->subDays(2),
            'fecha_hora_fin' => now()->subDays(2)->addHours(2),
        ]);

        $this->artisan('eventos:check-estado')->assertExitCode(0);

        $this->assertEquals('cerrado', $evento->fresh()->estado);
    }

    public function test_evento_finalizado_reciente_no_se_cierra(): void
    {
        $evento = $this->crearEvento([
            'estado'        => 'finalizado',
            'fecha_hora'    => now()->subDay(),
            'finalizado_en' => now()->subHours(10),
        ]);

        $this->artisan('eventos:check-estado')->assertExitCode(0);

        $this->assertEquals('finalizado', $evento->fresh()->estado);
    }

    // ─── reactivación de aplazados y estados intocables ──────────────────────

    public function test_evento_aplazado_pasado_pasa_a_en_curso(): void
    {
        // Un evento aplazado se reactiva a en_curso cuando llega su nueva fecha.
        $evento = $this->crearEvento([
            'estado'     => 'aplazado',
            'fecha_hora' => now()->subHour(),
        ]);

        $this->artisan('eventos:check-estado')->assertExitCode(0);

        $this->assertEquals('en_curso', $evento->fresh()->estado);
    }

    public function test_cancelado_no_se_modifica(): void
    {
        $cancelado = $this->crearEvento([
            'estado'     => 'cancelado',
            'fecha_hora' => now()->subHour(),
        ]);

        $this->artisan('eventos:check-estado')->assertExitCode(0);

        $this->assertEquals('cancelado', $cancelado->fresh()->estado);
    }

    // ─── Múltiples eventos en una sola ejecución ─────────────────────────────

    public function test_comando_procesa_multiples_eventos(): void
    {
        $pasado1 = $this->crearEvento(['estado' => 'programado', 'fecha_hora' => now()->subHours(2)]);
        $pasado2 = $this->crearEvento(['estado' => 'programado', 'fecha_hora' => now()->subMinutes(30)]);
        $futuro  = $this->crearEvento(['estado' => 'programado', 'fecha_hora' => now()->addHours(2)]);

        $this->artisan('eventos:check-estado')->assertExitCode(0);

        $this->assertEquals('en_curso',  $pasado1->fresh()->estado);
        $this->assertEquals('en_curso',  $pasado2->fresh()->estado);
        $this->assertEquals('programado', $futuro->fresh()->estado);
    }
}
