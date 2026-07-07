# Kronox

## Descripción general

Kronox es una aplicación web corporativa para la gestión de agenda, eventos y tareas en entidades gubernamentales. El sistema combina un backend en Laravel con una interfaz SPA en React y Vite, y está diseñado para administrar dependencias, sectores, salas, eventos, tareas, obligaciones de contratistas y usuarios mediante autenticación API.

## Tecnologías utilizadas

| Componente | Descripción | Versión |
| --- | --- | --- |
| Backend | Laravel Framework | ^13.0 |
| PHP | Motor de ejecución | ^8.3 |
| Base de datos | SQLite (dev) / PostgreSQL (prod) | — |
| Autenticación | Laravel Sanctum | ^4.0 |
| Frontend | React | ^18 |
| Build tool | Vite + @laravel/vite-plugin | ^8.0.0 |
| Estilos | Tailwind CSS | ^4.2.2 |
| Cliente HTTP | Axios | ^1.13.6 |
| Enrutamiento SPA | React Router DOM | ^7.13.2 |
| Calendario | FullCalendar React | ^6.1.20 |
| Iconos | Lucide React | ^1.0.1 |

## Requisitos previos

- PHP 8.3+
- Composer
- Node.js 22+ y npm
- PostgreSQL (producción) — en desarrollo se usa SQLite por defecto
- Extensiones PHP: `pdo`, `pdo_pgsql`, `openssl`, `mbstring`, `tokenizer`, `xml`, `ctype`, `json`

## Instalación

### Instalación rápida

```bash
git clone <REPOSITORIO_URL> saa-agenda
cd saa-agenda
cp .env.example .env
# Editar .env con las credenciales de base de datos
composer run setup
```

`composer run setup` instala dependencias PHP y JS, genera la clave de la app, ejecuta las migraciones y compila el frontend.

### Variables de entorno clave (`.env`)

```env
APP_NAME=Kronox
APP_URL=http://localhost

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=tu_base_datos
DB_USERNAME=tu_usuario
DB_PASSWORD=tu_contraseña

MAIL_MAILER=smtp
MAIL_HOST=...
MAIL_PORT=587
MAIL_USERNAME=...
MAIL_PASSWORD=...
MAIL_FROM_ADDRESS=noreply@tudominio.com
```

> Las variables `MAIL_*` son obligatorias en producción. Todas las notificaciones (invitaciones a eventos, asignación de tareas, verificación de email, restablecimiento de contraseña) se envían por correo mediante la cola de trabajos.

## Comandos de desarrollo

```bash
# Entorno completo: servidor Laravel + cola + Vite (concurrentes)
composer run dev

# Ejecutar pruebas
composer run test

# Ejecutar una prueba específica
php artisan test --filter NombreDelTest

# Linting PHP (Laravel Pint)
vendor/bin/pint

# Solo frontend
npm run dev
npm run build
```

> `composer run dev` inicia automáticamente el queue worker. Sin él, los correos electrónicos no se envían.

## Estructura del proyecto

| Ruta | Descripción |
| --- | --- |
| `app/Http/Controllers/` | Controladores de la API REST |
| `app/Models/` | Modelos Eloquent |
| `app/Notifications/` | Notificaciones por correo (todas en cola) |
| `database/migrations/` | Migraciones de base de datos |
| `resources/js/` | Código React: páginas, componentes y hooks |
| `resources/css/` | Estilos globales Tailwind CSS |
| `routes/api.php` | Definición de todas las rutas API |
| `routes/web.php` | Ruta wildcard que sirve la SPA |
| `nixpacks.toml` | Configuración de despliegue en Railway |

## Modelos de datos

| Modelo | Propósito |
| --- | --- |
| `User` | Usuarios del sistema y autenticación API |
| `Persona` | Datos personales base (nombre, apellido, foto) |
| `Funcionario` | Funcionarios públicos — extiende `Persona` |
| `Contratista` | Contratistas externos — extiende `Persona` |
| `Obligacion` | Obligaciones contractuales de un contratista |
| `Dependencia` | Unidades administrativas |
| `Sector` | Sectores internos asociados a dependencias |
| `NivelCargo` | Niveles jerárquicos de cargos |
| `Prioridad` | Clasificación de prioridades para eventos y tareas |
| `TipoEvento` | Categorías de eventos |
| `Sala` | Salas de reunión o atención |
| `Evento` | Eventos programados en la agenda |
| `EventoInvitado` | Invitados (por `persona_id`) vinculados a un evento |
| `Tarea` | Tareas asignadas al personal |
| `TareaCompromiso` | Compromisos surgidos de reuniones (vincula `Tarea` ↔ `Evento`) |

## Roles de usuario

| Rol | Acceso |
| --- | --- |
| `super_admin` | Reportes y administración general |
| `admin` | Parametrización y gestión de usuarios |
| `digitador` | Gestión de calendario, eventos y tareas |
| `funcionario` | Vista de mis eventos y tareas asignadas |
| `contratista` | Vista de mis eventos, tareas y obligaciones |

## Componentes React principales

### Páginas

- `Login.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx` — Autenticación
- `Dashboard.jsx` — Panel principal
- `Calendario.jsx` — Calendario completo para digitador
- `MisEventos.jsx` — Vista personal de eventos (funcionario / contratista)
- `Reportes.jsx` — Módulo de reportes
- `eventos/EventosList.jsx`, `eventos/EventoForm.jsx` — Gestión de eventos
- `tareas/TareasList.jsx`, `tareas/TareaForm.jsx` — Gestión de tareas
- `admin/` — Contratistas, Funcionarios, Usuarios, Dependencias, Sectores, Salas, Prioridades, NivelesCargo, TiposEvento

### Componentes compartidos

- `Layout.jsx` — Sidebar con navegación filtrada por rol, modo oscuro
- `CalendarioWidget.jsx` — Wrapper reutilizable de FullCalendar
- `EventoModal.jsx` — Modal de creación/edición de eventos con gestión de invitados
- `PrivateRoute.jsx` — Guard de autenticación

## Endpoints de API

### Públicos (sin autenticación)

```
POST /api/login
POST /api/register
POST /api/forgot-password
POST /api/reset-password
GET  /api/personas/{id}/foto
GET  /api/personas/{id}/foto/thumbnail
```

### Solo autenticados (`auth:sanctum`)

```
POST /api/logout
GET  /api/me
POST /api/email/resend
```

### Autenticados y verificados (`auth:sanctum` + `verified`)

**Parámetros base (CRUD completo)**
```
/api/dependencias
/api/sectores
/api/prioridades
/api/niveles-cargo
/api/tipos-evento
/api/salas
```

**Personas**
```
GET|PUT|PATCH|DELETE /api/personas/{id}
CRUD /api/funcionarios
POST /api/funcionarios/{id}/foto
POST /api/funcionarios/{id}/minuta   (subir PDF)
GET  /api/funcionarios/{id}/minuta   (descargar)
CRUD /api/contratistas
POST /api/contratistas/{id}/foto
POST /api/contratistas/{id}/minuta   (subir PDF)
GET  /api/contratistas/{id}/minuta   (descargar)
```

**Obligaciones de contratistas**
```
GET|POST /api/contratistas/{id}/obligaciones
PUT|DELETE /api/obligaciones/{id}
PATCH /api/obligaciones/{id}/estado   (pendiente | en_proceso | cumplida | vencida)
```

**Usuarios**
```
GET|PUT|DELETE /api/usuarios/{id}
POST /api/usuarios/{id}/reactivar
POST /api/usuarios/{id}/reset-password
```

**Eventos**
```
CRUD /api/eventos
POST /api/eventos/{id}/confirmar-asistencia
POST /api/eventos/{id}/documento-soporte   (subir archivo)
GET  /api/eventos/{id}/documento-soporte   (descargar)
POST /api/eventos/{id}/acta-reunion        (subir archivo)
GET  /api/eventos/{id}/acta-reunion        (descargar)
```

**Tareas**
```
CRUD /api/tareas
POST /api/tareas/{id}/cerrar
```

## Despliegue

El proyecto incluye `nixpacks.toml` para despliegue automático en Railway.

- **Setup**: instala PHP 8.4, Composer y Node.js 22
- **Install**: `npm install && composer install --ignore-platform-reqs`
- **Build**: `npm run build && composer install --no-dev --optimize-autoloader`
- **Start**: `php artisan migrate --force && php artisan serve --host=0.0.0.0 --port=$PORT`

> En producción también es necesario correr un queue worker (`php artisan queue:work`) para el envío de correos.

## Licencia

Proyecto licenciado bajo MIT.
