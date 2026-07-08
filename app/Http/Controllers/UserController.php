<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Notifications\ContrasenaReseteadaNotification;
use App\Services\CoreApiClient;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class UserController extends Controller
{
    /**
     * Solo admin y super_admin pueden gestionar usuarios.
     * Devuelve una respuesta 403 si el usuario actual no tiene permiso, o null si sí lo tiene.
     */
    private function denegarSiNoEsAdmin()
    {
        if (!auth()->user()?->esAdmin()) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        return null;
    }

    /** Adjunta los datos de persona (del Core) a un usuario como atributo plano. */
    private function conPersona(User $user, ?array $persona = null): User
    {
        $core = app(CoreApiClient::class);
        $user->setAttribute('persona', $persona ?? ($user->persona_id ? $core->obtenerPersona($user->persona_id) : null));

        return $user;
    }

    public function index(Request $request)
    {
        if ($denegado = $this->denegarSiNoEsAdmin()) {
            return $denegado;
        }

        $perPage = $request->integer('per_page', 20);
        $query = User::query()->orderBy('created_at', 'desc');

        if ($request->search) {
            $query->where(fn($q) => $q
                ->where('name', 'like', "%{$request->search}%")
                ->orWhere('email', 'like', "%{$request->search}%")
            );
        }

        if ($request->rol) {
            $query->where('rol', $request->rol);
        }

        if ($request->estado) {
            $query->where('activo', $request->estado === 'activo');
        }

        $paginator = $query->paginate($perPage);
        $core = app(CoreApiClient::class);
        $personas = $core->buscarPersonasPorIds($paginator->getCollection()->pluck('persona_id')->filter()->all());

        $paginator->setCollection(
            $paginator->getCollection()->map(fn ($u) => $this->conPersona($u, $personas->get($u->persona_id)))
        );

        return response()->json($paginator);
    }

    public function show(User $usuario)
    {
        if ($denegado = $this->denegarSiNoEsAdmin()) {
            return $denegado;
        }

        return response()->json($this->conPersona($usuario));
    }

    // Solo actualiza el rol
    public function update(Request $request, User $usuario)
    {
        if ($denegado = $this->denegarSiNoEsAdmin()) {
            return $denegado;
        }

        if ($usuario->rol === 'super_admin') {
            return response()->json(['message' => 'No se puede cambiar el rol de un Super Admin.'], 403);
        }

        $request->validate([
            'rol' => 'required|in:super_admin,admin,digitador,funcionario,contratista,supervisor_contratos',
        ]);

        $usuario->update(['rol' => $request->rol]);

        return response()->json($this->conPersona($usuario));
    }

    public function resetPassword(Request $request, User $usuario)
    {
        if ($denegado = $this->denegarSiNoEsAdmin()) {
            return $denegado;
        }

        $password = Str::password(12);

        $usuario->update([
            'password' => $password,
            'must_change_password' => true,
        ]);

        $usuario->notify(new ContrasenaReseteadaNotification($password));

        return response()->json(['message' => 'Contraseña reseteada, se envió un correo con la nueva contraseña temporal']);
    }

    public function destroy(User $usuario)
    {
        if ($denegado = $this->denegarSiNoEsAdmin()) {
            return $denegado;
        }

        if ($usuario->rol === 'super_admin') {
            return response()->json(['message' => 'No se puede desactivar un Super Admin.'], 403);
        }

        $usuario->update(['activo' => false]);

        return response()->json(['message' => 'Usuario desactivado']);
    }

    public function reactivar(User $usuario)
    {
        if ($denegado = $this->denegarSiNoEsAdmin()) {
            return $denegado;
        }

        if ($usuario->rol === 'super_admin') {
            return response()->json(['message' => 'No se puede reactivar un Super Admin.'], 403);
        }

        $usuario->update(['activo' => true]);

        return response()->json(['message' => 'Usuario reactivado']);
    }

    public function cambiarContrasenaInicial(Request $request)
    {
        $request->validate([
            'password' => 'required|string|min:8|confirmed',
        ]);

        $user = $request->user();
        $user->update([
            'password' => $request->password,
            'must_change_password' => false,
        ]);

        // Recibir las credenciales por correo y poder iniciar sesión con ellas ya es
        // prueba de posesión de esa cuenta — exigir una verificación de correo aparte
        // después de esto sería redundante y deja al usuario bloqueado por el
        // middleware 'verified' en el resto de la app sin ningún paso que lo resuelva.
        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));
        }

        return response()->json([
            'message' => 'Contraseña actualizada correctamente',
            'user' => $user->fresh(),
        ]);
    }
}
