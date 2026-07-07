<?php

namespace App\Http\Controllers;

use App\Models\Evento;
use App\Models\EventoFoto;
use App\Models\EventoInvitado;
use App\Models\EventoUbicacion;
use App\Models\TareaCompromiso;
use App\Models\User;
use App\Notifications\AsistenciaConfirmadaNotification;
use App\Notifications\EventoAplazadoNotification;
use App\Notifications\EventoCanceladoNotification;
use App\Notifications\EventoInvitadoNotification;
use App\Rules\ArchivoPdf;
use App\Services\CoreApiClient;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class EventoController extends Controller
{
    /**
     * Serializa un evento a array adjuntando dependencia_ids/sector_ids (locales) y
     * responsable/invitados/compromisos con datos de persona traídos del Core en UNA
     * sola llamada por lote (evita N+1 por HTTP).
     */
    private function serializarEvento(Evento $evento, bool $puedeVerConclusiones = true): array
    {
        $core = app(CoreApiClient::class);
        $arr = $evento->toArray();

        if (! $puedeVerConclusiones) {
            $arr['conclusiones'] = null;
        }

        $arr['dependencia_ids'] = $evento->dependenciaIds();
        $arr['sector_ids'] = $evento->sectorIds();

        $ids = collect([$evento->responsable_id])
            ->merge($evento->relationLoaded('invitados') ? $evento->invitados->pluck('persona_id') : [])
            ->merge($evento->relationLoaded('compromisos') ? $evento->compromisos->pluck('persona_id') : [])
            ->filter()->unique()->values()->all();

        $personas = $core->buscarPersonasPorIds($ids);

        $arr['responsable'] = $evento->responsable_id ? $personas->get($evento->responsable_id) : null;

        if ($evento->relationLoaded('invitados')) {
            $arr['invitados'] = $evento->invitados->map(function ($inv) use ($personas) {
                $i = $inv->toArray();
                $i['persona'] = $personas->get($inv->persona_id);
                return $i;
            })->values();
        }

        if ($evento->relationLoaded('compromisos')) {
            $arr['compromisos'] = $evento->compromisos->map(function ($c) use ($personas) {
                $i = $c->toArray();
                $i['persona'] = $personas->get($c->persona_id);
                return $i;
            })->values();
        }

        return $arr;
    }

    public function index(Request $request)
    {
        $user = $request->user();
        $perPage = $request->integer('per_page', 15);
        $query = Evento::with('tipoEvento', 'sala', 'user', 'invitados');

        // Funcionarios y contratistas solo ven eventos donde son responsable o invitado
        if (in_array($user->rol, ['funcionario', 'contratista'])) {
            $personaId = $user->persona_id;
            $query->where(function ($q) use ($personaId) {
                $q->where('responsable_id', $personaId)
                    ->orWhereHas('invitados', fn ($i) => $i->where('persona_id', $personaId));
            });
        }

        if ($request->estado) {
            $query->where('estado', $request->estado);
        }

        if ($request->search) {
            $query->where('tema', 'like', "%{$request->search}%");
        }

        if ($request->dependencia_id) {
            $eventoIds = DB::table('evento_dependencias')->where('dependencia_id', $request->dependencia_id)->pluck('evento_id');
            $query->whereIn('id', $eventoIds);
        }

        if ($request->fecha_inicio && $request->fecha_fin) {
            $query->whereBetween('fecha_hora', [$request->fecha_inicio, $request->fecha_fin]);
        }

        $puedeVerConclusiones = in_array($user->rol, ['admin', 'digitador', 'super_admin']);

        $paginator = $query->latest()->paginate($perPage);
        $paginator->setCollection(
            $paginator->getCollection()->map(fn ($evento) => $this->serializarEvento($evento, $puedeVerConclusiones))
        );

        return response()->json($paginator);
    }

    public function store(Request $request)
    {
        $this->authorize('create', Evento::class);

        $validated = $request->validate([
            'fecha_hora' => 'required|date',
            'fecha_hora_fin' => 'nullable|date|after:fecha_hora',
            'tema' => 'required|string|max:255',
            'responsable_id' => 'required|integer',
            'dependencias' => 'required|array|min:1',
            'dependencias.*' => 'integer',
            'sectores' => 'nullable|array',
            'sectores.*' => 'integer',
            'tipo_evento_id' => 'nullable|exists:tipos_evento,id',
            'sala_id' => 'nullable|exists:salas,id',
            'sitio' => 'nullable|string|max:255',
            'entidad' => 'nullable|string|max:255',
            'area' => 'nullable|string|max:255',
            'descripcion' => 'nullable|string',
            'enlace_meet' => 'nullable|url:http,https',
            'es_publica' => 'boolean',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'direccion' => 'nullable|string|max:500',
            'invitados' => 'nullable|array',
            'invitados.*' => 'integer',
        ]);

        $data = Arr::except($validated, ['invitados', 'dependencias', 'sectores']);
        $data['numero'] = 'EVT-'.strtoupper(Str::random(6));
        $data['user_id'] = $request->user()->id;
        $data['estado'] = 'programado';

        $evento = Evento::create($data);

        $evento->sincronizarDependencias($request->dependencias ?? []);
        $evento->sincronizarSectores($request->sectores ?? []);

        if ($request->filled('latitude') && $request->filled('longitude')) {
            EventoUbicacion::create([
                'evento_id' => $evento->id,
                'latitude' => $request->latitude,
                'longitude' => $request->longitude,
                'direccion' => $request->direccion,
                'user_id' => $request->user()->id,
                'tipo' => $request->tipo_captura ?? 'manual',
            ]);
        }

        $invitadosValidos = $this->soloPersonasInvitables($request->invitados ?? []);

        if ($invitadosValidos) {
            foreach ($invitadosValidos as $personaId) {
                EventoInvitado::create([
                    'evento_id' => $evento->id,
                    'persona_id' => $personaId,
                ]);
            }

            $evento->load('sala');
            User::whereIn('persona_id', $invitadosValidos)->get()->each(function ($user) use ($evento) {
                $user->notify(new EventoInvitadoNotification($evento));
                EventoInvitado::where('evento_id', $evento->id)
                    ->where('persona_id', $user->persona_id)
                    ->increment('notificaciones_enviadas');
            });
        }

        return response()->json($this->serializarEvento($evento->load('invitados')), 201);
    }

    public function show(Request $request, Evento $evento)
    {
        $evento->load('tipoEvento', 'sala', 'user', 'invitados', 'compromisos');

        $puedeVerConclusiones = in_array($request->user()->rol, ['admin', 'digitador', 'super_admin']);

        return response()->json($this->serializarEvento($evento, $puedeVerConclusiones));
    }

    public function update(Request $request, Evento $evento)
    {
        $this->authorize('update', $evento);

        // Evento finalizado: solo se pueden editar conclusiones
        if ($evento->estado === 'finalizado') {
            $request->validate(['conclusiones' => 'required|string']);
            $evento->update(['conclusiones' => $request->conclusiones]);

            return response()->json($this->serializarEvento($evento->load('invitados')));
        }

        $validated = $request->validate([
            'fecha_hora' => 'required|date',
            'fecha_hora_fin' => 'nullable|date|after:fecha_hora',
            'tema' => 'required|string|max:255',
            'dependencias' => 'required|array|min:1',
            'dependencias.*' => 'integer',
            'responsable_id' => 'required|integer',
            'estado' => 'in:programado,en_curso,aplazado,cancelado',
            'sectores' => 'nullable|array',
            'sectores.*' => 'integer',
            'tipo_evento_id' => 'nullable|exists:tipos_evento,id',
            'sala_id' => 'nullable|exists:salas,id',
            'sitio' => 'nullable|string|max:255',
            'entidad' => 'nullable|string|max:255',
            'area' => 'nullable|string|max:255',
            'descripcion' => 'nullable|string',
            'enlace_meet' => 'nullable|url:http,https',
            'es_publica' => 'boolean',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
            'direccion' => 'nullable|string|max:500',
            'invitados' => 'nullable|array',
            'invitados.*' => 'integer',
        ]);

        $data = Arr::except($validated, ['invitados', 'dependencias', 'sectores']);

        $coordsCambiaron = $request->filled('latitude') && $request->filled('longitude')
            && ((string) $evento->latitude !== (string) $request->latitude
                || (string) $evento->longitude !== (string) $request->longitude);

        $evento->update($data);

        if ($request->has('dependencias')) {
            $evento->sincronizarDependencias($request->dependencias ?? []);
        }
        if ($request->has('sectores')) {
            $evento->sincronizarSectores($request->sectores ?? []);
        }

        if ($coordsCambiaron) {
            EventoUbicacion::create([
                'evento_id' => $evento->id,
                'latitude' => $request->latitude,
                'longitude' => $request->longitude,
                'direccion' => $request->direccion,
                'user_id' => $request->user()->id,
                'tipo' => $request->tipo_captura ?? 'manual',
            ]);
        }

        if ($request->has('invitados')) {
            $nuevosIds = collect($request->invitados ?? []);
            $actualesIds = $evento->invitados()->pluck('persona_id');

            // Solo se pueden AGREGAR personas con usuario activo (contrato vigente).
            // Las ya invitadas se conservan aunque su contrato haya vencido después.
            $agregarIds = collect($this->soloPersonasInvitables($nuevosIds->diff($actualesIds)->all()));
            $eliminarIds = $actualesIds->diff($nuevosIds);

            $evento->invitados()->whereIn('persona_id', $eliminarIds)->delete();

            foreach ($agregarIds as $personaId) {
                EventoInvitado::create([
                    'evento_id' => $evento->id,
                    'persona_id' => $personaId,
                ]);
            }

            if ($agregarIds->isNotEmpty()) {
                $evento->load('sala');
                User::whereIn('persona_id', $agregarIds)->get()->each(function ($user) use ($evento) {
                    $user->notify(new EventoInvitadoNotification($evento));
                    EventoInvitado::where('evento_id', $evento->id)
                        ->where('persona_id', $user->persona_id)
                        ->increment('notificaciones_enviadas');
                });
            }
        }

        return response()->json($this->serializarEvento($evento->load('invitados')));
    }

    public function aplazar(Request $request, Evento $evento)
    {
        $this->authorize('update', $evento);

        if (! in_array($evento->estado, ['programado', 'en_curso'])) {
            return response()->json(['message' => 'Solo se pueden aplazar eventos programados o en curso'], 422);
        }

        $request->validate([
            'fecha_hora' => 'required|date',
            'fecha_hora_fin' => 'nullable|date|after:fecha_hora',
            'razon_aplazamiento' => 'required|string|max:1000',
        ]);

        $evento->update([
            'estado' => 'aplazado',
            'fecha_hora' => $request->fecha_hora,
            'fecha_hora_fin' => $request->fecha_hora_fin,
            'razon_aplazamiento' => $request->razon_aplazamiento,
        ]);

        $evento->load('sala');
        User::whereIn('persona_id', $evento->invitados()->pluck('persona_id'))->get()
            ->each(fn ($user) => $user->notify(new EventoAplazadoNotification($evento)));

        return response()->json($this->serializarEvento($evento->load('invitados')));
    }

    public function destroy(Evento $evento)
    {
        $this->authorize('delete', $evento);
        $evento->update(['estado' => 'cancelado']);

        // Notificar a invitados que el evento fue cancelado
        $evento->load('sala');
        User::whereIn('persona_id', $evento->invitados()->pluck('persona_id'))->get()
            ->each(fn ($user) => $user->notify(new EventoCanceladoNotification($evento)));

        return response()->json(['message' => 'Evento cancelado']);
    }

    public function finalizar(Request $request, Evento $evento)
    {
        $this->authorize('finalizar', $evento);

        $request->validate([
            'conclusiones' => 'required|string',
            'asistencias' => 'nullable|array',
            'asistencias.*.persona_id' => 'required|integer',
            'asistencias.*.asistio' => 'required|boolean',
            'compromisos' => 'nullable|array',
            'compromisos.*.persona_id' => 'required|integer',
            'compromisos.*.descripcion' => 'required|string|max:500',
            'compromisos.*.fecha_limite' => 'required|date|after:today',
        ]);

        $enDestiempo = $evento->estado === 'cerrado';

        $evento->update([
            'estado'        => 'finalizado',
            'conclusiones'  => $request->conclusiones,
            'finalizado_en' => now(),
            'en_destiempo'  => $enDestiempo,
        ]);

        if ($request->asistencias) {
            foreach ($request->asistencias as $asistencia) {
                EventoInvitado::where('evento_id', $evento->id)
                    ->where('persona_id', $asistencia['persona_id'])
                    ->update(['asistio' => $asistencia['asistio']]);
            }
        }

        if ($request->compromisos) {
            foreach ($request->compromisos as $compromiso) {
                $tc = TareaCompromiso::create([
                    'evento_id' => $evento->id,
                    'persona_id' => $compromiso['persona_id'],
                    'descripcion' => $compromiso['descripcion'],
                    'fecha_limite' => $compromiso['fecha_limite'],
                    'estado' => 'pendiente',
                ]);
                $tc->update(['numero' => 'C-'.str_pad($tc->id, 4, '0', STR_PAD_LEFT)]);
            }
        }

        return response()->json([
            'message' => 'Evento finalizado correctamente',
            'evento' => $this->serializarEvento($evento->load('invitados')),
        ]);
    }

    public function confirmarAsistencia(Request $request, Evento $evento)
    {
        $request->validate([
            'persona_id' => 'required|integer',
            'confirmacion' => 'required|in:pendiente,confirmado,rechazado',
            'motivo_rechazo' => 'nullable|string|max:500',
        ]);

        // Cada quien solo confirma su propia asistencia; los gestores pueden hacerlo por cualquiera.
        $esGestor = in_array($request->user()->rol, ['admin', 'digitador', 'super_admin'], true);
        if (! $esGestor && $request->user()->persona_id != $request->persona_id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $invitado = EventoInvitado::where('evento_id', $evento->id)
            ->where('persona_id', $request->persona_id)
            ->firstOrFail();

        $data = [
            'confirmacion' => $request->confirmacion,
            'confirmado_at' => now(),
        ];

        if ($request->confirmacion === 'rechazado' && $request->motivo_rechazo) {
            $data['motivo_rechazo'] = $request->motivo_rechazo;
        }

        $invitado->update($data);

        if (in_array($request->confirmacion, ['confirmado', 'rechazado'])) {
            $evento->load('sala');
            $persona = app(CoreApiClient::class)->obtenerPersona($request->persona_id);

            if ($persona && $evento->user) {
                $evento->user->notify(
                    new AsistenciaConfirmadaNotification($evento, $persona, $request->confirmacion)
                );
            }
        }

        return response()->json(['message' => 'Asistencia actualizada']);
    }

    public function subirDocumentoSoporte(Request $request, Evento $evento)
    {
        $this->authorize('gestionarDocumentos', $evento);

        $request->validate(['archivo' => ['required', 'file', 'max:51200', new ArchivoPdf]]);

        $archivo = $request->file('archivo');
        $ruta = now()->format('Y/m').'/evento_'.$evento->id.'_doc_'.now()->timestamp.'.'.$archivo->getClientOriginalExtension();

        if ($evento->documento_soporte) {
            Storage::disk('contratos')->delete($evento->documento_soporte);
        }

        Storage::disk('contratos')->put($ruta, file_get_contents($archivo->getRealPath()));
        $evento->update(['documento_soporte' => $ruta, 'soporte_analisis' => null]);

        return response()->json(['documento_soporte' => $ruta, 'nombre' => $archivo->getClientOriginalName()]);
    }

    public function descargarDocumentoSoporte(Evento $evento)
    {
        $this->authorize('view', $evento);

        if (! $evento->documento_soporte || ! Storage::disk('contratos')->exists($evento->documento_soporte)) {
            return response()->json(['message' => 'Documento no encontrado'], 404);
        }

        $contenido = Storage::disk('contratos')->get($evento->documento_soporte);
        $extension = strtolower(pathinfo($evento->documento_soporte, PATHINFO_EXTENSION));

        return response($contenido, 200, [
            'Content-Type' => $this->mimeType($extension),
            'Content-Disposition' => 'inline; filename="documento_soporte_'.$evento->numero.'.'.$extension.'"',
        ]);
    }

    public function subirActaReunion(Request $request, Evento $evento)
    {
        $this->authorize('gestionarDocumentos', $evento);

        $request->validate(['archivo' => ['required', 'file', 'max:51200', new ArchivoPdf]]);

        $archivo = $request->file('archivo');
        $ruta = now()->format('Y/m').'/evento_'.$evento->id.'_acta_'.now()->timestamp.'.'.$archivo->getClientOriginalExtension();

        if ($evento->acta_reunion) {
            Storage::disk('contratos')->delete($evento->acta_reunion);
        }

        Storage::disk('contratos')->put($ruta, file_get_contents($archivo->getRealPath()));
        $evento->update(['acta_reunion' => $ruta]);

        return response()->json(['acta_reunion' => $ruta, 'nombre' => $archivo->getClientOriginalName()]);
    }

    public function descargarActaReunion(Evento $evento)
    {
        $this->authorize('view', $evento);

        if (! $evento->acta_reunion || ! Storage::disk('contratos')->exists($evento->acta_reunion)) {
            return response()->json(['message' => 'Acta no encontrada'], 404);
        }

        $contenido = Storage::disk('contratos')->get($evento->acta_reunion);
        $extension = strtolower(pathinfo($evento->acta_reunion, PATHINFO_EXTENSION));

        return response($contenido, 200, [
            'Content-Type' => $this->mimeType($extension),
            'Content-Disposition' => 'inline; filename="acta_reunion_'.$evento->numero.'.'.$extension.'"',
        ]);
    }

    public function subirListaAsistencia(Request $request, Evento $evento)
    {
        $this->authorize('gestionarDocumentos', $evento);

        $request->validate(['archivo' => ['required', 'file', 'max:51200', new ArchivoPdf]]);

        $archivo = $request->file('archivo');
        $ruta = now()->format('Y/m').'/evento_'.$evento->id.'_lista_'.now()->timestamp.'.pdf';

        if ($evento->lista_asistencia) {
            Storage::disk('contratos')->delete($evento->lista_asistencia);
        }

        Storage::disk('contratos')->put($ruta, file_get_contents($archivo->getRealPath()));
        $evento->update(['lista_asistencia' => $ruta]);

        return response()->json(['lista_asistencia' => $ruta, 'nombre' => $archivo->getClientOriginalName()]);
    }

    public function descargarListaAsistencia(Evento $evento)
    {
        $this->authorize('view', $evento);

        if (! $evento->lista_asistencia || ! Storage::disk('contratos')->exists($evento->lista_asistencia)) {
            return response()->json(['message' => 'Lista de asistencia no encontrada'], 404);
        }

        $contenido = Storage::disk('contratos')->get($evento->lista_asistencia);

        return response($contenido, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'inline; filename="lista_asistencia_'.$evento->numero.'.pdf"',
        ]);
    }

    public function misTareas(Request $request)
    {
        $user = $request->user();
        $personaId = $user->persona_id;

        if (! $personaId) {
            return response()->json(['compromisos' => [], 'resumen' => [
                'total' => 0, 'pendiente' => 0, 'cumplido' => 0, 'vencidos' => 0,
            ]]);
        }

        $compromisos = TareaCompromiso::with('evento')
            ->where('persona_id', $personaId)
            ->orderBy('fecha_limite')
            ->get();

        $core = app(CoreApiClient::class);
        $responsableIds = $compromisos->pluck('evento.responsable_id')->filter()->unique()->all();
        $personas = $core->buscarPersonasPorIds($responsableIds);

        $compromisos = $compromisos->map(function ($c) use ($personas) {
            $arr = $c->toArray();
            if ($c->evento) {
                $arr['evento']['dependencia_ids'] = $c->evento->dependenciaIds();
                $arr['evento']['responsable'] = $c->evento->responsable_id ? $personas->get($c->evento->responsable_id) : null;
            }
            return $arr;
        });

        $resumen = [
            'total' => $compromisos->count(),
            'pendiente' => $compromisos->where('estado', 'pendiente')->count(),
            'cumplido' => $compromisos->where('estado', 'cumplido')->count(),
            'vencidos' => $compromisos->where('estado', 'pendiente')
                ->filter(fn ($c) => $c['fecha_limite'] && \Illuminate\Support\Carbon::parse($c['fecha_limite'])->isPast())
                ->count(),
        ];

        return response()->json(compact('compromisos', 'resumen'));
    }

    public function listarFotos(Evento $evento)
    {
        $this->authorize('view', $evento);

        return response()->json($evento->fotos()->orderBy('created_at')->get());
    }

    public function subirFotos(Request $request, Evento $evento)
    {
        $this->authorize('gestionarDocumentos', $evento);

        $request->validate([
            'fotos' => 'required|array|min:1|max:20',
            'fotos.*' => 'required|file|mimes:jpg,jpeg,png,webp|max:10240',
        ]);

        $subidas = [];
        foreach ($request->file('fotos') as $archivo) {
            $ruta = now()->format('Y/m').'/evento_'.$evento->id.'_foto_'.now()->timestamp.'_'.uniqid().'.'.$archivo->getClientOriginalExtension();
            Storage::disk('contratos')->put($ruta, file_get_contents($archivo->getRealPath()));
            $foto = EventoFoto::create([
                'evento_id' => $evento->id,
                'ruta' => $ruta,
                'nombre_original' => $archivo->getClientOriginalName(),
            ]);
            $subidas[] = $foto;
        }

        return response()->json($subidas, 201);
    }

    public function verFoto(Evento $evento, EventoFoto $foto)
    {
        $this->authorize('view', $evento);

        if ($foto->evento_id !== $evento->id || ! Storage::disk('contratos')->exists($foto->ruta)) {
            return response()->json(['message' => 'Foto no encontrada'], 404);
        }

        $contenido = Storage::disk('contratos')->get($foto->ruta);
        $extension = strtolower(pathinfo($foto->ruta, PATHINFO_EXTENSION));
        $mime = match ($extension) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            default => 'image/jpeg',
        };

        return response($contenido, 200, [
            'Content-Type' => $mime,
            'Content-Disposition' => 'inline; filename="'.($foto->nombre_original ?? 'foto.jpg').'"',
        ]);
    }

    public function eliminarFoto(Evento $evento, EventoFoto $foto)
    {
        $this->authorize('gestionarDocumentos', $evento);

        if ($foto->evento_id !== $evento->id) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        Storage::disk('contratos')->delete($foto->ruta);
        $foto->delete();

        return response()->json(['message' => 'Foto eliminada']);
    }

    public function exportarGeoJson(Request $request)
    {
        $query = Evento::query()
            ->whereNotNull('latitude')
            ->whereNotNull('longitude');

        $user = $request->user();
        if (in_array($user->rol, ['funcionario', 'contratista'])) {
            $query->whereHas('invitados', fn ($q) => $q->where('persona_id', $user->persona_id));
        }

        $eventos = $query->get();

        $core = app(CoreApiClient::class);
        $personas = $core->buscarPersonasPorIds($eventos->pluck('responsable_id')->filter()->unique()->all());

        $features = $eventos->map(function ($evento) use ($personas) {
            $responsable = $evento->responsable_id ? $personas->get($evento->responsable_id) : null;

            return [
                'type' => 'Feature',
                'geometry' => [
                    'type' => 'Point',
                    'coordinates' => [(float) $evento->longitude, (float) $evento->latitude],
                ],
                'properties' => [
                    'id' => $evento->id,
                    'numero' => $evento->numero,
                    'tema' => $evento->tema,
                    'estado' => $evento->estado,
                    'fecha_hora' => $evento->fecha_hora,
                    'responsable' => $responsable
                        ? trim(($responsable['nombres'] ?? '').' '.($responsable['apellidos'] ?? ''))
                        : null,
                    'direccion' => $evento->direccion,
                ],
            ];
        });

        $geojson = json_encode([
            'type' => 'FeatureCollection',
            'features' => $features,
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);

        return response($geojson, 200, [
            'Content-Type' => 'application/geo+json',
            'Content-Disposition' => 'attachment; filename="eventos_'.now()->format('Y-m-d').'.geojson"',
        ]);
    }

    public function listarUbicaciones(Request $request, Evento $evento)
    {
        $user = $request->user();
        $puedeVer = in_array($user->rol, ['admin', 'digitador', 'super_admin'])
            || $user->persona_id == $evento->responsable_id;

        if (! $puedeVer) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $historial = $evento->ubicaciones()
            ->with('user:id,name')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($historial);
    }

    /**
     * Filtra una lista de persona_id dejando solo las invitables:
     * persona activa (en el Core) y con cuenta de usuario local activa. Esto excluye a
     * funcionarios/contratistas cuyo contrato venció o fue suspendido
     * (al vencer/suspender se desactiva el usuario), aunque la persona
     * siga registrada.
     */
    private function soloPersonasInvitables(array|Collection $personaIds): array
    {
        $ids = collect($personaIds)->filter()->unique()->values();

        if ($ids->isEmpty()) {
            return [];
        }

        $activasEnCore = app(CoreApiClient::class)->buscarPersonasPorIds($ids->all())
            ->filter(fn ($p) => $p['activo'] ?? true)
            ->keys();

        $conUsuarioActivo = User::whereIn('persona_id', $ids)->where('activo', true)->pluck('persona_id');

        return $ids->intersect($activasEnCore)->intersect($conUsuarioActivo)->values()->all();
    }

    private function mimeType(string $ext): string
    {
        return match ($ext) {
            'pdf' => 'application/pdf',
            'doc' => 'application/msword',
            'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls' => 'application/vnd.ms-excel',
            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'ppt' => 'application/vnd.ms-powerpoint',
            'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            default => 'application/octet-stream',
        };
    }
}
