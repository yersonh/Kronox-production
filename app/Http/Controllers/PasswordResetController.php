<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\User;
use App\Notifications\ResetPasswordNotification;

class PasswordResetController extends Controller
{
    public function forgot(Request $request)
    {
        // No usamos 'exists' para no revelar qué correos están registrados (user enumeration).
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        // Solo enviamos el correo si el usuario existe, pero respondemos siempre igual.
        if ($user) {
            $token = Str::random(60);

            DB::table('password_reset_tokens')->updateOrInsert(
                ['email' => $request->email],
                [
                    'token' => $token,
                    'created_at' => now(),
                ]
            );

            $user->notify(new ResetPasswordNotification($token));
        }

        return response()->json([
            'message' => 'Si el correo está registrado, recibirás un enlace de restablecimiento.'
        ]);
    }

    public function reset(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'token' => 'required',
            'password' => 'required|min:8|confirmed',
        ]);

        $passwordReset = DB::table('password_reset_tokens')
            ->where('email', $request->email)
            ->where('token', $request->token)
            ->first();

        $user = User::where('email', $request->email)->first();

        if (!$passwordReset || !$user) {
            return response()->json(['message' => 'Token inválido o ha expirado.'], 400);
        }

        // Validar que no haya pasado más de 60 minutos
        if (now()->diffInMinutes($passwordReset->created_at) > 60) {
            DB::table('password_reset_tokens')->where('email', $request->email)->delete();
            return response()->json(['message' => 'El enlace ha expirado. Solicita uno nuevo.'], 400);
        }

        $user->update(['password' => $request->password]);

        DB::table('password_reset_tokens')->where('email', $request->email)->delete();

        return response()->json([
            'message' => 'Contraseña actualizada exitosamente.'
        ]);
    }
}
