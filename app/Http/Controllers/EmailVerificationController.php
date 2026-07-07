<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use App\Models\User;

class EmailVerificationController extends Controller
{
    // Marcar el email del usuario como verificado.
    public function verify(Request $request)
    {
        $id = $request->route('id');
        $hash = $request->route('hash');
        $user = User::findOrFail($id);

        // Validar que el hash sea válido
        if (!hash_equals((string) $hash, sha1($user->getEmailForVerification()))) {
            return redirect(config('app.url') . '/login?verified=invalid');
        }

        if ($user->hasVerifiedEmail()) {
            return redirect(config('app.url') . '/login?verified=already');
        }

        if ($user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        return redirect(config('app.url') . '/login?verified=success');
    }
    //Reenviar el email de verificación al usuario.
    public function resend(Request $request)
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json([
                'message' => 'El correo ya está verificado.',
                'verified' => true
            ]);
        }

        $user->sendEmailVerificationNotification();

        return response()->json([
            'message' => 'Se ha enviado un nuevo enlace de verificación a tu correo.'
        ]);
    }
}
