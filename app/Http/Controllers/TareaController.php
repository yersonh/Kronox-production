<?php

namespace App\Http\Controllers;

use App\Models\Tarea;
use App\Models\TareaCompromiso;
use App\Models\TareaFoto;
use App\Models\Prioridad;
use App\Models\User;
use App\Notifications\TareaAsignadaNotification;
use App\Rules\ArchivoPdf;
use App\Services\CoreApiClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class TareaController extends Controller
{
    /** Roles que gestionan todas las tareas. */
    private function esGestor(Request $request): bool
    {
        return in_array($request->user()->rol, ['admin', 'super_admin', 'digitador'], true);
    }

    /** Bloquea a quien no sea gestor. Devuelve respuesta 403 o null. */
    private function denegarSiNoEsGestor(Request $request)
    {
        if (!$this->esGestor($request)) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        return null;
    }

    /** Permite a gestores o a la persona asignada al item. Devuelve respuesta 403 o null. */
    private function denegarSiNoEsGestorNiDueno(Request $request, ?int $personaId)
    {
        $esDueno = $personaId && $request->user()->persona_id === $personaId;

        if (!$this->esGestor($request) && !$esDueno) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        return null;
    }

    /** Adjunta persona/dependencia/sector (datos del Core) a una tarea como atributos planos. */
    private function conDatosCore(Tarea $tarea, ?array $persona = null): array
    {
        $core = app(CoreApiClient::class);
        $arr = $tarea->toArray();

        $arr['persona'] = $persona ?? ($tarea->persona_id ? $core->obtenerPersona($tarea->persona_id) : null);
        $arr['dependencia'] = $tarea->dependencia_id ? $core->obtenerDependencias()->get($tarea->dependencia_id) : null;
        $arr['sector'] = $tarea->sector_id ? $core->obtenerSectores()->get($tarea->sector_id) : null;

        return $arr;
    }

    public function index(Request $request)
    {
        if ($denegado = $this->denegarSiNoEsGestor($request)) {
            return $denegado;
        }

        $query = Tarea::with('prioridad', 'user');

        if ($request->estado) {
            $query->where('estado', $request->estado);
        }

        if ($request->persona_id) {
            $query->where('persona_id', $request->persona_id);
        }

        if ($request->dependencia_id) {
            $query->where('dependencia_id', $request->dependencia_id);
        }

        if ($request->sector_id) {
            $query->where('sector_id', $request->sector_id);
        }

        if ($request->fecha_inicio && $request->fecha_fin) {
            $query->whereBetween('fecha_hora', [$request->fecha_inicio, $request->fecha_fin]);
        }

        $tareas = $query->latest()->get();

        $core = app(CoreApiClient::class);
        $personas = $core->buscarPersonasPorIds($tareas->pluck('persona_id')->filter()->unique()->all());

        return response()->json($tareas->map(fn ($t) => $this->conDatosCore($t, $personas->get($t->persona_id))));
    }

    public function store(Request $request)
    {
        if ($denegado = $this->denegarSiNoEsGestor($request)) {
            return $denegado;
        }

        $validated = $request->validate([
            'fecha_hora'     => 'required|date',
            'descripcion'    => 'required|string',
            'asunto'         => 'required|string|max:255',
            'persona_id'     => 'required|integer',
            'prioridad_id'   => 'required|exists:prioridades,id',
            'dependencia_id' => 'required|integer',
            'sector_id'      => 'nullable|integer',
            'observaciones'  => 'nullable|string',
            'link_adjunto'   => 'nullable|string',
        ]);

        $prioridad = Prioridad::findOrFail($validated['prioridad_id']);
        $fechaVencimiento = Carbon::parse($validated['fecha_hora'])->addDays($prioridad->dias_vencimiento);

        // Solo campos validados + los controlados por el servidor.
        // Evita asignación masiva de numero/estado/cerrado_por/soporte_*/etc.
        $data = $validated;
        $data['user_id']           = $request->user()->id;
        $data['fecha_vencimiento'] = $fechaVencimiento;

        $tarea = Tarea::create($data);
        $tarea->update(['numero' => 'TSK-' . str_pad($tarea->id, 4, '0', STR_PAD_LEFT)]);
        $tarea->load('prioridad');

        if ($user = User::where('persona_id', $tarea->persona_id)->first()) {
            $user->notify(new TareaAsignadaNotification($tarea));
        }

        return response()->json($this->conDatosCore($tarea), 201);
    }

    public function show(Request $request, Tarea $tarea)
    {
        if ($denegado = $this->denegarSiNoEsGestorNiDueno($request, $tarea->persona_id)) {
            return $denegado;
        }

        $tarea->load('prioridad', 'user');

        return response()->json($this->conDatosCore($tarea));
    }

    public function update(Request $request, Tarea $tarea)
    {
        if ($denegado = $this->denegarSiNoEsGestor($request)) {
            return $denegado;
        }

        $validated = $request->validate([
            'descripcion'    => 'required|string',
            'asunto'         => 'required|string|max:255',
            'persona_id'     => 'required|integer',
            'estado'         => 'in:pendiente,realizado,cancelado',
            'fecha_hora'     => 'sometimes|date',
            'prioridad_id'   => 'sometimes|exists:prioridades,id',
            'dependencia_id' => 'sometimes|integer',
            'sector_id'      => 'nullable|integer',
            'observaciones'  => 'nullable|string',
            'link_adjunto'   => 'nullable|string',
        ]);

        // Solo campos validados: evita sobrescribir numero/user_id/cerrado_por/soporte_* por mass assignment.
        $tarea->update($validated);
        $tarea->load('prioridad');

        return response()->json($this->conDatosCore($tarea));
    }

    public function destroy(Request $request, Tarea $tarea)
    {
        if ($denegado = $this->denegarSiNoEsGestor($request)) {
            return $denegado;
        }

        $tarea->update(['estado' => 'cancelado']);
        return response()->json(['message' => 'Tarea cancelada']);
    }

    public function misTareas(Request $request)
    {
        $user      = $request->user();
        $personaId = $user->persona_id;

        if (!$personaId) {
            return response()->json([
                'tareas'      => [],
                'compromisos' => [],
                'resumen'     => [
                    'total_tareas'      => 0,
                    'pendientes'        => 0,
                    'realizadas'        => 0,
                    'vencidas'          => 0,
                    'total_compromisos' => 0,
                ],
            ]);
        }

        $core = app(CoreApiClient::class);

        $tareasModelos = Tarea::with('prioridad', 'user')
            ->where('persona_id', $personaId)
            ->orderBy('fecha_vencimiento')
            ->get();
        $tareas = $tareasModelos->map(fn ($t) => $this->conDatosCore($t));

        $compromisos = TareaCompromiso::with('evento')
            ->where('persona_id', $personaId)
            ->orderBy('fecha_limite')
            ->get();

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
            'total_tareas'      => $tareas->count(),
            'pendientes'        => $tareasModelos->where('estado', 'pendiente')->count()
                                   + $compromisos->where('estado', 'pendiente')->count(),
            'realizadas'        => $tareasModelos->where('estado', 'realizado')->count()
                                   + $compromisos->where('estado', 'cumplido')->count(),
            'vencidas'          => $tareasModelos->where('estado', 'vencido')->count()
                                   + $compromisos->where('estado', 'vencida')->count(),
            'canceladas'        => $tareasModelos->where('estado', 'cancelado')->count(),
            'total_compromisos' => $compromisos->count(),
        ];

        return response()->json(compact('tareas', 'compromisos', 'resumen'));
    }

    public function cerrar(Request $request, Tarea $tarea)
    {
        $user       = $request->user();
        $esAdmin    = in_array($user->rol, ['admin', 'super_admin']);
        $esAsignado = $user->persona_id && $tarea->persona_id == $user->persona_id;

        if (!$esAdmin && !$esAsignado) {
            return response()->json(['message' => 'No autorizado para cerrar tareas'], 403);
        }

        $request->validate([
            'conclusiones'         => 'required|string',
            'soporte_cumplimiento' => ['nullable', 'file', 'max:51200', new ArchivoPdf],
            'fotos'                => 'nullable|array|max:20',
            'fotos.*'              => 'file|mimes:jpg,jpeg,png,webp|max:10240',
        ]);

        $data = [
            'estado'       => 'realizado',
            'cerrado_at'   => now(),
            'cerrado_por'  => $user->id,
            'conclusiones' => $request->conclusiones,
        ];

        if ($request->hasFile('soporte_cumplimiento')) {
            if ($tarea->soporte_cumplimiento) {
                Storage::disk('contratos')->delete($tarea->soporte_cumplimiento);
            }
            $archivo = $request->file('soporte_cumplimiento');
            $ruta    = now()->format('Y/m') . '/tarea_' . $tarea->id . '_soporte_' . now()->timestamp . '.pdf';
            Storage::disk('contratos')->put($ruta, file_get_contents($archivo->getRealPath()));
            $data['soporte_cumplimiento'] = $ruta;
            $data['soporte_analisis']     = null;
        }

        $tarea->update($data);

        if ($request->hasFile('fotos')) {
            foreach ($request->file('fotos') as $foto) {
                $ruta = now()->format('Y/m') . '/tarea_' . $tarea->id . '_foto_' . now()->timestamp . '_' . uniqid() . '.' . $foto->getClientOriginalExtension();
                Storage::disk('contratos')->put($ruta, file_get_contents($foto->getRealPath()));
                TareaFoto::create([
                    'tarea_id'       => $tarea->id,
                    'ruta'           => $ruta,
                    'nombre_original' => $foto->getClientOriginalName(),
                ]);
            }
        }

        return response()->json(['message' => 'Tarea cerrada correctamente', 'tarea' => $tarea->load('fotos')]);
    }

    public function cumplirCompromiso(Request $request, TareaCompromiso $compromiso)
    {
        $user       = $request->user();
        $esAdmin    = in_array($user->rol, ['admin', 'super_admin']);
        $esAsignado = $user->persona_id && $compromiso->persona_id == $user->persona_id;

        if (!$esAdmin && !$esAsignado) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $request->validate([
            'conclusiones'         => 'required|string',
            'soporte_cumplimiento' => ['nullable', 'file', 'max:51200', new ArchivoPdf],
            'fotos'                => 'nullable|array|max:20',
            'fotos.*'              => 'file|mimes:jpg,jpeg,png,webp|max:10240',
        ]);

        if (!in_array($compromiso->estado, ['pendiente', 'vencida'])) {
            return response()->json(['message' => 'Este compromiso ya fue cumplido o cancelado'], 422);
        }

        $data = [
            'estado'       => 'cumplido',
            'cumplido_at'  => now(),
            'conclusiones' => $request->conclusiones,
        ];

        if ($request->hasFile('soporte_cumplimiento')) {
            if ($compromiso->soporte_cumplimiento) {
                Storage::disk('contratos')->delete($compromiso->soporte_cumplimiento);
            }
            $archivo = $request->file('soporte_cumplimiento');
            $ruta    = now()->format('Y/m') . '/compromiso_' . $compromiso->id . '_soporte_' . now()->timestamp . '.pdf';
            Storage::disk('contratos')->put($ruta, file_get_contents($archivo->getRealPath()));
            $data['soporte_cumplimiento'] = $ruta;
            $data['soporte_analisis']     = null;
        }

        $compromiso->update($data);

        if ($request->hasFile('fotos')) {
            foreach ($request->file('fotos') as $foto) {
                $ruta = now()->format('Y/m') . '/compromiso_' . $compromiso->id . '_foto_' . now()->timestamp . '_' . uniqid() . '.' . $foto->getClientOriginalExtension();
                Storage::disk('contratos')->put($ruta, file_get_contents($foto->getRealPath()));
                TareaFoto::create([
                    'compromiso_id'  => $compromiso->id,
                    'ruta'           => $ruta,
                    'nombre_original' => $foto->getClientOriginalName(),
                ]);
            }
        }

        return response()->json(['message' => 'Compromiso marcado como cumplido', 'compromiso' => $compromiso->load('fotos')]);
    }

    public function descargarSoporteTarea(Request $request, Tarea $tarea)
    {
        if ($denegado = $this->denegarSiNoEsGestorNiDueno($request, $tarea->persona_id)) {
            return $denegado;
        }

        if (!$tarea->soporte_cumplimiento || !Storage::disk('contratos')->exists($tarea->soporte_cumplimiento)) {
            return response()->json(['message' => 'Soporte no encontrado'], 404);
        }

        $contenido = Storage::disk('contratos')->get($tarea->soporte_cumplimiento);
        return $this->descargaPdf($contenido, 'soporte_' . $tarea->numero . '.pdf');
    }

    public function listarFotosTarea(Request $request, Tarea $tarea)
    {
        if ($denegado = $this->denegarSiNoEsGestorNiDueno($request, $tarea->persona_id)) {
            return $denegado;
        }

        return response()->json($tarea->fotos()->orderBy('created_at')->get());
    }

    public function verFotoTarea(Request $request, Tarea $tarea, TareaFoto $foto)
    {
        if ($denegado = $this->denegarSiNoEsGestorNiDueno($request, $tarea->persona_id)) {
            return $denegado;
        }

        if ($foto->tarea_id !== $tarea->id || !Storage::disk('contratos')->exists($foto->ruta)) {
            return response()->json(['message' => 'Foto no encontrada'], 404);
        }

        $contenido = Storage::disk('contratos')->get($foto->ruta);
        $extension = strtolower(pathinfo($foto->ruta, PATHINFO_EXTENSION));
        $mime = match ($extension) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png'         => 'image/png',
            'webp'        => 'image/webp',
            default       => 'image/jpeg',
        };

        return response($contenido, 200, [
            'Content-Type'        => $mime,
            'Content-Disposition' => 'inline; filename="' . ($foto->nombre_original ?? 'foto.jpg') . '"',
        ]);
    }

    public function descargarSoporteCompromiso(Request $request, TareaCompromiso $compromiso)
    {
        if ($denegado = $this->denegarSiNoEsGestorNiDueno($request, $compromiso->persona_id)) {
            return $denegado;
        }

        if (!$compromiso->soporte_cumplimiento || !Storage::disk('contratos')->exists($compromiso->soporte_cumplimiento)) {
            return response()->json(['message' => 'Soporte no encontrado'], 404);
        }

        $contenido = Storage::disk('contratos')->get($compromiso->soporte_cumplimiento);
        return $this->descargaPdf($contenido, 'soporte_compromiso_' . $compromiso->id . '.pdf');
    }

    public function listarFotosCompromiso(Request $request, TareaCompromiso $compromiso)
    {
        if ($denegado = $this->denegarSiNoEsGestorNiDueno($request, $compromiso->persona_id)) {
            return $denegado;
        }

        return response()->json($compromiso->fotos()->orderBy('created_at')->get());
    }

    public function verFotoCompromiso(Request $request, TareaCompromiso $compromiso, TareaFoto $foto)
    {
        if ($denegado = $this->denegarSiNoEsGestorNiDueno($request, $compromiso->persona_id)) {
            return $denegado;
        }

        if ($foto->compromiso_id !== $compromiso->id || !Storage::disk('contratos')->exists($foto->ruta)) {
            return response()->json(['message' => 'Foto no encontrada'], 404);
        }

        $contenido = Storage::disk('contratos')->get($foto->ruta);
        $extension = strtolower(pathinfo($foto->ruta, PATHINFO_EXTENSION));
        $mime = match ($extension) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png'         => 'image/png',
            'webp'        => 'image/webp',
            default       => 'image/jpeg',
        };

        return response($contenido, 200, [
            'Content-Type'        => $mime,
            'Content-Disposition' => 'inline; filename="' . ($foto->nombre_original ?? 'foto.jpg') . '"',
        ]);
    }
}
