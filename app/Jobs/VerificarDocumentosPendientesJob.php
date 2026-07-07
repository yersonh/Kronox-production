<?php

namespace App\Jobs;

use App\Models\User;
use App\Notifications\RecordatorioDocumentosNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class VerificarDocumentosPendientesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(private int $userId) {}

    public function handle(): void
    {
        $user = User::find($this->userId);

        if (! $user || ! $user->persona_id) {
            return;
        }

        $faltantes = match ($user->rol) {
            'contratista' => $this->faltantesContratista($user),
            default       => $this->faltantesFuncionario($user),
        };

        if (empty($faltantes)) {
            return;
        }

        $user->notify(new RecordatorioDocumentosNotification($faltantes));
    }

    private function faltantesContratista(User $user): array
    {
        $contratista = $user->contratista;

        if (! $contratista) {
            return [];
        }

        $faltantes = [];

        if (! $user->fotoPersona?->foto_ruta) {
            $faltantes[] = 'Foto de perfil';
        }
        if (! $contratista->ruta_contrato_pdf) {
            $faltantes[] = 'Minuta del contrato';
        }
        if (! $contratista->ruta_rut)                    $faltantes[] = 'RUT';
        if (! $contratista->ruta_polizas)                $faltantes[] = 'Pólizas';
        if (! $contratista->ruta_paz_salvo_parafiscales) $faltantes[] = 'Paz y Salvo Parafiscales';
        if (! $contratista->ruta_seguridad_social)       $faltantes[] = 'Seguridad Social';
        if (! $contratista->ruta_arl)                    $faltantes[] = 'ARL';
        if (! $contratista->ruta_certificacion_bancaria) $faltantes[] = 'Certificación Bancaria';
        if (! $contratista->ruta_estudios_previos)       $faltantes[] = 'Estudios Previos';
        if (! $contratista->ruta_acta_inicio)            $faltantes[] = 'Acta de Inicio';
        if (! $contratista->ruta_registro_presupuestal)  $faltantes[] = 'Registro Presupuestal';
        if (! $contratista->ruta_resolucion_supervisor)  $faltantes[] = 'Resolución Supervisor';

        return $faltantes;
    }

    private function faltantesFuncionario(User $user): array
    {
        $funcionario = $user->funcionario;

        if (! $funcionario) {
            return [];
        }

        $faltantes = [];

        if (! $user->fotoPersona?->foto_ruta)    $faltantes[] = 'Foto de perfil';
        if (! $funcionario->ruta_contrato_pdf)   $faltantes[] = 'Minuta de vinculación';

        return $faltantes;
    }
}
