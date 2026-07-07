<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // El orden importa: tablas sin dependencias primero
        $this->call([
            TipoEventoSeeder::class,    // sin dependencias
            PrioridadSeeder::class,     // sin dependencias
            PersonaSeeder::class,       // dependencias/sectores/niveles de cargo viven en el Core
            UserSeeder::class,          // depende de: personas
        ]);
    }
}