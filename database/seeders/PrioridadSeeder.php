<?php

namespace Database\Seeders;

use App\Models\Prioridad;
use Illuminate\Database\Seeder;

class PrioridadSeeder extends Seeder
{
    public function run(): void
    {
        $prioridades = [
            ['nombre' => 'Urgente',     'dias_vencimiento' => 2,  'color' => '#EF4444'],
            ['nombre' => 'Prioritario', 'dias_vencimiento' => 3,  'color' => '#F97316'],
            ['nombre' => 'Importante',  'dias_vencimiento' => 5,  'color' => '#F59E0B'],
            ['nombre' => 'Informativo', 'dias_vencimiento' => 15, 'color' => '#3B82F6'],
            ['nombre' => 'Proyectado',  'dias_vencimiento' => 30, 'color' => '#10B981'],
        ];

        foreach ($prioridades as $p) {
            Prioridad::create($p);
        }
    }
}