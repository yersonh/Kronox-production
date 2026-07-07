<?php

namespace Database\Seeders;

use App\Models\Funcionario;
use App\Models\User;
use App\Services\CoreApiClient;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $core = app(CoreApiClient::class);

        $despacho    = $core->obtenerDependencias()->firstWhere('nombre', 'Despacho del Alcalde');
        $general     = $core->obtenerDependencias()->firstWhere('nombre', 'Secretaría General');
        $directivo   = $core->obtenerNivelesCargo()->firstWhere('nombre', 'Directivo');
        $asistencial = $core->obtenerNivelesCargo()->firstWhere('nombre', 'Asistencial');

        $crear = function (string $nombre, string $apellido, string $cedula, string $email, string $cargo, ?array $nivel, ?array $dependencia, string $password, string $rol) use ($core) {
            $resultado = $core->buscarOCrearFuncionario([
                'nombres' => $nombre,
                'apellidos' => $apellido,
                'tipo_identificacion_id' => CoreApiClient::TIPOS_IDENTIFICACION['CC'],
                'numero_identificacion' => $cedula,
                'email' => $email,
            ], [
                'cargo' => $cargo,
                'nivel_cargo_id' => $nivel['id'] ?? null,
                'dependencia_id' => $dependencia['id'] ?? null,
            ]);

            $personaId = $resultado['persona']['id'];

            Funcionario::create([
                'persona_id' => $personaId,
                'core_funcionario_id' => $resultado['funcionario']['id'],
                'cargo' => $cargo,
                'nivel_cargo_id' => $nivel['id'] ?? null,
                'dependencia_id' => $dependencia['id'] ?? null,
            ]);

            User::create([
                'name'       => "{$nombre} {$apellido}",
                'email'      => $email,
                'password'   => Hash::make($password),
                'rol'        => $rol,
                'persona_id' => $personaId,
                'activo'     => true,
                'email_verified_at' => now(),
            ]);
        };

        $crear('Super', 'Admin', '00000001', 'superadmin@saa.gov.co', 'Administrador del Sistema', $directivo, $despacho, 'superadmin123', 'super_admin');
        $crear('Administrador', 'Sistema', '00000002', 'admin@saa.gov.co', 'Administrador', $directivo, $general, 'admin123', 'admin');
        $crear('Digitador', 'Sistema', '00000003', 'digitador@saa.gov.co', 'Digitador', $asistencial, $general, 'digitador123', 'digitador');
    }
}
