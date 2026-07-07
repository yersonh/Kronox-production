<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\PersonaFotoController;
use App\Http\Controllers\EmailVerificationController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\DependenciaController;
use App\Http\Controllers\SectorController;
use App\Http\Controllers\ContratistaController;
use App\Http\Controllers\PrioridadController;
use App\Http\Controllers\EventoController;
use App\Http\Controllers\TareaController;
use App\Http\Controllers\PersonaController;
use App\Http\Controllers\FuncionarioController;
use App\Http\Controllers\NivelCargoController;
use App\Http\Controllers\SalaController;
use App\Http\Controllers\TipoEventoController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ObligacionController;
use App\Http\Controllers\ReporteController;
use App\Http\Controllers\ReporteDiarioController;
use App\Http\Controllers\EntidadConfigController;
use App\Http\Controllers\AuxiliarInformeController;
use App\Http\Controllers\AuditoriaController;
use App\Http\Controllers\EstadisticasController;
use App\Http\Controllers\PerfilController;

// ============================================
// RUTAS PÚBLICAS — Fotos de personas (sin auth, las fotos de perfil no son sensibles)
// ============================================
Route::get('/personas/{personaId}/foto',           [PersonaFotoController::class, 'ver']);
Route::get('/personas/{personaId}/foto/thumbnail', [PersonaFotoController::class, 'thumbnail']);
Route::get('/entidad-config/logo',               [EntidadConfigController::class, 'verLogo']);
Route::get('/entidad-config/public',             [EntidadConfigController::class, 'verPublico']);

// ============================================
// RUTAS PÚBLICAS (sin autenticación)
// ============================================
Route::post('/login', [AuthController::class, 'login'])
    ->middleware('throttle:5,1'); // Máximo 5 intentos por minuto

Route::post('/forgot-password', [PasswordResetController::class, 'forgot'])
    ->middleware('throttle:3,1');

Route::post('/reset-password', [PasswordResetController::class, 'reset'])
    ->middleware('throttle:3,1');

// ============================================
// RUTAS PROTEGIDAS POR TOKEN (auth:sanctum)
// ============================================
Route::middleware('auth:sanctum')->group(function () {

    // Auth básico
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/cambiar-contrasena-inicial', [UserController::class, 'cambiarContrasenaInicial']);

    // Verificación de email
    Route::post('/email/resend', [EmailVerificationController::class, 'resend'])
        ->middleware('throttle:3,1');

    Route::middleware('verified')->group(function () {

        // Perfil propio (contratistas y funcionarios)
        Route::get('perfil', [PerfilController::class, 'show']);
        Route::post('perfil/foto', [PerfilController::class, 'subirFoto']);
        Route::post('perfil/minuta', [PerfilController::class, 'subirMinuta']);
        Route::get('perfil/minuta', [PerfilController::class, 'descargarMinuta']);
        Route::post('perfil/documentos/{tipo}', [PerfilController::class, 'subirDocumento']);
        Route::get('perfil/documentos/{tipo}', [PerfilController::class, 'descargarDocumento']);
        Route::patch('perfil/datos-contrato', [PerfilController::class, 'actualizarDatosContrato']);
        Route::get('perfil/obligaciones', [PerfilController::class, 'listarObligaciones']);
        Route::post('perfil/obligaciones', [PerfilController::class, 'crearObligacion']);
        Route::put('perfil/obligaciones/{obligacion}', [PerfilController::class, 'actualizarObligacion']);
        Route::delete('perfil/obligaciones/{obligacion}', [PerfilController::class, 'eliminarObligacion']);

        // Parámetros base — dependencias/sectores/niveles de cargo son catálogos del Core (solo lectura aquí)
        Route::get('dependencias', [DependenciaController::class, 'index']);
        Route::get('dependencias/{dependencia}', [DependenciaController::class, 'show']);

        Route::get('sectores', [SectorController::class, 'index']);
        Route::get('sectores/{sector}', [SectorController::class, 'show']);

        Route::get('prioridades', [PrioridadController::class, 'index']);
        Route::post('prioridades', [PrioridadController::class, 'store']);
        Route::get('prioridades/{prioridad}', [PrioridadController::class, 'show']);
        Route::put('prioridades/{prioridad}', [PrioridadController::class, 'update']);
        Route::patch('prioridades/{prioridad}', [PrioridadController::class, 'update']);
        Route::delete('prioridades/{prioridad}', [PrioridadController::class, 'destroy']);

        Route::get('niveles-cargo', [NivelCargoController::class, 'index']);
        Route::get('niveles-cargo/{nivelCargo}', [NivelCargoController::class, 'show']);
        Route::apiResource('tipos-evento', TipoEventoController::class);
        Route::apiResource('salas', SalaController::class);

        // Personas
        Route::get('personas', [PersonaController::class, 'index']);
        Route::get('personas/{personaId}', [PersonaController::class, 'show']);
        Route::delete('personas/{personaId}', [PersonaController::class, 'destroy']);
        Route::apiResource('funcionarios', FuncionarioController::class);
        Route::post('funcionarios/{funcionario}/minuta', [FuncionarioController::class, 'subirMinuta']);
        Route::get('funcionarios/{funcionario}/minuta', [FuncionarioController::class, 'descargarMinuta']);
        Route::apiResource('contratistas', ContratistaController::class);
        Route::patch('contratistas/{contratista}/lider',  [ContratistaController::class, 'asignarLider']);
        Route::post('contratistas/{contratista}/minuta',   [ContratistaController::class, 'subirMinuta']);
        Route::get('contratistas/{contratista}/minuta',    [ContratistaController::class, 'descargarMinuta']);
        Route::delete('contratistas/{contratista}/minuta', [ContratistaController::class, 'eliminarMinuta']);
        Route::post('contratistas/{contratista}/foto',     [ContratistaController::class, 'subirFoto']);
        Route::post('contratistas/{contratista}/documentos/{tipo}',   [ContratistaController::class, 'subirDocumento']);
        Route::get('contratistas/{contratista}/documentos/{tipo}',    [ContratistaController::class, 'descargarDocumento']);
        Route::delete('contratistas/{contratista}/documentos/{tipo}', [ContratistaController::class, 'eliminarDocumento']);
        Route::patch('contratistas/{contratista}/renovar',    [ContratistaController::class, 'renovar']);
        Route::patch('contratistas/{contratista}/suspender',  [ContratistaController::class, 'suspender']);
        Route::patch('contratistas/{contratista}/reactivar',  [ContratistaController::class, 'reactivar']);
        Route::get('contratistas/{contratista}/historial',    [ContratistaController::class, 'historial']);
        Route::get('contratistas/{contratista}/renovaciones/{renovacion}/documentos/{tipo}', [ContratistaController::class, 'descargarDocumentoRenovacion']);
        Route::post('funcionarios/{funcionario}/foto',   [FuncionarioController::class, 'subirFoto']);

        // Obligaciones de contratistas
        Route::get('contratistas/{contratista}/obligaciones',    [ObligacionController::class, 'index']);
        Route::post('contratistas/{contratista}/obligaciones',   [ObligacionController::class, 'store']);
        Route::put('obligaciones/{obligacion}',                  [ObligacionController::class, 'update']);
        Route::delete('obligaciones/{obligacion}',               [ObligacionController::class, 'destroy']);

        // Usuarios
        Route::get('usuarios', [UserController::class, 'index']);
        Route::get('usuarios/{usuario}', [UserController::class, 'show']);
        Route::put('usuarios/{usuario}', [UserController::class, 'update']);
        Route::delete('usuarios/{usuario}', [UserController::class, 'destroy']);
        Route::post('usuarios/{usuario}/reactivar', [UserController::class, 'reactivar']);
        Route::post('usuarios/{usuario}/reset-password', [UserController::class, 'resetPassword']);

        // Eventos
        Route::get('eventos/export/geojson',                    [EventoController::class, 'exportarGeoJson']);
        Route::apiResource('eventos', EventoController::class);
        Route::get('entidad-config',        [EntidadConfigController::class, 'show']);
        Route::put('entidad-config',        [EntidadConfigController::class, 'update']);
        Route::post('entidad-config/logo',  [EntidadConfigController::class, 'subirLogo']);

        Route::post('eventos/{evento}/confirmar-asistencia',    [EventoController::class, 'confirmarAsistencia']);
        Route::post('eventos/{evento}/aplazar',                 [EventoController::class, 'aplazar']);
        Route::post('eventos/{evento}/finalizar',               [EventoController::class, 'finalizar']);
        Route::post('eventos/{evento}/documento-soporte',       [EventoController::class, 'subirDocumentoSoporte']);
        Route::get('eventos/{evento}/documento-soporte',        [EventoController::class, 'descargarDocumentoSoporte']);
        Route::post('eventos/{evento}/acta-reunion',            [EventoController::class, 'subirActaReunion']);
        Route::get('eventos/{evento}/acta-reunion',             [EventoController::class, 'descargarActaReunion']);
        Route::post('eventos/{evento}/lista-asistencia',        [EventoController::class, 'subirListaAsistencia']);
        Route::get('eventos/{evento}/lista-asistencia',         [EventoController::class, 'descargarListaAsistencia']);
        Route::get('eventos/{evento}/fotos',                    [EventoController::class, 'listarFotos']);
        Route::post('eventos/{evento}/fotos',                   [EventoController::class, 'subirFotos']);
        Route::get('eventos/{evento}/fotos/{foto}',             [EventoController::class, 'verFoto']);
        Route::delete('eventos/{evento}/fotos/{foto}',          [EventoController::class, 'eliminarFoto']);
        Route::get('eventos/{evento}/ubicaciones',              [EventoController::class, 'listarUbicaciones']);

        // Tareas
        Route::apiResource('tareas', TareaController::class);
        Route::post('tareas/{tarea}/cerrar',             [TareaController::class, 'cerrar']);
        Route::get('tareas/{tarea}/soporte',             [TareaController::class, 'descargarSoporteTarea']);
        Route::get('tareas/{tarea}/fotos',               [TareaController::class, 'listarFotosTarea']);
        Route::get('tareas/{tarea}/fotos/{foto}',        [TareaController::class, 'verFotoTarea']);
        Route::get('mis-tareas',                         [TareaController::class, 'misTareas']);
        Route::post('compromisos/{compromiso}/cumplir',  [TareaController::class, 'cumplirCompromiso']);
        Route::get('compromisos/{compromiso}/soporte',   [TareaController::class, 'descargarSoporteCompromiso']);
        Route::get('compromisos/{compromiso}/fotos',     [TareaController::class, 'listarFotosCompromiso']);
        Route::get('compromisos/{compromiso}/fotos/{foto}', [TareaController::class, 'verFotoCompromiso']);

        Route::get('reportes/compromisos', [ReporteController::class, 'compromisos']);

        // Reportes diarios de lider (contratistas lider crean, todos los de la dependencia ven)
        Route::get('reportes-lider',  [ReporteDiarioController::class, 'index']);
        Route::post('reportes-lider', [ReporteDiarioController::class, 'store']);

        // Auxiliar Informe — vincular eventos/tareas/compromisos a obligaciones
        Route::get('auxiliar-informe/mis-datos',                   [AuxiliarInformeController::class, 'misDatos']);
        Route::get('auxiliar-informe/contratista/{contratista}',   [AuxiliarInformeController::class, 'datosContratista']);
        Route::post('auxiliar-informe/vincular',                   [AuxiliarInformeController::class, 'vincular']);
        Route::post('auxiliar-informe/analizar-soportes',          [AuxiliarInformeController::class, 'analizarSoportes']);
        Route::delete('auxiliar-informe/vinculacion/{vinculacion}', [AuxiliarInformeController::class, 'desvincular']);
        Route::get('auxiliar-informe/planillas',                    [AuxiliarInformeController::class, 'listarPlanillas']);
        Route::post('auxiliar-informe/planillas',                   [AuxiliarInformeController::class, 'subirPlanilla']);
        Route::get('auxiliar-informe/planillas/{planilla}',         [AuxiliarInformeController::class, 'descargarPlanilla']);

        // Auditoría (solo super_admin — verificación inline)
        Route::get('auditoria/eventos-vencidos', [AuditoriaController::class, 'eventosVencidos']);

        // Estadísticas (solo super_admin — verificación inline)
        Route::get('estadisticas/panorama',       [EstadisticasController::class, 'panorama']);
        Route::get('estadisticas/dependencias',   [EstadisticasController::class, 'actividadesPorDependencia']);
        Route::get('estadisticas/personas',       [EstadisticasController::class, 'personas']);
        Route::get('estadisticas/mapa-calor',     [EstadisticasController::class, 'mapaCalor']);

    });

});