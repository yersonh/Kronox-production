<?php

namespace Database\Seeders;

use App\Models\Contratista;
use App\Models\Funcionario;
use App\Models\User;
use App\Services\CoreApiClient;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class PersonaSeeder extends Seeder
{
    public function run(): void
    {
        $core = app(CoreApiClient::class);

        $planeacion = $core->obtenerDependencias()->firstWhere('nombre', 'Oficina Asesora de Planeación');
        $gobierno   = $core->obtenerDependencias()->firstWhere('nombre', 'Secretaría de Gobierno Seguridad Y Convivencia');
        $nivel      = $core->obtenerNivelesCargo()->firstWhere('nombre', 'Profesional');

        // Funcionario de prueba
        $resultado1 = $core->buscarOCrearFuncionario([
            'nombres' => 'Carlos',
            'apellidos' => 'Rodríguez',
            'tipo_identificacion_id' => CoreApiClient::TIPOS_IDENTIFICACION['CC'],
            'numero_identificacion' => '12345678',
            'email' => 'carlos.rodriguez@alcaldia.gov.co',
            'telefono' => '3001234567',
            'whatsapp' => '3001234567',
        ], [
            'cargo' => 'Jefe de Planeación',
            'nivel_cargo_id' => $nivel['id'] ?? null,
            'dependencia_id' => $planeacion['id'] ?? null,
            'fecha_vinculacion' => '2020-01-15',
        ]);

        $persona1Id = $resultado1['persona']['id'];

        Funcionario::create([
            'persona_id' => $persona1Id,
            'core_funcionario_id' => $resultado1['funcionario']['id'],
            'cargo' => 'Jefe de Planeación',
            'nivel_cargo_id' => $nivel['id'] ?? null,
            'dependencia_id' => $planeacion['id'] ?? null,
            'fecha_vinculacion' => '2020-01-15',
        ]);
        User::create([
            'name'              => 'Carlos Rodríguez',
            'email'             => 'carlos.rodriguez@alcaldia.gov.co',
            'password'          => Hash::make('persona123'),
            'rol'               => 'funcionario',
            'persona_id'        => $persona1Id,
            'activo'            => true,
            'email_verified_at' => now(),
        ]);

        // Contratista de prueba
        $resultado2 = $core->buscarOCrearContratista([
            'nombres' => 'María',
            'apellidos' => 'López',
            'tipo_identificacion_id' => CoreApiClient::TIPOS_IDENTIFICACION['CC'],
            'numero_identificacion' => '87654321',
            'email' => 'maria.lopez@contrato.gov.co',
            'telefono' => '3109876543',
            'whatsapp' => '3109876543',
        ], [
            'dependencia_id' => $gobierno['id'] ?? null,
            'numero_contrato' => 'CTR-2026-001',
            'objeto_contrato' => 'Prestación de servicios profesionales para apoyar la gestión de la Secretaría de Gobierno',
            'fecha_inicio' => '2026-01-01',
            'fecha_fin' => '2026-12-31',
        ]);

        $persona2Id = $resultado2['persona']['id'];

        Contratista::create([
            'persona_id'      => $persona2Id,
            'core_contratista_id' => $resultado2['contratista']['id'],
            'dependencia_id'  => $gobierno['id'] ?? null,
            'numero_contrato' => 'CTR-2026-001',
            'objeto_contrato' => 'Prestación de servicios profesionales para apoyar la gestión de la Secretaría de Gobierno',
            'fecha_inicio'    => '2026-01-01',
            'fecha_fin'       => '2026-12-31',
        ]);
        User::create([
            'name'              => 'María López',
            'email'             => 'maria.lopez@contrato.gov.co',
            'password'          => Hash::make('persona123'),
            'rol'               => 'contratista',
            'persona_id'        => $persona2Id,
            'activo'            => true,
            'email_verified_at' => now(),
        ]);
    }
}
