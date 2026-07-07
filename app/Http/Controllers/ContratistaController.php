<?php

namespace App\Http\Controllers;

use App\Jobs\EnviarRecordatorioContrasenaJob;
use App\Jobs\VerificarDocumentosPendientesJob;
use App\Models\Contratista;
use App\Models\ContratistaRenovacionDocumento;
use App\Models\User;
use App\Notifications\ContratoRenovadoNotification;
use App\Notifications\ContratoSuspendidoNotification;
use App\Notifications\CredencialesAccesoNotification;
use App\Rules\ArchivoPdf;
use App\Services\CoreApiClient;
use App\Services\FotoService;
use App\Services\PdfApiService;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ContratistaController extends Controller
{
    /** Roles que pueden gestionar contratistas y ver/editar sus documentos. */
    private function esGestor(Request $request): bool
    {
        return in_array($request->user()->rol, ['admin', 'super_admin', 'digitador', 'supervisor_contratos'], true);
    }

    /** Bloquea a quien no sea gestor. Devuelve respuesta 403 o null. */
    private function denegarSiNoEsGestor(Request $request)
    {
        if (! $this->esGestor($request)) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        return null;
    }

    /** Permite a gestores o al propio contratista dueño del recurso. Devuelve respuesta 403 o null. */
    private function denegarSiNoPuedeVer(Request $request, Contratista $contratista)
    {
        $esDueno = $request->user()->persona_id === $contratista->persona_id;

        if (! $this->esGestor($request) && ! $esDueno) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        return null;
    }

    /** Adjunta persona/dependencia/sector (datos del Core) a un contratista como atributos planos. */
    private function conDatosCore(Contratista $contratista): Contratista
    {
        $core = app(CoreApiClient::class);

        $contratista->setAttribute('persona', $contratista->persona_id ? $core->obtenerPersona($contratista->persona_id) : null);
        $contratista->setAttribute('dependencia', $contratista->dependencia_id ? $core->obtenerDependencias()->get($contratista->dependencia_id) : null);
        $contratista->setAttribute('sector', $contratista->sector_id ? $core->obtenerSectores()->get($contratista->sector_id) : null);

        return $contratista;
    }

    public function index(Request $request)
    {
        if ($denegado = $this->denegarSiNoEsGestor($request)) {
            return $denegado;
        }

        $perPage = $request->integer('per_page', 10);

        $query = Contratista::query()
            ->when($request->dependencia_id, fn ($q) => $q->orderByDesc('es_lider'))
            ->latest();

        if ($request->dependencia_id) {
            $query->where('dependencia_id', $request->dependencia_id);
        }
        if ($request->sector_id) {
            $query->where('sector_id', $request->sector_id);
        }
        if ($request->boolean('solo_lideres')) {
            $query->where('es_lider', true);
        }
        if ($request->estado_contrato) {
            $query->where('estado_contrato', $request->estado_contrato);
        }
        if ($request->boolean('invitables')) {
            $query->whereNotIn('estado_contrato', ['vencido', 'suspendido']);
        }

        $contratistas = $query->get();

        $core = app(CoreApiClient::class);
        $personas = $core->buscarPersonasPorIds($contratistas->pluck('persona_id')->all());

        $usuariosActivos = $request->boolean('invitables')
            ? User::whereIn('persona_id', $contratistas->pluck('persona_id'))->where('activo', true)->pluck('persona_id')
            : null;

        $items = $contratistas
            ->map(function ($c) use ($personas, $core) {
                $c->setAttribute('persona', $personas->get($c->persona_id));
                $c->setAttribute('dependencia', $c->dependencia_id ? $core->obtenerDependencias()->get($c->dependencia_id) : null);
                $c->setAttribute('sector', $c->sector_id ? $core->obtenerSectores()->get($c->sector_id) : null);
                return $c;
            })
            ->filter(fn ($c) => $c->persona && ($c->persona['activo'] ?? true))
            ->when($usuariosActivos, fn (Collection $col) => $col->filter(fn ($c) => $usuariosActivos->contains($c->persona_id)))
            ->when($request->search, function (Collection $col) use ($request) {
                $q = mb_strtolower($request->search);
                return $col->filter(function ($c) use ($q) {
                    $nombre = mb_strtolower(trim(($c->persona['nombres'] ?? '') . ' ' . ($c->persona['apellidos'] ?? '')));
                    $cedula = mb_strtolower((string) ($c->persona['numero_identificacion'] ?? ''));
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
        if ($denegado = $this->denegarSiNoEsGestor($request)) {
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
            'dependencia_id' => 'nullable|integer',
            'sector_id' => 'nullable|integer',
            'numero_contrato' => 'nullable|string|max:100',
            'objeto_contrato' => 'nullable|string',
            'fecha_inicio' => 'nullable|date',
            'fecha_fin' => 'nullable|date|after_or_equal:fecha_inicio',
            'es_lider' => 'nullable|boolean',
        ]);

        $core = app(CoreApiClient::class);

        return DB::transaction(function () use ($request, $core) {
            $resultado = $core->buscarOCrearContratista([
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
                'numero_contrato' => $request->numero_contrato,
                'objeto_contrato' => $request->objeto_contrato,
                'fecha_inicio' => $request->fecha_inicio,
                'fecha_fin' => $request->fecha_fin,
            ]);

            $personaId = $resultado['persona']['id'];
            $coreContratistaId = $resultado['contratista']['id'];

            $esLider = $request->boolean('es_lider') && $request->dependencia_id;

            if ($esLider) {
                Contratista::where('dependencia_id', $request->dependencia_id)
                    ->where('es_lider', true)
                    ->update(['es_lider' => false]);
            }

            $contratista = Contratista::create([
                'persona_id' => $personaId,
                'core_contratista_id' => $coreContratistaId,
                'dependencia_id' => $request->dependencia_id,
                'sector_id' => $request->sector_id,
                'numero_contrato' => $request->numero_contrato,
                'objeto_contrato' => $request->objeto_contrato,
                'fecha_inicio' => $request->fecha_inicio,
                'fecha_fin' => $request->fecha_fin,
                'es_lider' => $esLider,
            ]);

            $password = Str::password(12);

            $user = User::create([
                'name' => "{$request->nombre} {$request->apellido}",
                'email' => $request->email,
                'password' => $password,
                'rol' => 'contratista',
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

            return response()->json($this->conDatosCore($contratista), 201);
        });
    }

    public function show(Request $request, Contratista $contratista)
    {
        if ($denegado = $this->denegarSiNoPuedeVer($request, $contratista)) {
            return $denegado;
        }

        return response()->json($this->conDatosCore($contratista));
    }

    public function update(Request $request, Contratista $contratista)
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
            'dependencia_id' => 'nullable|integer',
            'sector_id' => 'nullable|integer',
            'numero_contrato' => 'nullable|string|max:100',
            'objeto_contrato' => 'nullable|string',
            'fecha_inicio' => 'nullable|date',
            'fecha_fin' => 'nullable|date|after_or_equal:fecha_inicio',
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
        $datosContratista = $request->only([
            'dependencia_id', 'sector_id', 'numero_contrato', 'objeto_contrato', 'fecha_inicio', 'fecha_fin',
        ]);

        if ($contratista->persona_id) {
            try {
                $core->actualizarPersona($contratista->persona_id, $datosPersona);
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

        if ($contratista->core_contratista_id) {
            $core->actualizarContratista($contratista->core_contratista_id, $datosContratista);
        }

        $contratista->update($datosContratista);

        return response()->json($this->conDatosCore($contratista));
    }

    public function destroy(Request $request, Contratista $contratista)
    {
        if ($denegado = $this->denegarSiNoEsGestor($request)) {
            return $denegado;
        }

        User::where('persona_id', $contratista->persona_id)->update(['activo' => false]);

        return response()->json(['message' => 'Contratista desactivado']);
    }

    private const DOCUMENTOS = [
        'estudios-previos' => ['ruta_estudios_previos',          'nombre_estudios_previos'],
        'rut' => ['ruta_rut',                       'nombre_rut'],
        'polizas' => ['ruta_polizas',                'nombre_polizas'],
        'paz-salvo-parafiscales' => ['ruta_paz_salvo_parafiscales',    'nombre_paz_salvo_parafiscales'],
        'seguridad-social' => ['ruta_seguridad_social',          'nombre_seguridad_social'],
        'arl' => ['ruta_arl',                       'nombre_arl'],
        'acta-inicio' => ['ruta_acta_inicio',               'nombre_acta_inicio'],
        'certificacion-bancaria' => ['ruta_certificacion_bancaria',    'nombre_certificacion_bancaria'],
        'registro-presupuestal' => ['ruta_registro_presupuestal',     'nombre_registro_presupuestal'],
        'resolucion-supervisor' => ['ruta_resolucion_supervisor',     'nombre_resolucion_supervisor'],
    ];

    public function subirMinuta(Request $request, Contratista $contratista)
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
        $rutaNueva = "{$anio}/{$mes}/contratista_{$contratista->id}_".now()->timestamp.'.pdf';

        if ($contratista->ruta_contrato_pdf) {
            $this->hacerBackupArchivo($contratista->ruta_contrato_pdf);
        }

        Storage::disk('contratos')->put($rutaNueva, file_get_contents($archivo->getRealPath()));

        $contratista->update([
            'ruta_contrato_pdf' => $rutaNueva,
            'nombre_original_pdf' => $archivo->getClientOriginalName(),
            'tamano_pdf_bytes' => $archivo->getSize(),
            'fecha_carga_pdf' => now(),
        ]);

        if ($request->renovacion_id) {
            ContratistaRenovacionDocumento::updateOrCreate(
                ['contratista_id' => $contratista->id, 'core_renovacion_id' => $request->renovacion_id, 'tipo' => 'minuta'],
                ['ruta' => $rutaNueva, 'nombre_original' => $archivo->getClientOriginalName()]
            );
        }

        $this->extraerDatosMinuta($contratista, $rutaNueva, $archivo->getClientOriginalName());

        return response()->json($this->conDatosCore($contratista->fresh()));
    }

    public function subirDocumento(Request $request, Contratista $contratista, string $tipo)
    {
        if ($denegado = $this->denegarSiNoEsGestor($request)) {
            return $denegado;
        }

        if (! array_key_exists($tipo, self::DOCUMENTOS)) {
            return response()->json(['message' => 'Tipo de documento inválido'], 422);
        }

        $request->validate(['archivo' => ['required', 'file', 'max:51200', new ArchivoPdf]]);

        [$rutaCol, $nombreCol] = self::DOCUMENTOS[$tipo];
        $archivo = $request->file('archivo');
        $anio = now()->format('Y');
        $mes = now()->format('m');
        $rutaNueva = "{$anio}/{$mes}/contratista_{$contratista->id}_{$tipo}_".now()->timestamp.'.pdf';

        if ($contratista->$rutaCol) {
            $this->hacerBackupArchivo($contratista->$rutaCol);
        }

        Storage::disk('contratos')->put($rutaNueva, file_get_contents($archivo->getRealPath()));
        $contratista->update([$rutaCol => $rutaNueva, $nombreCol => $archivo->getClientOriginalName()]);

        if ($request->renovacion_id && $tipo === 'acta-inicio') {
            ContratistaRenovacionDocumento::updateOrCreate(
                ['contratista_id' => $contratista->id, 'core_renovacion_id' => $request->renovacion_id, 'tipo' => 'acta_inicio'],
                ['ruta' => $rutaNueva, 'nombre_original' => $archivo->getClientOriginalName()]
            );
        }

        if ($tipo === 'resolucion-supervisor') {
            $this->extraerDatosSupervisor($contratista, $rutaNueva, $archivo->getClientOriginalName());
        }

        return response()->json($this->conDatosCore($contratista->fresh()));
    }

    public function descargarDocumento(Request $request, Contratista $contratista, string $tipo)
    {
        if ($denegado = $this->denegarSiNoPuedeVer($request, $contratista)) {
            return $denegado;
        }

        if (! array_key_exists($tipo, self::DOCUMENTOS)) {
            return response()->json(['message' => 'Tipo de documento inválido'], 422);
        }

        [$rutaCol, $nombreCol] = self::DOCUMENTOS[$tipo];

        if (! $contratista->$rutaCol || ! Storage::disk('contratos')->exists($contratista->$rutaCol)) {
            return response()->json(['message' => 'Documento no encontrado'], 404);
        }

        $contenido = Storage::disk('contratos')->get($contratista->$rutaCol);

        return $this->descargaPdf($contenido, $contratista->$nombreCol ?? "{$tipo}.pdf");
    }

    public function descargarMinuta(Request $request, Contratista $contratista)
    {
        if ($denegado = $this->denegarSiNoPuedeVer($request, $contratista)) {
            return $denegado;
        }

        if (! $contratista->ruta_contrato_pdf || ! Storage::disk('contratos')->exists($contratista->ruta_contrato_pdf)) {
            return response()->json(['message' => 'Minuta no encontrada'], 404);
        }

        $nombreDescarga = $contratista->nombre_original_pdf ?? 'minuta_contrato.pdf';
        $contenido = Storage::disk('contratos')->get($contratista->ruta_contrato_pdf);

        return $this->descargaPdf($contenido, $nombreDescarga);
    }

    public function eliminarDocumento(Request $request, Contratista $contratista, string $tipo)
    {
        if ($denegado = $this->denegarSiNoEsGestor($request)) {
            return $denegado;
        }

        if (! array_key_exists($tipo, self::DOCUMENTOS)) {
            return response()->json(['message' => 'Tipo de documento inválido'], 422);
        }

        [$rutaCol, $nombreCol] = self::DOCUMENTOS[$tipo];

        if ($contratista->$rutaCol && Storage::disk('contratos')->exists($contratista->$rutaCol)) {
            Storage::disk('contratos')->delete($contratista->$rutaCol);
        }

        $contratista->update([$rutaCol => null, $nombreCol => null]);

        return response()->json($this->conDatosCore($contratista));
    }

    public function eliminarMinuta(Request $request, Contratista $contratista)
    {
        if ($denegado = $this->denegarSiNoEsGestor($request)) {
            return $denegado;
        }

        if ($contratista->ruta_contrato_pdf && Storage::disk('contratos')->exists($contratista->ruta_contrato_pdf)) {
            Storage::disk('contratos')->delete($contratista->ruta_contrato_pdf);
        }

        $contratista->update([
            'ruta_contrato_pdf' => null,
            'nombre_original_pdf' => null,
            'tamano_pdf_bytes' => null,
            'fecha_carga_pdf' => null,
        ]);

        return response()->json($this->conDatosCore($contratista));
    }

    public function subirFoto(Request $request, Contratista $contratista)
    {
        if ($denegado = $this->denegarSiNoEsGestor($request)) {
            return $denegado;
        }

        $request->validate([
            'foto' => 'required|file|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        (new FotoService)->guardarFoto($request->file('foto'), $contratista->persona_id);

        return response()->json($this->conDatosCore($contratista));
    }

    public function renovar(Request $request, Contratista $contratista)
    {
        if ($request->user()->rol !== 'supervisor_contratos') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $request->validate([
            'tipo' => 'required|in:prorroga,adicion,nuevo_contrato',
            'fecha_inicio_nueva' => 'required|date',
            'fecha_fin_nueva' => 'required|date|after:fecha_inicio_nueva',
            'numero_nuevo' => 'nullable|string|max:100',
            'valor_adicion' => 'nullable|numeric|min:0',
            'motivo' => 'required|string|max:1000',
        ]);

        $core = app(CoreApiClient::class);

        $renovacion = DB::transaction(function () use ($request, $contratista, $core) {
            $renovacion = $core->crearRenovacionContrato($contratista->core_contratista_id, [
                'tipo' => $request->tipo,
                'numero_anterior' => $contratista->numero_contrato,
                'fecha_inicio_anterior' => $contratista->fecha_inicio,
                'fecha_fin_anterior' => $contratista->fecha_fin,
                'numero_nuevo' => $request->numero_nuevo,
                'fecha_inicio_nueva' => $request->fecha_inicio_nueva,
                'fecha_fin_nueva' => $request->fecha_fin_nueva,
                'valor_adicion' => $request->valor_adicion,
                'motivo' => $request->motivo,
                'renovado_por' => $request->user()->id,
            ]);

            $contratista->update([
                'fecha_inicio' => $request->fecha_inicio_nueva,
                'fecha_fin' => $request->fecha_fin_nueva,
                'numero_contrato' => $request->numero_nuevo ?? $contratista->numero_contrato,
                'estado_contrato' => 'vigente',
                'notificado_30d' => false,
                'notificado_15d' => false,
                'notificado_7d' => false,
                'motivo_suspension' => null,
            ]);

            if ($user = User::where('persona_id', $contratista->persona_id)->first()) {
                if (! $user->activo) {
                    $user->update(['activo' => true]);
                }
                $user->notify(new ContratoRenovadoNotification($contratista, $renovacion));
            }

            return $renovacion;
        });

        return response()->json([
            'contratista' => $this->conDatosCore($contratista->fresh()),
            'renovacion' => $renovacion,
        ]);
    }

    public function suspender(Request $request, Contratista $contratista)
    {
        if ($request->user()->rol !== 'supervisor_contratos') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $request->validate([
            'motivo' => 'required|string|max:1000',
        ]);

        DB::transaction(function () use ($request, $contratista) {
            $contratista->update([
                'estado_contrato' => 'suspendido',
                'motivo_suspension' => $request->motivo,
            ]);

            if ($user = User::where('persona_id', $contratista->persona_id)->first()) {
                $user->update(['activo' => false]);
                $user->notify(new ContratoSuspendidoNotification($contratista, $request->motivo));
            }
        });

        return response()->json($this->conDatosCore($contratista->fresh()));
    }

    public function reactivar(Request $request, Contratista $contratista)
    {
        if ($request->user()->rol !== 'supervisor_contratos') {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        if ($contratista->estado_contrato !== 'suspendido') {
            return response()->json(['message' => 'Solo se pueden reactivar contratos suspendidos'], 422);
        }

        DB::transaction(function () use ($contratista) {
            $hoy = now()->startOfDay();
            $dias = $contratista->fecha_fin ? (int) $hoy->diffInDays($contratista->fecha_fin, false) : 999;

            $nuevoEstado = match (true) {
                $dias < 0 => 'vencido',
                $dias <= 30 => 'por_vencer',
                default => 'vigente',
            };

            $contratista->update([
                'estado_contrato' => $nuevoEstado,
                'motivo_suspension' => null,
            ]);

            if ($nuevoEstado !== 'vencido') {
                User::where('persona_id', $contratista->persona_id)->update(['activo' => true]);
            }
        });

        return response()->json($this->conDatosCore($contratista->fresh()));
    }

    public function descargarDocumentoRenovacion(Request $request, Contratista $contratista, int $renovacion, string $tipo)
    {
        if ($denegado = $this->denegarSiNoPuedeVer($request, $contratista)) {
            return $denegado;
        }

        $tipoDoc = match ($tipo) {
            'minuta' => 'minuta',
            'acta-inicio' => 'acta_inicio',
            default => null,
        };

        $documento = $tipoDoc
            ? ContratistaRenovacionDocumento::where('contratista_id', $contratista->id)
                ->where('core_renovacion_id', $renovacion)
                ->where('tipo', $tipoDoc)
                ->first()
            : null;

        if (! $documento || ! Storage::disk('contratos')->exists($documento->ruta)) {
            return response()->json(['message' => 'Documento no encontrado'], 404);
        }

        return $this->descargaPdf(
            Storage::disk('contratos')->get($documento->ruta),
            $documento->nombre_original ?? "{$tipo}.pdf"
        );
    }

    public function historial(Request $request, Contratista $contratista)
    {
        if (! in_array($request->user()->rol, ['supervisor_contratos', 'admin'])) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $detalle = $contratista->core_contratista_id
            ? app(CoreApiClient::class)->obtenerContratista($contratista->core_contratista_id)
            : null;

        return response()->json($detalle['renovaciones'] ?? []);
    }

    public function asignarLider(Request $request, Contratista $contratista)
    {
        if ($denegado = $this->denegarSiNoEsGestor($request)) {
            return $denegado;
        }

        if (! $contratista->dependencia_id) {
            return response()->json(['message' => 'El contratista no tiene dependencia asignada'], 422);
        }

        DB::transaction(function () use ($contratista) {
            if ($contratista->es_lider) {
                $contratista->update(['es_lider' => false]);
            } else {
                Contratista::where('dependencia_id', $contratista->dependencia_id)
                    ->where('id', '!=', $contratista->id)
                    ->where('es_lider', true)
                    ->update(['es_lider' => false]);

                $contratista->update(['es_lider' => true]);
            }
        });

        return response()->json($this->conDatosCore($contratista->fresh()));
    }

    private function extraerDatosSupervisor(Contratista $contratista, string $ruta, string $nombre): void
    {
        try {
            $analisis = app(PdfApiService::class)->analyzeSupervisor($ruta, $nombre);

            if (! $analisis || ! ($analisis['success'] ?? false)) {
                return;
            }

            $updates = [];
            if (! empty($analisis['supervisor_nombre'])) {
                $updates['supervisor_nombre'] = $analisis['supervisor_nombre'];
            }
            if (! empty($analisis['supervisor_cedula'])) {
                $updates['supervisor_cedula'] = $analisis['supervisor_cedula'];
            }
            if (! empty($analisis['fecha_adicion_prorroga'])) {
                $updates['supervisor_fecha_adicion_prorroga'] = $analisis['fecha_adicion_prorroga'];
            }
            if (! empty($analisis['valor_adicion_prorroga'])) {
                $updates['supervisor_valor_adicion_prorroga'] = $analisis['valor_adicion_prorroga'];
            }

            if ($updates) {
                $contratista->update($updates);
            }
        } catch (\Exception) {
            // Fallo silencioso
        }
    }

    private function extraerDatosMinuta(Contratista $contratista, string $ruta, string $nombre): void
    {
        try {
            $analisis = app(PdfApiService::class)->analyzeMinuta($ruta, $nombre);

            if (! $analisis || ! ($analisis['success'] ?? false)) {
                \Log::warning("extraerDatosMinuta: sin resultado para contratista {$contratista->id} — " . ($analisis['error'] ?? 'null'));
                return;
            }

            $updates = [];
            if (! empty($analisis['valor'])) {
                $updates['valor_contrato'] = $analisis['valor'];
            }
            if (! empty($analisis['duracion'])) {
                $updates['duracion_contrato'] = $analisis['duracion'];
            }
            if (! empty($analisis['fecha_suscripcion'])) {
                $updates['fecha_suscripcion'] = $analisis['fecha_suscripcion'];
            }
            if (! empty($analisis['numero_contrato'])) {
                $updates['numero_contrato'] = $analisis['numero_contrato'];
            }
            if (! empty($analisis['objeto'])) {
                $updates['objeto_contrato'] = $analisis['objeto'];
            }

            if ($updates) {
                $contratista->update($updates);
            }
        } catch (\Exception $e) {
            \Log::error("extraerDatosMinuta error para contratista {$contratista->id}: " . $e->getMessage());
        }
    }

    private function hacerBackupArchivo(string $ruta): void
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
