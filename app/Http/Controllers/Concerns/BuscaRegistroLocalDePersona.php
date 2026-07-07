<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Contratista;
use App\Models\Funcionario;
use Illuminate\Http\Request;

trait BuscaRegistroLocalDePersona
{
    /**
     * Busca si una persona del Core ya tiene un Funcionario o Contratista local.
     * Ninguna de las dos tablas borra filas (destroy() solo desactiva el User),
     * así que cualquier fila encontrada es un duplicado real.
     */
    private function buscarRegistroLocalDePersona(int $personaId): ?array
    {
        if ($funcionario = Funcionario::where('persona_id', $personaId)->first()) {
            return ['tipo' => 'funcionario', 'id' => $funcionario->id];
        }

        if ($contratista = Contratista::where('persona_id', $personaId)->first()) {
            return ['tipo' => 'contratista', 'id' => $contratista->id];
        }

        return null;
    }

    /** URL de la lista donde se puede localizar el registro existente por cédula. */
    private function registroUrlLocal(string $tipo, string $numeroIdentificacion): string
    {
        $ruta = $tipo === 'contratista' ? '/admin/contratistas' : '/admin/funcionarios';

        return $ruta.'?search='.urlencode($numeroIdentificacion);
    }

    /**
     * Compara los campos de la persona ya existente en el Core contra lo enviado en el
     * request y devuelve solo los que estaban vacíos allá y ahora traen un valor —
     * los que ya tenían dato no se tocan (quedaron bloqueados en el frontend).
     * $mapeo: ['campo_request' => 'campo_persona_en_core'].
     */
    private function camposPersonaACompletar(?array $personaExistente, Request $request, array $mapeo): array
    {
        if (! $personaExistente) {
            return [];
        }

        $datos = [];
        foreach ($mapeo as $campoRequest => $campoPersona) {
            $enCore = $personaExistente[$campoPersona] ?? null;
            $enviado = $request->input($campoRequest);

            if (blank($enCore) && filled($enviado)) {
                $datos[$campoPersona] = $enviado;
            }
        }

        return $datos;
    }
}
