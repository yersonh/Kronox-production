<?php

namespace App\Providers;

use App\Models\Evento;
use App\Policies\EventoPolicy;
use Illuminate\Database\Events\MigrationsStarted;
use Illuminate\Database\Events\MigrationsEnded;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;
use Symfony\Component\Mailer\Bridge\Brevo\Transport\BrevoApiTransport;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Mail::extend('brevo', function (array $config) {
            return new BrevoApiTransport($config['key']);
        });

        Gate::policy(Evento::class, EventoPolicy::class);

        if (config('app.env') === 'production') {
            \URL::forceScheme('https');
        }

        if (DB::getDriverName() === 'pgsql') {
            Event::listen(MigrationsStarted::class, function () {
                DB::statement('SET session_replication_role = replica;');
            });

            Event::listen(MigrationsEnded::class, function () {
                DB::statement('SET session_replication_role = DEFAULT;');
            });
        }

        // Corrige Route Model Binding para palabras en español
        \Illuminate\Support\Facades\Route::singularResourceParameters([
            'sectores'     => 'sector',
            'prioridades'  => 'prioridad',
            'dependencias' => 'dependencia',
            'salas'        => 'sala',
            'tareas'       => 'tarea',
            'eventos'      => 'evento',
            'contratistas' => 'contratista',
            'funcionarios' => 'funcionario',
            'personas'     => 'persona',
            'usuarios'     => 'usuario',
        ]);
    }
}
