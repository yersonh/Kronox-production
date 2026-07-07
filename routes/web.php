<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\EmailVerificationController;

// Email verification route (antes del wildcard)
Route::get('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
    ->middleware(['signed', 'throttle:6,1'])
    ->name('verification.verify');

// React SPA wildcard (debe ser lo último - excluye rutas web específicas)
Route::get('/{any}', function () {
    return view('welcome');
})->where('any', '^(?!email/).*');