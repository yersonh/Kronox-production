<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\BuscaRegistroLocalDePersona;
use App\Jobs\EnviarRecordatorioContrasenaJob;
use App\Jobs\VerificarDocumentosPendientesJob;
use App\Models\Funcionario;
use App\Models\PersonaFoto;
use App\Models\User;
use App\Notifications\CredencialesAccesoNotification;
use App\Rules\ArchivoPdf;
use App\Services\CoreApiClient;
use App\Services\FotoService;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FuncionarioController extends Controller
{
    use BuscaRegistroLocalDePersona;

    /** Roles que gestionan funcionarios. */
    private function esGestor(Request $request): bool
    {
        return in_array($request->user()->rol, ['admin', 'super_admin', 'digitador'], true);
    }

    /** Solo administradores (crear/eliminar usuarios es la operación más sensible). */
    private function esAdmin(Request $request): bool
    {
        return in_array($request->user()->rol, ['admin', 'super_admin'], true);
    }

    private function denegarSiNoEsGestor(Request $request)
    {
        return $this->esGestor($request) ? null : response()->json(['message' => 'No autorizado'], 403);
    }

    private function denegarSiNoEsAdmin(Request $request)
    {
        return $this->esAdmin($request) ? null : response()->json(['message' => 'No autorizado'], 403);
    }

    /** Adjunta persona/dependencia/sector/nivel de cargo (datos del Core) como atributos planos. */
    private function conDatosCore(Funcionario $funcionario): Funcionario
    {
        $core = app(CoreApiClient::class);

        $persona = $funcionario->persona_id ? $core->obtenerPersona($funcionario->persona_id) : null;
        $funcionario->setAttribute('persona', $this->conFoto($persona, $funcionario->foto));
        $funcionario->setAttribute('dependencia', $funcionario->dependencia_id ? $core->obtenerDependencias()->get($funcionario->dependencia_id) : null);
        $funcionario->setAttribute('sector', $funcionario->sector_id ? $core->obtenerSectores()->get($funcionario->sector_id) : null);
        $funcionario->setAttribute('nivelCargo', $funcionario->nivel_cargo_id ? $core->obtenerNivelesCargo()->get($funcionario->nivel_cargo_id) : null);

        return $funcionario;
    }

    /** Fusiona foto_url/foto_thumbnail_url/tiene_foto (tabla satélite persona_fotos) en el array de persona. */
    private function conFoto(?array $persona, ?PersonaFoto $foto): ?array
    {
        if (! $persona) {
            return null;
        }

        return array_merge($persona, [
            'foto_url' => $foto?->foto_url,
            'foto_thumbnail_url' => $foto?->foto_thumbnail_url,
            'tiene_foto' => (bool) $foto?->foto_ruta,
        ]);
    }

    public function index(Request $request)
    {
        if ($denegado = $this->denegarSiNoEsGestor($request)) {
            return $denegado;
        }

        $perPage = $request->integer('per_page', 15);

        $query = Funcionario::query()->with('foto')->latest();

        if ($request->dependencia_id) {
            $query->where('dependencia_id', $request->dependencia_id);
        }
        if ($request->sector_id) {
            $query->where('sector_id', $request->sector_id);
        }

        $funcionarios = $query->get();

        $core = app(CoreApiClient::class);
        $personas = $core->buscarPersonasPorIds($funcionarios->pluck('persona_id')->all());

        $usuariosActivos = $request->boolean('invitables')
            ? User::whereIn('persona_id', $funcionarios->pluck('persona_id'))->where('activo', true)->pluck('persona_id')
            : null;

        $items = $funcionarios
            ->map(function ($f) use ($personas, $core) {
                $f->setAttribute('persona', $this->conFoto($personas->get($f->persona_id), $f->foto));
                $f->setAttribute('dependencia', $f->dependencia_id ? $core->obtenerDependencias()->get($f->dependencia_id) : null);
                $f->setAttribute('sector', $f->sector_id ? $core->obtenerSectores()->get($f->sector_id) : null);
                $f->setAttribute('nivelCargo', $f->nivel_cargo_id ? $core->obtenerNivelesCargo()->get($f->nivel_cargo_id) : null);

                return $f;
            })
            ->filter(fn ($f) => $f->persona && ($f->persona['activo'] ?? true))
            ->when($usuariosActivos, fn (Collection $col) => $col->filter(fn ($f) => $usuariosActivos->contains($f->persona_id)))
            ->when($request->search, function (Collection $col) use ($request) {
                $q = mb_strtolower($request->search);

                return $col->filter(function ($f) use ($q) {
                    $nombre = mb_strtolower(trim(($f->persona['nombres'] ?? '').' '.($f->persona['apellidos'] ?? '')));
                    $cedula = mb_strtolower((string) ($f->persona['numero_identificacion'] ?? ''));

                    return str_contains($nombre, $q) || str_contains($cedula, $q);
                });
            })
            ->values();

        $total = $items->count();
        $page = max(1, $request->integer('page', 1));
        $paginated = $items->slice(($page - 1) * $perPage, $perPage)->values();

        return response()->json([
            'data' => $paginated,
            'total' => $total,
            'per_page' => $perPage,
            'current_page' => $page,
            'last_page' => max(1, (int) ceil($total / $perPage)),
        ]);
    }

    public function store(Request $request)
    {
        // Crear funcionarios crea cuentas de usuario con rol asignable (incl. admin):
        // solo administradores pueden hacerlo, para evitar escalada de privilegios.
        if ($denegado = $this->denegarSiNoEsAdmin($request)) {
            return $denegado;
        }

        $request->validate([
            'nombre' => 'required|string|max:255',
            'apellido' => 'required|string|max:255',
            'cedula' => 'required|string',
            'tipo_identificacion' => 'nullable|in:CC,CE,TI,PA,RC,PEP',
            'email' => 'required|email|unique:users,email',
            'telefono' => 'nullable|string|max:20',
            'whatsapp' => 'nullable|string|max:20',
            'dependencia_id' => 'required|integer',
            'sector_id' => 'nullable|integer',
            'cargo' => 'required|string|max:255',
            'nivel_cargo_id' => 'nullable|integer',
            'fecha_vinculacion' => 'nullable|date',
            'rol' => 'required|in:super_admin,admin,digitador,funcionario,supervisor_contratos',
        ]);

        $core = app(CoreApiClient::class);

        // Defensa en profundidad: el frontend ya bloquea este caso, pero se re-valida
        // aquí por si alguien llama al endpoint directamente sin pasar por la UI.
        $tipoIdentificacionId = CoreApiClient::TIPOS_IDENTIFICACION[$request->tipo_identificacion ?? 'CC'];
        $personaExistente = $core->buscarPersona($tipoIdentificacionId, $request->cedula);

        if ($personaExistente) {
            $registro = $this->buscarRegistroLocalDePersona($personaExistente['id']);

            if ($registro) {
                return response()->json([
                    'message' => "Esta persona ya está registrada como {$registro['tipo']} en Kronox.",
                    'tipo_registro' => $registro['tipo'],
                    'registro_id' => $registro['id'],
                    'registro_url' => $this->registroUrlLocal($registro['tipo'], $request->cedula),
                ], 422);
            }
        }

        // Solo se completan en el Core los campos que la persona tenía vacíos: los que ya
        // tenían dato quedaron bloqueados en el frontend y no deben sobrescribirse aquí.
        $datosActualizarPersona = $this->camposPersonaACompletar($personaExistente, $request, [
            'nombre' => 'nombres', 'apellido' => 'apellidos', 'email' => 'email',
            'telefono' => 'telefono', 'whatsapp' => 'whatsapp',
        ]);

        return DB::transaction(function () use ($request, $core, $datosActualizarPersona) {
            $resultado = $core->buscarOCrearFuncionario([
                'nombres' => $request->nombre,
                'apellidos' => $request->apellido,
                'tipo_identificacion_id' => CoreApiClient::TIPOS_IDENTIFICACION[$request->tipo_identificacion ?? 'CC'],
                'numero_identificacion' => $request->cedula,
                'email' => $request->email,
                'telefono' => $request->telefono,
                'whatsapp' => $request->whatsapp,
            ], [
                'dependencia_id' => $request->dependencia_id,
                'sector_id' => $request->sector_id,
                'cargo' => $request->cargo,
                'nivel_cargo_id' => $request->nivel_cargo_id,
                'fecha_vinculacion' => $request->fecha_vinculacion,
            ]);

            $personaId = $resultado['persona']['id'];
            $coreFuncionarioId = $resultado['funcionario']['id'];

            $avisoActualizacionPersona = null;
            if (! empty($datosActualizarPersona)) {
                try {
                    $core->actualizarPersona($personaId, $datosActualizarPersona);
                } catch (\Throwable $e) {
                    $avisoActualizacionPersona = 'El funcionario se creó, pero los datos complementarios de la persona no se pudieron guardar.';
                }
            }

            $funcionario = Funcionario::create([
                'persona_id' => $personaId,
                'core_funcionario_id' => $coreFuncionarioId,
                'cargo' => $request->cargo,
                'nivel_cargo_id' => $request->nivel_cargo_id,
                'dependencia_id' => $request->dependencia_id,
                'sector_id' => $request->sector_id,
                'fecha_vinculacion' => $request->fecha_vinculacion,
            ]);

            $password = Str::password(12);

            $user = User::create([
                'name' => "{$request->nombre} {$request->apellido}",
                'email' => $request->email,
                'password' => $password,
                'rol' => $request->rol,
                'persona_id' => $personaId,
                'activo' => true,
                'email_verified_at' => now(),
                'must_change_password' => true,
            ]);

            $user->notify(new CredencialesAccesoNotification($password));

            EnviarRecordatorioContrasenaJob::dispatch($user->id)->delay(now()->addHours(8));
            EnviarRecordatorioContrasenaJob::dispatch($user->id)->delay(now()->addHours(16));

            VerificarDocumentosPendientesJob::dispatch($user->id)->delay(now()->addHours(24));
            VerificarDocumentosPendientesJob::dispatch($user->id)->delay(now()->addHours(72));
            VerificarDocumentosPendientesJob::dispatch($user->id)->delay(now()->addDays(7));

            $funcionario->setAttribute('aviso', $avisoActualizacionPersona);

            return response()->json($this->conDatosCore($funcionario), 201);
        });
    }

    public function show(Request $request, Funcionario $funcionario)
    {
        $esDueno = $request->user()->persona_id === $funcionario->persona_id;
        if (! $this->esGestor($request) && ! $esDueno) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        return response()->json($this->conDatosCore($funcionario));
    }

    public function update(Request $request, Funcionario $funcionario)
    {
        if ($denegado = $this->denegarSiNoEsGestor($request)) {
            return $denegado;
        }

        $request->validate([
            'nombre' => 'required|string|max:255',
            'apellido' => 'required|string|max:255',
            'cedula' => 'required|string',
            'tipo_identificacion' => 'nullable|in:CC,CE,TI,PA,RC,PEP',
            'email' => 'required|email',
            'telefono' => 'nullable|string|max:20',
            'whatsapp' => 'nullable|string|max:20',
            'direccion' => 'nullable|string|max:255',
            'municipio' => 'nullable|string|max:255',
            'dependencia_id' => 'required|integer',
            'sector_id' => 'nullable|integer',
            'cargo' => 'required|string|max:255',
            'nivel_cargo_id' => 'nullable|integer',
            'fecha_vinculacion' => 'nullable|date',
        ]);

        $core = app(CoreApiClient::class);

        $datosPersona = [
            'nombres' => $request->nombre,
            'apellidos' => $request->apellido,
            'tipo_identificacion_id' => CoreApiClient::TIPOS_IDENTIFICACION[$request->tipo_identificacion ?? 'CC'],
            'numero_identificacion' => $request->cedula,
            'email' => $request->email,
            'telefono' => $request->telefono,
            'whatsapp' => $request->whatsapp,
            'direccion' => $request->direccion,
            'municipio' => $request->municipio,
        ];
        $datosFuncionario = $request->only(['dependencia_id', 'sector_id', 'cargo', 'nivel_cargo_id', 'fecha_vinculacion']);

        if ($funcionario->persona_id) {
            try {
                $core->actualizarPersona($funcionario->persona_id, $datosPersona);
            } catch (RequestException $e) {
                if ($e->response->status() === 422) {
                    return response()->json(
                        $e->response->json() ?? ['message' => 'El tipo y número de identificación ya pertenecen a otra persona'],
                        422
                    );
                }
                throw $e;
            }
        }

        if ($funcionario->core_funcionario_id) {
            $core->actualizarFuncionario($funcionario->core_funcionario_id, $datosFuncionario);
        }

        $funcionario->update($datosFuncionario);

        return response()->json($this->conDatosCore($funcionario));
    }

    public function destroy(Request $request, Funcionario $funcionario)
    {
        if ($denegado = $this->denegarSiNoEsAdmin($request)) {
            return $denegado;
        }

        User::where('persona_id', $funcionario->persona_id)->update(['activo' => false]);

        return response()->json(['message' => 'Funcionario desactivado']);
    }

    public function subirMinuta(Request $request, Funcionario $funcionario)
    {
        if ($denegado = $this->denegarSiNoEsGestor($request)) {
            return $denegado;
        }

        $request->validate([
            'minuta_pdf' => ['required', 'file', 'max:51200', new ArchivoPdf],
        ]);

        $archivo = $request->file('minuta_pdf');
        $anio = now()->format('Y');
        $mes = now()->format('m');
        $timestamp = now()->timestamp;
        $rutaNueva = "{$anio}/{$mes}/funcionario_{$funcionario->id}_{$timestamp}.pdf";

        if ($funcionario->ruta_contrato_pdf) {
            $this->hacerBackupMinuta($funcionario->ruta_contrato_pdf);
        }

        Storage::disk('contratos')->put($rutaNueva, file_get_contents($archivo->getRealPath()));

        $funcionario->update([
            'ruta_contrato_pdf' => $rutaNueva,
            'nombre_original_pdf' => $archivo->getClientOriginalName(),
            'tamano_pdf_bytes' => $archivo->getSize(),
            'fecha_carga_pdf' => now(),
        ]);

        return response()->json($this->conDatosCore($funcionario->fresh()));
    }

    public function descargarMinuta(Request $request, Funcionario $funcionario)
    {
        $esDueno = $request->user()->persona_id === $funcionario->persona_id;
        if (! $this->esGestor($request) && ! $esDueno) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if (! $funcionario->ruta_contrato_pdf || ! Storage::disk('contratos')->exists($funcionario->ruta_contrato_pdf)) {
            return response()->json(['message' => 'Minuta no encontrada'], 404);
        }

        $nombreDescarga = $funcionario->nombre_original_pdf ?? 'minuta_contrato.pdf';
        $contenido = Storage::disk('contratos')->get($funcionario->ruta_contrato_pdf);

        return $this->descargaPdf($contenido, $nombreDescarga);
    }

    public function subirFoto(Request $request, Funcionario $funcionario)
    {
        if ($denegado = $this->denegarSiNoEsGestor($request)) {
            return $denegado;
        }

        $request->validate([
            'foto' => 'required|file|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        (new FotoService)->guardarFoto($request->file('foto'), $funcionario->persona_id);

        return response()->json($this->conDatosCore($funcionario));
    }

    private function hacerBackupMinuta(string $ruta): void
    {
        if (! Storage::disk('contratos')->exists($ruta)) {
            return;
        }

        $dir = dirname($ruta);
        $nombre = pathinfo($ruta, PATHINFO_FILENAME);
        $backupRuta = "backups/{$dir}/{$nombre}_backup_".now()->timestamp.'.pdf';

        Storage::disk('contratos')->copy($ruta, $backupRuta);
        Storage::disk('contratos')->delete($ruta);
    }
}
