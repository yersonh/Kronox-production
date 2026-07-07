<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\CoreApiClient;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email'    => 'required|email',
            'password' => 'required',
        ]);

        $user = User::with('contratista')->where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Credenciales incorrectas'], 401);
        }

        // Bloquear contratistas con contrato vencido, independientemente del flag activo
        if ($user->rol === 'contratista') {
            $contratista = $user->contratista;
            if ($contratista && $contratista->estado_contrato === 'vencido') {
                // Sincronizar activo por si el cron no lo hizo
                if ($user->activo) {
                    $user->update(['activo' => false]);
                }
                return response()->json([
                    'message' => 'Tu contrato ha vencido. Comunícate con el área de contratación para renovarlo.',
                ], 403);
            }
        }

        if (!$user->activo) {
            return response()->json([
                'message' => 'Tu acceso está desactivado. Si tienes un contrato vigente, comunícate con el área de contratación.',
            ], 403);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user'  => $user,
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Sesión cerrada correctamente']);
    }

    public function me(Request $request)
    {
        $user = $request->user()->load(['contratista', 'funcionario']);
        $core = app(CoreApiClient::class);

        $arr = $user->toArray();
        $arr['persona'] = $user->persona_id ? $core->obtenerPersona($user->persona_id) : null;

        if ($user->contratista) {
            $arr['contratista']['dependencia'] = $user->contratista->dependencia_id ? $core->obtenerDependencias()->get($user->contratista->dependencia_id) : null;
            $arr['contratista']['sector'] = $user->contratista->sector_id ? $core->obtenerSectores()->get($user->contratista->sector_id) : null;
        }

        if ($user->funcionario) {
            $arr['funcionario']['dependencia'] = $user->funcionario->dependencia_id ? $core->obtenerDependencias()->get($user->funcionario->dependencia_id) : null;
            $arr['funcionario']['sector'] = $user->funcionario->sector_id ? $core->obtenerSectores()->get($user->funcionario->sector_id) : null;
        }

        return response()->json($arr);
    }
}