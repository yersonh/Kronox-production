# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Project Is

SAA-Agenda is a government institutional agenda management system for scheduling events, tasks, and managing personnel (funcionarios and contratistas). It uses a Laravel REST API backend with a React SPA frontend.

## Commands

```bash
# Full dev environment (Laravel server + queue + scheduler + Vite, all concurrent)
composer run dev

# Fresh install (dependencies, key, migrations, frontend build)
composer run setup

# Run tests
composer run test

# Run a single test by name or class
php artisan test --filter TestName

# Lint PHP (Laravel Pint)
vendor/bin/pint

# Run scheduled commands manually
php artisan eventos:check-estado
php artisan eventos:notificar-proximos
php artisan compromisos:check-estado
php artisan contratistas:verificar-estado

# Frontend only
npm run dev
npm run build
```

## Architecture

### Request Flow

All routes not under `/api` are caught by a single Laravel wildcard route and served as the React SPA shell. React Router v7 handles all client-side navigation. All page routes are registered in `resources/js/app.jsx`.

API routes in `routes/api.php` are split:
- Public: `/api/login`, `/api/register`, `/api/forgot-password`, `/api/reset-password`, `/api/personas/{id}/foto`, `/api/entidad-config/logo`, `/api/entidad-config/public`
- `auth:sanctum` only (no `verified`): `/api/logout`, `/api/me`, `/api/email/resend`
- `auth:sanctum` + `verified`: everything else

### Authentication

Sanctum token-based auth. On login, the token and user object are stored in `localStorage` (or `sessionStorage`). The Axios instance in `resources/js/api/axios.js` injects the Bearer token on every request and redirects to `/login` on 401. The `storage.js` helper reads from localStorage first, falling back to sessionStorage — always use it instead of calling `localStorage` directly.

### Role System

Roles in the DB: `super_admin`, `admin`, `digitador`, `funcionario`, `contratista`, `supervisor_contratos`. `Layout.jsx` hides nav items client-side based on `user.rol` from localStorage — backend controllers must enforce the same checks via `EventoPolicy` or inline role checks. Nav visibility is declared per item via a `roles` array.

`supervisor_contratos` is a restricted role with access only to `/gestion-contratos` and `/admin/contratistas` — it cannot access events, tasks, or reports. Added via `2026_05_30_000005_add_supervisor_contratos_rol_to_users.php`.

### People Model Hierarchy

A `Persona` record is the base for both `Funcionario` and `Contratista`. Never create a `Persona` directly — always go through `FuncionarioController` or `ContratistaController`. When reading people from the API, nested names are at `record.persona.nombre` / `record.persona.apellido`, not at the top level.

`evento_invitados` stores `persona_id` (not `funcionario_id` or `contratista_id`). When mapping invitados from the API: `e.invitados?.map(i => i.persona_id)`.

### Evento Workflow

Eventos have a 6-state workflow enforced by `EventoPolicy` on the backend and field locking on the frontend:

```
programado → en_curso → finalizado → cerrado
     ↓
 aplazado / cancelado
```

- `programado → en_curso`: automatic via `eventos:check-estado` when `fecha_hora <= now()`
- `aplazado → en_curso`: automatic via `eventos:check-estado` when the new `fecha_hora` arrives (an aplazado event reactivates, it is not a terminal state)
- `programado → aplazado`: manual, via `POST /api/eventos/{id}/aplazar` (requires `razon_aplazamiento`; admin/super_admin only)
- `en_curso → finalizado`: manual, via `POST /api/eventos/{id}/finalizar` (only responsable or admin/super_admin)
- `en_curso → cerrado`: automatic via `eventos:check-estado` by abandonment at 00:00 of the next day, when the event's day has passed and nobody finalized it (`finalizado_en` stays NULL). `finalizado` events are **not** auto-closed.

**Permission rules (EventoPolicy):**
- `create`: digitador, admin, super_admin
- `update`: digitador, admin, super_admin — only when estado is `programado` or `en_curso`
- `delete`: admin, super_admin only
- `finalizar`: responsable (`user.persona_id === evento.responsable_id`) or admin/super_admin — only when `en_curso`
- `verConclusiones`: admin, digitador, super_admin (funcionario/contratista receive `conclusiones: null`)

**Frontend field locking:**
- `esReadOnly` = estado in `['cerrado', 'cancelado']` → all fields disabled, save hidden
- `soloConcluciones` = estado === `'finalizado'` → only conclusiones editable
- `puedeFinalizarEvento` = `en_curso` AND (`user.persona_id === evento.responsable_id` OR admin/super_admin)

### Responsable Field

`eventos.responsable_id` is a FK to `personas` (NOT NULL). There is no `responsable` varchar column — it was removed. Always eager-load the relation: `Evento::with('responsable')`. On the frontend, render the name as `evento.responsable?.nombre + ' ' + evento.responsable?.apellido` — never treat `evento.responsable` as a string.

### Scheduled Commands

Registered in `routes/console.php`:
- `eventos:check-estado` — every minute. Transitions `programado`/`aplazado` → `en_curso` when `fecha_hora` arrives; notifies the responsable 2h after `fecha_hora_fin` if still `en_curso` (once, via `notificado_pendiente_finalizar`); and closes `en_curso` → `cerrado` by abandonment at 00:00 of the next day (when the event's day has passed and nobody finalized it). It does **not** auto-close `finalizado` events — those stay `finalizado` until cleared manually. (There is no 48h rule; `finalizado_en` is only set on finalize and read by `AuditoriaController`.)
- `eventos:notificar-proximos` — every 15 minutes, emails invitados at 48h, 24h, 1h windows (uses `notificado_48h/24h/1h` flags on `evento_invitados`)
- `compromisos:check-estado` — daily, marks expired `TareaCompromiso` records as `vencida`
- `contratistas:verificar-estado` — daily at 07:00, updates `estado_contrato` to `vencido` and sends expiry alerts at 30d/15d/7d windows using `notificado_30d/15d/7d` flags on `contratistas`
- `perfil:recordar-documentos` — one-shot manual command; dispatches `VerificarDocumentosPendientesJob` for all active contratistas and funcionarios (used to backfill reminders for users created before the perfil feature existed)

### Policy & Authorization

`app/Policies/EventoPolicy.php` is registered in `AppServiceProvider`. The base `Controller` class uses `AuthorizesRequests` trait — `$this->authorize()` is available in all controllers.

### API Response Shape

Index endpoints return Laravel paginators. Always destructure defensively:
```js
const items = res.data.data ?? res.data;
```
Pass `?per_page=500` when loading full lists for dropdowns/filters to avoid pagination truncation.

### pdfExport.js API calls

`pdfExport.js` uses the same `api` Axios instance (`baseURL: '/api'`). Routes passed to it must **not** include the `/api/` prefix — e.g., use `/entidad-config/logo`, not `/api/entidad-config/logo`. Double-prefix was a recurring bug.

### State Management

No global state library. Each page manages its own state with `useState` + direct Axios calls. Client-side filtering/searching is done in-component.

### Frontend Structure

```
resources/js/
  app.jsx               — Router root, all page routes
  api/
    axios.js            — Pre-configured Axios instance (auth + 401 redirect)
    storage.js          — localStorage/sessionStorage helper
  hooks/
    useTheme.js         — isDark + system preference + localStorage override
  utils/
    pdfExport.js        — jsPDF export helpers (exportarAuxiliarInforme — the only remaining export function)
  components/
    Layout.jsx               — Sidebar nav, role-gated items, dark mode wrapper
    CalendarioWidget.jsx     — Reusable FullCalendar wrapper
    EventoModal.jsx          — Create/edit evento modal (invitados, file uploads, finalizar trigger)
    EventoDetalleModal.jsx   — Read-only event detail view with photo gallery and commitments list
    ModalFinalizar.jsx       — Finalizar evento modal (conclusiones + asistencias)
    ModalRechazarAsistencia.jsx — Reject attendance confirmation modal
    ModalAplazarEvento.jsx   — Postpone event modal (captures razon_aplazamiento)
    ModalAvisoFecha.jsx      — Warning dialog shown when editing fecha_hora on an existing evento
    ModalCumplirTarea.jsx    — Close task/fulfill commitment (conclusiones + soporte file + photos)
    TareaDetalleModal.jsx    — Task/commitment detail with photo viewer
    ModalExito.jsx           — Generic success confirmation modal
    SuccessModal.jsx         — Reusable creation-success modal (title, message, itemName, subMessage)
    MapaVisualizador.jsx     — Leaflet map with clustering, estado color-coding, GeoJSON export
    MapaPicker.jsx           — Interactive coordinate picker with Nominatim reverse-geocoding
    AlertaDistancia.jsx      — Watches user geolocation and alerts when near an event location
    DependenciasCell.jsx     — Renders/manages multiple dependencias for an event (many-to-many)
    ContratistaDetalleModal.jsx — Read-only contractor detail view (contract fields, obligaciones, renovaciones)
    ModalConfirmLider.jsx    — Confirm assigning/removing líder role for a contratista (props: contratista, loading, onConfirm, onClose)
    NexGovIAInfoModal.jsx    — Branding/info modal for NexGovIA S.A.S.
    PrivateRoute.jsx         — Auth guard
  pages/
    Calendario.jsx            — Full calendar for digitador
    CalendarioFuncionario.jsx — Personal calendar view at /mi-calendario (funcionario + contratista)
    Dashboard.jsx             — Real metrics from API (eventos por estado, tareas, compromisos)
    MisEventos.jsx            — Personal event list for funcionario + contratista
    MisTareas.jsx             — Personal task/commitment list for funcionario + contratista
    Compromisos.jsx           — Commitments list view (admin/digitador/super_admin); hits GET /reportes/compromisos
    Login.jsx                 — Login page (shows EntidadConfig logo/nombre from public endpoint)
    ReportesLider.jsx         — Daily activity reports for líderes and funcionarios; scoped to their dependencia
    Perfil.jsx                — "Mi Perfil" self-service page for contratistas (foto, minuta, 10 legal docs, datos contrato, obligaciones) and funcionarios (foto, minuta); roles: contratista, funcionario
    ForgotPassword.jsx        — Password reset request page
    ResetPassword.jsx         — Password reset confirmation page
    VerifyEmailSuccess.jsx    — Email verification success landing page
    GestionContratos.jsx      — Contractor contract management (supervisor_contratos + admin); full lifecycle view
    AuxiliarInforme.jsx       — Link events/tasks/commitments to obligations, upload planillas, generate PDF report
    eventos/                  — EventosList, EventoForm
    tareas/                   — TareasList, TareaForm
    admin/
      Contratistas.jsx, Funcionarios.jsx — file upload sections (minuta, docs, obligaciones) and Datos del Contrato are hidden on the creation form; shown only when editing an existing record
      Usuarios.jsx, EntidadConfig.jsx
      MapaEventos.jsx         — Map view of events, filterable by estado/dependencia/sector/date range
      Auditoria.jsx           — Expired-events audit dashboard (super_admin only)
      Estadisticas.jsx        — Activity stats by dependencia/contractor (admin/super_admin)
      Dependencias.jsx, Sectores.jsx, NivelesCargo.jsx, Salas.jsx, TiposEvento.jsx, Prioridades.jsx  — Parametrization tables (CRUD)
```

### Dark Mode

`useTheme.js` combines system preference with a `localStorage` override and applies the Tailwind `dark` class to `<html>`. Always destructure as `const { isDark } = useTheme()` and use it for conditional Tailwind classes — never hardcode dark styles.

### Key Custom Endpoints (non-CRUD)

```
POST /api/eventos/{id}/confirmar-asistencia
POST /api/eventos/{id}/aplazar              (razon_aplazamiento required; admin/super_admin only)
POST /api/eventos/{id}/finalizar            (conclusiones required, asistencias array)
POST /api/eventos/{id}/documento-soporte    (file upload)
GET  /api/eventos/{id}/documento-soporte    (file download)
POST /api/eventos/{id}/acta-reunion         (file upload)
GET  /api/eventos/{id}/acta-reunion         (file download)
POST /api/eventos/{id}/lista-asistencia     (file upload)
GET  /api/eventos/{id}/lista-asistencia     (file download)
GET  /api/eventos/{id}/fotos                (list photos)
POST /api/eventos/{id}/fotos                (upload photo)
GET  /api/eventos/{id}/fotos/{foto}         (view photo)
DELETE /api/eventos/{id}/fotos/{foto}       (delete photo)
POST /api/tareas/{id}/cerrar
GET  /api/tareas/{id}/fotos                 (list task photos)
GET  /api/tareas/{id}/fotos/{foto}          (view task photo)
GET  /api/tareas/{id}/soporte               (download task support file)
POST /api/compromisos/{id}/cumplir          (conclusiones + soporte + photos)
GET  /api/compromisos/{id}/fotos            (list commitment photos)
GET  /api/compromisos/{id}/fotos/{foto}     (view commitment photo)
GET  /api/compromisos/{id}/soporte          (download commitment support file)
GET  /api/tareas/mis-tareas                 (personal task list for auth user)
GET  /api/eventos/export/geojson            (all events as GeoJSON for map)
GET  /api/eventos/{id}/ubicaciones          (location history for event)
POST /api/usuarios/{id}/reactivar
POST /api/usuarios/{id}/reset-password
PATCH /api/obligaciones/{id}/estado
PATCH /api/contratistas/{id}/lider          (toggle es_lider flag; admin/super_admin only)
GET  /api/reportes-lider                    (list daily reports; super_admin sees all, others see own dependencia)
POST /api/reportes-lider                    (create daily report; contratista lider or funcionario)
POST /api/contratistas/{id}/minuta          (file upload)
GET  /api/contratistas/{id}/minuta          (file download)
POST /api/contratistas/{id}/foto            (file upload)
POST /api/funcionarios/{id}/minuta          (file upload)
GET  /api/funcionarios/{id}/minuta          (file download)
POST /api/funcionarios/{id}/foto            (file upload)
GET  /api/personas/{id}/foto                (public, no auth)
GET  /api/personas/{id}/foto/thumbnail      (public, no auth)
GET  /api/entidad-config/logo               (public, no auth — serves the entity's logo file)
GET  /api/entidad-config/public             (public, no auth — returns nombre, eslogan, logo_ruta)
GET  /api/entidad-config                    (auth required — full entity config)
PUT  /api/entidad-config                    (auth required — update entity config)
POST /api/entidad-config/logo               (auth required — upload logo)

GET  /api/reportes/compromisos                      (admin, digitador, super_admin)

GET  /api/perfil                                    (contratista or funcionario — own data)
POST /api/perfil/foto                               (upload own profile photo)
POST /api/perfil/minuta                             (upload own minuta; triggers Gemini auto-extraction for contratistas)
GET  /api/perfil/minuta                             (download own minuta)
POST /api/perfil/documentos/{tipo}                  (contratista only — upload one of 10 legal docs; resolucion-supervisor triggers Gemini extraction)
GET  /api/perfil/documentos/{tipo}                  (contratista only — download a legal doc)
PATCH /api/perfil/datos-contrato                    (contratista only — update numero_contrato, fecha_inicio, fecha_fin, objeto_contrato)
GET  /api/perfil/obligaciones                       (contratista only — own obligaciones)
POST /api/perfil/obligaciones                       (contratista only — create obligacion)
PUT  /api/perfil/obligaciones/{obligacion}          (contratista only — update description/dates)
PATCH /api/perfil/obligaciones/{obligacion}/estado  (contratista only — change to pendiente/en_proceso/cumplida)
DELETE /api/perfil/obligaciones/{obligacion}        (contratista only)

GET  /api/auxiliar-informe/mis-datos                (contratista — own data; includes planilla for the report period)
GET  /api/auxiliar-informe/contratista/{id}         (admin/digitador/super_admin — any contratista)
POST /api/auxiliar-informe/vincular                 (link item to obligacion; null obligacion_id removes the link)
POST /api/auxiliar-informe/analizar-soportes        (call pdf-api on up to 20 items; caches result in soporte_analisis)
DELETE /api/auxiliar-informe/vinculacion/{id}       (remove a specific vinculation record)
GET  /api/auxiliar-informe/planillas                (list contratista's uploaded planillas)
POST /api/auxiliar-informe/planillas                (upload planilla for a period; triggers /analyze-planilla on pdf-api)
GET  /api/auxiliar-informe/planillas/{planilla}     (download planilla PDF)
```

### Dependencias & Sectores (Many-to-Many)

`eventos.dependencia_id` and `eventos.sector_id` single-FK columns were replaced by pivot tables: `evento_dependencias` and `evento_sectores`. Always use the `dependencias()` and `sectores()` BelongsToMany relations on `Evento` — never a single scalar field. `DependenciasCell.jsx` handles rendering the multi-value list in the UI.

### Mapping & Geolocation

`/mapa-eventos` shows a Leaflet map (react-leaflet + react-leaflet-cluster) of all events color-coded by estado. Coordinates are stored per-event in the `evento_ubicaciones` table (model: `EventoUbicacion`), with multiple records allowed per event (`tipo='manual'`). `MapaPicker.jsx` lets editors pick a point with Nominatim reverse-geocoding. `AlertaDistancia.jsx` uses the browser Geolocation API and the Haversine formula to warn users when they are near an event.

### Tarea & Compromiso Fulfillment

Both `Tarea` and `TareaCompromiso` can be closed/fulfilled with evidence: `conclusiones` (text), `soporte_cumplimiento` (file), and multiple photos stored in the `tarea_fotos` table (nullable `tarea_id` / `compromiso_id`). Use `ModalCumplirTarea.jsx` for the UI flow.

### Reportes Diarios (Lider)

`ReporteDiario` (`reportes_diarios` table) records daily activity logs submitted by contratistas who have `es_lider = true` or by funcionarios. Fields: `contratista_id`, `dependencia_id`, `descripcion`, `fecha`, `lugar`. Visibility is scoped: `super_admin` sees all; everyone else sees only records from their own dependencia. `ReporteDiarioNotification` is sent on creation. The `es_lider` flag on `Contratista` is toggled via `PATCH /api/contratistas/{id}/lider` and confirmed by `ModalConfirmLider.jsx`.

### Obligaciones

Contratistas have obligations tracked in the `obligaciones` table (`contratista_id` FK). Valid estados: `pendiente`, `en_proceso`, `cumplida`, `vencida`. Routes are nested under `/api/contratistas/{contratista}/obligaciones` for index/store, and flat `/api/obligaciones/{obligacion}` for update/delete/cambiar-estado.

### Contract Lifecycle & Renewals

`Contratista` records track contract state via `estado_contrato` (`vigente`/`vencido`) with automatic expiry notifications at 30d/15d/7d windows (flags on the contratistas table).

`contrato_renovaciones` table records contract lifecycle events: `tipo` enum (`prorroga`, `adicion`, `nuevo_contrato`), snapshot of previous period dates and values, new period dates, amendment value, and optional supporting documents (added in `2026_05_31_000003`). Always use the `renovaciones()` relation on `Contratista`; never write raw SQL for this join.

### Notifications

All notifications implement `ShouldQueue`. The queue worker (`php artisan queue:listen`) must be running for any email to be delivered — `composer run dev` starts it automatically.

Notifications: `EventoInvitadoNotification`, `EventoProximoNotification` (48h/24h/1h reminders), `TareaAsignadaNotification`, `AsistenciaConfirmadaNotification`, `CustomVerifyEmail`, `ResetPasswordNotification`, `ContratoVencimientoNotification` (30d/15d/7d warnings), `ContratoVencidoNotification` (on expiry), `ContratoRenovadoNotification` (on renewal), `ReporteDiarioNotification` (on daily report submission), `RecordatorioDocumentosNotification` (sent by `VerificarDocumentosPendientesJob` when a user has pending documents — lists faltantes and links to `/perfil`).

`VerificarDocumentosPendientesJob` is dispatched at 24h, 72h, and 7 days after a new contratista or funcionario is created. It checks which documents are still missing and sends `RecordatorioDocumentosNotification` only if there are faltantes.

### EntidadConfig

`EntidadConfig` is a singleton table storing the institution's branding: `nombre`, `nit`, `direccion`, `eslogan`, `telefono`, `email`, `latitude`, `longitude`, `ubicacion_descripcion`, `logo_ruta`, `logo_nombre_original`. There is always exactly one row. The `admin/entidad` route in the SPA (page `EntidadConfig.jsx`) manages it. The logo is served publicly and shown on the login page.

### PerfilController

`app/Http/Controllers/PerfilController.php` handles all self-service profile actions. Authorization is implicit: it reads `$request->user()->persona_id` and resolves the `Contratista` or `Funcionario` from that — no `{id}` in the URL. Key behaviors:

- `resolverPerfil()` returns `['tipo' => 'contratista'|'funcionario'|null, 'model' => $model]`
- `show()` returns a flat JSON with personal info, contract fields, `documentos_estado` (array of bool per document type, keys use underscores, e.g. `paz_salvo_parafiscales`), and `tipo_usuario`
- `fecha_suscripcion` is a **varchar** on `contratistas` (e.g. "21 ENE 2026"), not a date column — never pass it through `new Date()` on the frontend; display as plain text
- `fecha_inicio` / `fecha_fin` are cast as `date` on `Contratista` → serialized as ISO 8601 → frontend must `.slice(0, 10)` before setting `<input type="date">` value
- `emitirDescargaPdf()` is named this way (not `descargaPdf`) to avoid a visibility conflict with the `protected function descargaPdf()` already defined in the base `Controller` class
- `hacerBackup`, `extraerDatosMinuta`, `extraerDatosSupervisor` are `protected` (not private) — required because the base class visibility rules propagate to subclasses
- `documentos_estado` on the `Contratista` model uses underscore keys; `DOCUMENTOS` const in `PerfilController` uses hyphen keys (`paz-salvo-parafiscales`). On the frontend, always translate: `tipo.replace(/-/g, '_')` before looking up in `documentos_estado`

### FotoService

`app/Services/FotoService.php` centralises photo storage logic shared by `EventoController`, `TareaController`, and `PerfilController`. Use it when adding new file/photo upload flows rather than duplicating storage logic in controllers.

### PdfApiService

`app/Services/PdfApiService.php` calls the external `pdf-api` microservice (`POST /analyze`) to extract and analyze PDF support documents via Gemini. Called by `AuxiliarInformeController::analizarSoportes`. The result is cached in the `soporte_analisis` JSON column on `Evento`, `Tarea`, and `TareaCompromiso` — the cached value is returned on subsequent calls without re-calling the API. The service URL is read from `config('services.pdf_api.url')`, set via `PDF_API_URL` env var (default: `https://kronox-pdf-api-production.up.railway.app`).

### Auxiliar de Informe

Feature that lets a contratista link their events/tasks/commitments to contract obligations and generate a formal institutional PDF report.

- **Model:** `InformeVinculacion` (`informe_vinculaciones` table) — pivot between `(contratista_id, item_type, item_id)` and `obligacion_id`. `item_type` is `evento|tarea|compromiso`.
- **Controller:** `AuxiliarInformeController` — `misDatos` (own data) and `datosContratista` (admin view). Returns `{ contratista, obligaciones, items, planilla }`. The `planilla` field comes from `ContratistaPlanilla` matched by the report period (`hasta` month first, then `desde` month).
- **Planillas:** `ContratistaPlanilla` stores uploaded planillas de pago per `(contratista_id, periodo)`. When uploaded, pdf-api `/analyze-planilla` is called automatically and the 10 social-security fields are saved to the record. Period format is `YYYY-MM`.
- **PDF generation:** `exportarAuxiliarInforme()` in `pdfExport.js` generates a full institutional document:
  - Header: logo | contratista name + CPS number | cuenta (month relative to contract start) / página
  - Tabla 1: unified contract + supervisor info (14 rows); contract fields come from `contratista.*` extracted at minuta upload; supervisor fields from `supervisor_*` extracted at resolución supervisor upload; periodo del informe from `desde`/`hasta` filter; ciudad from hardcoded "Monterrey"
  - Section "1. CUMPLIMIENTO DE LAS OBLIGACIONES..." + Tabla 2 (continuous table of all obligations with MUNICIPIO / DESCRIPCION DEL CUMPLIMIENTO / SOPORTE / photos rows)
  - Tabla 7 + Tabla 8 (planilla discrimination and social security compliance) — only rendered when a planilla exists for the period
  - NexGovIA aviso image at the end (`/images/avisodeinforme.png`)
- **Scope:** Only contratistas have obligaciones; the page is inaccessible to other roles.

### Document Auto-Extraction Pattern

When specific documents are uploaded, `ContratistaController` automatically calls `PdfApiService` and saves extracted fields to the `contratistas` table. Extraction failures are silent (try/catch with no rethrow). Extracted fields:

| Document uploaded | Endpoint called | Fields saved on `contratistas` |
|---|---|---|
| Minuta de Contrato (`POST /contratistas/{id}/minuta` **or** `POST /api/perfil/minuta`) | `/analyze-minuta` | `valor_contrato`, `duracion_contrato`, `fecha_suscripcion`; also fills `numero_contrato` / `objeto_contrato` if currently empty |
| Resolución Supervisor (`POST /contratistas/{id}/documentos/resolucion-supervisor` **or** `POST /api/perfil/documentos/resolucion-supervisor`) | `/analyze-supervisor` | `supervisor_nombre`, `supervisor_cedula`, `supervisor_fecha_adicion_prorroga`, `supervisor_valor_adicion_prorroga` |
| Planilla de Pago (`POST /auxiliar-informe/planillas`) | `/analyze-planilla` | 10 fields on `contratista_planillas`: `planilla_numero`, `fondo_pension`, `arl`, `eps`, `ibc`, `valor_pension`, `valor_salud`, `valor_arl`, `valor_total`, `fecha_pago` |

The extraction logic lives in `PerfilController::extraerDatosMinuta()` and `extraerDatosSupervisor()` (called from both admin `ContratistaController` and self-service `PerfilController`). The same extraction triggers when a new minuta is uploaded during contract renewal.

### Tarea States

`Tarea` has `estado` and `cerrado_at` / `cerrado_por` set when closed via the `/cerrar` endpoint. `TareaCompromiso` links a `Tarea` to an `Evento` (a commitment arising from a meeting).

### Environment Variables

Key non-obvious variables needed beyond the defaults in `.env.example`:
- `VITE_MAPTILER_KEY` — required for tile layers in `MapaVisualizador.jsx` and `MapaPicker.jsx`; without it the map renders but tiles may fail
- `BREVO_API_KEY` — production email delivery via Brevo API (`symfony/brevo-mailer`); set `MAIL_MAILER=brevo` in prod
- `SMTP_FROM` — sender email address (e.g. `noreply@tudominio.com`)
- `SMTP_FROM_NAME` — sender display name
- `PDF_API_URL` — URL of the `pdf-api` microservice; defaults to the Railway production URL

### Deploy (Railway)

`Procfile` has a single process `web: bash start.sh`. `start.sh` runs migrate, then spawns `schedule:work` and `queue:work` as background processes, and finally starts `php artisan serve` in the foreground. `nixpacks.toml` handles build phases. SQLite in dev, PostgreSQL in prod — migrations use `if (DB::getDriverName() === 'pgsql')` guards for raw SQL statements.

**Railway PHP upload limits gotcha:** `configure-php.sh` runs during the Nixpacks build phase to append upload limits to `php.ini`, but the Nix store is read-only so the settings never take effect. The PHP built-in server (spawned by `artisan serve`) ends up with the default `upload_max_filesize = 2M`. Any file > 2MB will fail with `validation.uploaded` ("Subir X ha fallado"). The fix is still pending — a reliable solution must set limits on the actual serving process, not at build time.

### File Upload Validation

All file upload endpoints use `file|max:51200` with no MIME type validation. The `mimes:pdf` rule was removed because Railway's `finfo` extension misdetects certain scanned PDFs (image-based PDFs from scanners), causing valid files to be rejected. The 50MB `max` is intentional to accommodate scanned documents.

### Testing

```bash
php artisan test --filter EventoPolicyTest    # Policy + endpoint tests
php artisan test --filter CheckEventosEstadoTest  # Scheduling command tests
```

`UserFactory` creates a linked `Persona` via `Persona::factory()` (persona_id is NOT NULL). `Persona` model uses `HasFactory`. Tests use `RefreshDatabase` with SQLite in-memory.

## Tech Stack

- **Backend:** Laravel 13, PHP, Sanctum, SQLite (dev) / PostgreSQL (prod)
- **Frontend:** React 18, React Router DOM v7, Tailwind CSS v4, Lucide icons, FullCalendar v6, jsPDF, Leaflet v1.9 (react-leaflet v5 + react-leaflet-cluster v4)
- **Build:** Vite with `@laravel/vite-plugin`
- **Deploy:** Railway via Nixpacks (`nixpacks.toml` + `Procfile`)
