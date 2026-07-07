<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\BuscaRegistroLocalDePersona;
use App\Models\Contratista;
use App\Models\Funcionario;
use App\Models\Obligacion;
use App\Rules\ArchivoPdf;
use App\Services\CoreApiClient;
use App\Services\FotoService;
use App\Services\PdfApiService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

class PerfilController extends Controller
{
    use BuscaRegistroLocalDePersona;

    private const DOCUMENTOS = [
        'estudios-previos' => ['ruta_estudios_previos',       'nombre_estudios_previos'],
        'rut' => ['ruta_rut',                    'nombre_rut'],
        'polizas' => ['ruta_polizas',                'nombre_polizas'],
        'paz-salvo-parafiscales' => ['ruta_paz_salvo_parafiscales', 'nombre_paz_salvo_parafiscales'],
        'seguridad-social' => ['ruta_seguridad_social',       'nombre_seguridad_social'],
        'arl' => ['ruta_arl',                    'nombre_arl'],
        'acta-inicio' => ['ruta_acta_inicio',            'nombre_acta_inicio'],
        'certificacion-bancaria' => ['ruta_certificacion_bancaria', 'nombre_certificacion_bancaria'],
        'registro-presupuestal' => ['ruta_registro_presupuestal',  'nombre_registro_presupuestal'],
        'resolucion-supervisor' => ['ruta_resolucion_supervisor',  'nombre_resolucion_supervisor'],
    ];

    private function resolverPerfil(Request $request): array
    {
        $user = $request->user();
        $personaId = $user->persona_id;

        $contratista = Contratista::where('persona_id', $personaId)->first();

        if ($contratista) {
            return ['tipo' => 'contratista', 'model' => $contratista];
        }

        $funcionario = Funcionario::where('persona_id', $personaId)->first();

        if ($funcionario) {
            return ['tipo' => 'funcionario', 'model' => $funcionario];
        }

        return ['tipo' => null, 'model' => null];
    }

    public function show(Request $request)
    {
        ['tipo' => $tipo, 'model' => $model] = $this->resolverPerfil($request);

        if (! $model) {
            return response()->json(['message' => 'Perfil no encontrado'], 404);
        }

        $persona = $model->coreData();

        if (! $persona) {
            return response()->json(['message' => 'Persona no encontrada para este perfil'], 404);
        }

        $foto = $model->foto;
        $core = app(CoreApiClient::class);

        $base = [
            'tipo_usuario' => $tipo,
            'nombre' => $persona['nombres'] ?? null,
            'apellido' => $persona['apellidos'] ?? null,
            'cedula' => $persona['numero_identificacion'] ?? null,
            'email' => $persona['email'] ?? null,
            'telefono' => $persona['telefono'] ?? null,
            'foto_url' => $foto?->foto_url,
            'foto_thumbnail_url' => $foto?->foto_thumbnail_url,
            'tiene_foto' => (bool) $foto?->foto_ruta,
        ];

        if ($tipo === 'contratista') {
            return response()->json(array_merge($base, [
                'contratista_id' => $model->id,
                'numero_contrato' => $model->numero_contrato,
                'objeto_contrato' => $model->objeto_contrato,
                'fecha_inicio' => $model->fecha_inicio,
                'fecha_fin' => $model->fecha_fin,
                'valor_contrato' => $model->valor_contrato,
                'duracion_contrato' => $model->duracion_contrato,
                'fecha_suscripcion' => $model->fecha_suscripcion,
                'dependencia' => $model->dependencia_id ? $core->obtenerDependencias()->get($model->dependencia_id)['nombre'] ?? null : null,
                'sector' => $model->sector_id ? $core->obtenerSectores()->get($model->sector_id)['nombre'] ?? null : null,
                'estado_contrato' => $model->estado_contrato,
                'tiene_minuta' => $model->tiene_minuta,
                'nombre_minuta' => $model->nombre_original_pdf,
                'supervisor_nombre' => $model->supervisor_nombre,
                'supervisor_cedula' => $model->supervisor_cedula,
                'documentos_estado' => $model->documentos_estado,
            ]));
        }

        return response()->json(array_merge($base, [
            'funcionario_id' => $model->id,
            'cargo' => $model->cargo,
            'dependencia' => $model->dependencia_id ? $core->obtenerDependencias()->get($model->dependencia_id)['nombre'] ?? null : null,
            'sector' => $model->sector_id ? $core->obtenerSectores()->get($model->sector_id)['nombre'] ?? null : null,
            'tiene_minuta' => $model->tiene_minuta,
            'nombre_minuta' => $model->nombre_original_pdf,
        ]));
    }

    public function subirFoto(Request $request)
    {
        ['tipo' => $tipo, 'model' => $model] = $this->resolverPerfil($request);

        if (! $model) {
            return response()->json(['message' => 'Perfil no encontrado'], 404);
        }

        $request->validate([
            'foto' => 'required|file|mimes:jpg,jpeg,png,webp|max:2048',
        ]);

        (new FotoService)->guardarFoto($request->file('foto'), $model->persona_id);

        return $this->show($request);
    }

    public function subirMinuta(Request $request)
    {
        ['tipo' => $tipo, 'model' => $model] = $this->resolverPerfil($request);

        if (! $model) {
            return response()->json(['message' => 'Perfil no encontrado'], 404);
        }

        $request->validate([
            'archivo' => ['required', 'file', 'max:51200', new ArchivoPdf],
        ]);

        $archivo = $request->file('archivo');
        $anio = now()->format('Y');
        $mes = now()->format('m');
        $prefix = $tipo === 'contratista' ? "contratista_{$model->id}" : "funcionario_{$model->id}";
        $rutaNueva = "{$anio}/{$mes}/{$prefix}_minuta_".now()->timestamp.'.pdf';

        if ($model->ruta_contrato_pdf && Storage::disk('contratos')->exists($model->ruta_contrato_pdf)) {
            $this->hacerBackup($model->ruta_contrato_pdf);
        }

        Storage::disk('contratos')->put($rutaNueva, file_get_contents($archivo->getRealPath()));

        $model->update([
            'ruta_contrato_pdf' => $rutaNueva,
            'nombre_original_pdf' => $archivo->getClientOriginalName(),
            'tamano_pdf_bytes' => $archivo->getSize(),
            'fecha_carga_pdf' => now(),
        ]);

        if ($tipo === 'contratista') {
            $this->extraerDatosMinuta($model, $rutaNueva, $archivo->getClientOriginalName());
        }

        return $this->show($request);
    }

    public function descargarMinuta(Request $request)
    {
        ['tipo' => $tipo, 'model' => $model] = $this->resolverPerfil($request);

        if (! $model) {
            return response()->json(['message' => 'Perfil no encontrado'], 404);
        }

        if (! $model->ruta_contrato_pdf || ! Storage::disk('contratos')->exists($model->ruta_contrato_pdf)) {
            return response()->json(['message' => 'Minuta no encontrada'], 404);
        }

        return $this->emitirDescargaPdf(
            Storage::disk('contratos')->get($model->ruta_contrato_pdf),
            $model->nombre_original_pdf ?? 'minuta_contrato.pdf'
        );
    }

    public function subirDocumento(Request $request, string $tipo)
    {
        ['tipo' => $perfTipo, 'model' => $contratista] = $this->resolverPerfil($request);

        if ($perfTipo !== 'contratista') {
            return response()->json(['message' => 'Solo disponible para contratistas'], 403);
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

        if ($contratista->$rutaCol && Storage::disk('contratos')->exists($contratista->$rutaCol)) {
            $this->hacerBackup($contratista->$rutaCol);
        }

        Storage::disk('contratos')->put($rutaNueva, file_get_contents($archivo->getRealPath()));
        $contratista->update([$rutaCol => $rutaNueva, $nombreCol => $archivo->getClientOriginalName()]);

        if ($tipo === 'resolucion-supervisor') {
            $this->extraerDatosSupervisor($contratista, $rutaNueva, $archivo->getClientOriginalName());
        }

        return $this->show($request);
    }

    public function descargarDocumento(Request $request, string $tipo)
    {
        ['tipo' => $perfTipo, 'model' => $contratista] = $this->resolverPerfil($request);

        if ($perfTipo !== 'contratista') {
            return response()->json(['message' => 'Solo disponible para contratistas'], 403);
        }

        if (! array_key_exists($tipo, self::DOCUMENTOS)) {
            return response()->json(['message' => 'Tipo de documento inválido'], 422);
        }

        [$rutaCol, $nombreCol] = self::DOCUMENTOS[$tipo];

        if (! $contratista->$rutaCol || ! Storage::disk('contratos')->exists($contratista->$rutaCol)) {
            return response()->json(['message' => 'Documento no encontrado'], 404);
        }

        return $this->emitirDescargaPdf(
            Storage::disk('contratos')->get($contratista->$rutaCol),
            $contratista->$nombreCol ?? "{$tipo}.pdf"
        );
    }

    public function actualizarDatosContrato(Request $request)
    {
        ['tipo' => $perfTipo, 'model' => $contratista] = $this->resolverPerfil($request);

        if ($perfTipo !== 'contratista') {
            return response()->json(['message' => 'Solo disponible para contratistas'], 403);
        }

        $data = $request->validate([
            'numero_contrato' => 'nullable|string|max:100',
            'fecha_inicio' => 'nullable|date',
            'fecha_fin' => 'nullable|date|after_or_equal:fecha_inicio',
            'objeto_contrato' => 'nullable|string',
        ]);

        $contratista->update($data);

        // El Core es la fuente de verdad compartida: solo se completan allá los campos
        // que todavía estaban vacíos. Si algún campo ya tiene valor administrativo, se
        // ignora en silencio aquí — el contratista no puede pisar un dato ya fijado por
        // un administrador desde su propio perfil.
        $aviso = null;
        if ($contratista->core_contratista_id) {
            $core = app(CoreApiClient::class);
            $contratistaCoreExistente = $core->obtenerContratista($contratista->core_contratista_id);
            $datosActualizar = $this->camposACompletar($contratistaCoreExistente, $request, [
                'numero_contrato' => 'numero_contrato', 'fecha_inicio' => 'fecha_inicio',
                'fecha_fin' => 'fecha_fin', 'objeto_contrato' => 'objeto_contrato',
            ]);

            if (! empty($datosActualizar)) {
                try {
                    $core->actualizarContratista($contratista->core_contratista_id, $datosActualizar);
                } catch (\Throwable $e) {
                    $aviso = 'Los datos se guardaron, pero no se pudieron sincronizar con el Core.';
                }
            }
        }

        $respuesta = $this->show($request);
        $datos = $respuesta->getData(true);
        $datos['aviso'] = $aviso;

        return response()->json($datos, $respuesta->status());
    }

    // ── Obligaciones ─────────────────────────────────────────────────────────

    public function listarObligaciones(Request $request)
    {
        ['tipo' => $perfTipo, 'model' => $contratista] = $this->resolverPerfil($request);

        if ($perfTipo !== 'contratista') {
            return response()->json(['message' => 'Solo disponible para contratistas'], 403);
        }

        return response()->json(
            Obligacion::where('contratista_id', $contratista->id)
                ->orderBy('created_at', 'desc')
                ->get()
        );
    }

    public function crearObligacion(Request $request)
    {
        ['tipo' => $perfTipo, 'model' => $contratista] = $this->resolverPerfil($request);

        if ($perfTipo !== 'contratista') {
            return response()->json(['message' => 'Solo disponible para contratistas'], 403);
        }

        $data = $request->validate([
            'descripcion' => 'required|string',
            'observaciones' => 'nullable|string',
        ]);

        $obligacion = Obligacion::create(array_merge($data, [
            'contratista_id' => $contratista->id,
        ]));

        return response()->json($obligacion, 201);
    }

    public function actualizarObligacion(Request $request, Obligacion $obligacion)
    {
        ['tipo' => $perfTipo, 'model' => $contratista] = $this->resolverPerfil($request);

        if ($perfTipo !== 'contratista' || $obligacion->contratista_id !== $contratista->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $data = $request->validate([
            'descripcion' => 'required|string',
            'observaciones' => 'nullable|string',
        ]);

        $obligacion->update($data);

        return response()->json($obligacion->fresh());
    }

    public function eliminarObligacion(Request $request, Obligacion $obligacion)
    {
        ['tipo' => $perfTipo, 'model' => $contratista] = $this->resolverPerfil($request);

        if ($perfTipo !== 'contratista' || $obligacion->contratista_id !== $contratista->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $obligacion->delete();

        return response()->json(['message' => 'Obligación eliminada']);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    protected function hacerBackup(string $ruta): void
    {
        $dir = dirname($ruta);
        $nombre = pathinfo($ruta, PATHINFO_FILENAME);
        $backup = "backups/{$dir}/{$nombre}_backup_".now()->timestamp.'.pdf';
        Storage::disk('contratos')->copy($ruta, $backup);
        Storage::disk('contratos')->delete($ruta);
    }

    private function emitirDescargaPdf(string $contenido, string $nombre): Response
    {
        return response($contenido, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="'.addslashes($nombre).'"',
        ]);
    }

    protected function extraerDatosMinuta(Contratista $contratista, string $ruta, string $nombre): void
    {
        try {
            $analisis = app(PdfApiService::class)->analyzeMinuta($ruta, $nombre);
            if (! $analisis || ! ($analisis['success'] ?? false)) {
                \Log::warning("extraerDatosMinuta (perfil): sin resultado para contratista {$contratista->id} — " . ($analisis['error'] ?? 'null'));
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
            // Siempre sobrescribir: la minuta es la fuente de verdad del contrato
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
            \Log::error("extraerDatosMinuta (perfil) error para contratista {$contratista->id}: " . $e->getMessage());
        }
    }

    protected function extraerDatosSupervisor(Contratista $contratista, string $ruta, string $nombre): void
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
        }
    }
}
