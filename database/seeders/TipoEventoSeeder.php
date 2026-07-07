<?php

namespace Database\Seeders;

use App\Models\TipoEvento;
use Illuminate\Database\Seeder;

class TipoEventoSeeder extends Seeder
{
    public function run(): void
    {
        $tipos = [
            ['nombre' => 'Reunión'],
            ['nombre' => 'Citación'],
            ['nombre' => 'Comité'],
            ['nombre' => 'Visita de campo'],
            ['nombre' => 'Audiencia pública'],
            ['nombre' => 'Consejo de gobierno'],
        ];

        foreach ($tipos as $tipo) {
            TipoEvento::create($tipo);
        }
    }
}