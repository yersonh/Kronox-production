<?php

namespace App\Http\Controllers\Concerns;

use App\Models\Contratista;
use App\Models\Funcionario;

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
}
