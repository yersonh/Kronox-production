# Manual de Usuario — Administrador

## 1. ¿Quién usa este manual?

El **Administrador** gestiona la configuración de fondo del sistema: parametrización
(dependencias, sectores, cargos, tipos de evento, salas, prioridades), datos de la entidad,
y la administración de personas (funcionarios, contratistas) y usuarios. También puede
crear/editar eventos igual que un digitador cuando sea necesario.

## 2. Iniciar sesión

1. Ingresa a la URL del sistema con tu correo y contraseña. 
2. Pulsa **Iniciar sesión**.

📸 **[CAPTURA 1: Pantalla de login]**

## 3. Menú lateral

Como Administrador verás:

- **Dashboard**
- Sección **Parametrización**: Dependencias, Sectores, Niveles de Cargo, Tipos de Evento,
  Salas, Prioridades, Datos de la Entidad
- Sección **Administración**: Contratistas, Funcionarios, Usuarios

📸 **[CAPTURA 2: Menú lateral con las secciones "Parametrización" y "Administración" desplegadas]**

## 4. Parametrización

Estas pantallas son tablas CRUD simples (crear, editar, eliminar). El flujo es el mismo en
todas:

1. Entra a la pantalla (ej. **Dependencias**).
2. Pulsa **Nuevo** / **+ Agregar** para crear un registro; completa el formulario y guarda.
3. Pulsa el ícono de lápiz sobre una fila para editarla.
4. Pulsa el ícono de basura para eliminarla (se pedirá confirmación).

📸 **[CAPTURA 3: Tabla de Dependencias con el botón "Nuevo"]**
📸 **[CAPTURA 4: Formulario de creación/edición de una Dependencia]**

Repite este mismo patrón para:

- **Sectores** — sectores geográficos/administrativos.
- **Niveles de Cargo** — niveles jerárquicos usados al crear funcionarios.
- **Tipos de Evento** — categorías usadas al crear eventos.
- **Salas** — espacios físicos disponibles para agendar eventos.
- **Prioridades** — niveles de prioridad para eventos/tareas.

### Datos de la Entidad (`/admin/entidad`)

Aquí se configura la información institucional que aparece en el login, encabezados de PDF, etc.

1. Entra a **Datos de la Entidad**.
2. Completa nombre, NIT, dirección, eslogan, teléfono, correo, ubicación (latitud/longitud).
3. Sube el **logo** de la institución.
4. Guarda los cambios.

📸 **[CAPTURA 5: Formulario de Datos de la Entidad con el logo cargado]**

## 5. Administración de Contratistas (`/admin/contratistas`)

1. Entra a **Contratistas**.
2. Pulsa **Nuevo Contratista** y completa los datos personales, de contrato y de contacto.
   - Los campos de **Datos del Contrato** y las secciones de archivos (minuta, documentos,
     obligaciones) solo aparecen **al editar** un contratista ya creado, no en el formulario
     de creación.
3. Guarda para crear el registro base (Persona + Contratista).
4. Vuelve a abrir el registro para:
   - Subir **foto**, **minuta de contrato** (dispara extracción automática de datos por IA:
     valor, duración, fecha de suscripción, número y objeto de contrato).
   - Subir los **documentos legales** requeridos, incluida la **Resolución del Supervisor**
     (dispara extracción automática de los datos del supervisor).
   - Registrar/editar **obligaciones** contractuales.
   - Marcar/desmarcar el contratista como **líder** (`es_lider`) — habilita que esa persona
     pueda enviar reportes diarios de actividad. Se pide confirmación en un modal.
   - Consultar **renovaciones de contrato** (prórrogas, adiciones, nuevo contrato).

📸 **[CAPTURA 6: Listado de Contratistas]**
📸 **[CAPTURA 7: Formulario de creación de Contratista (datos básicos)]**
📸 **[CAPTURA 8: Vista de edición de un Contratista con las pestañas de documentos y obligaciones]**

## 6. Administración de Funcionarios (`/admin/funcionarios`)

Mismo patrón que Contratistas, pero sin obligaciones ni datos de contrato:

1. Entra a **Funcionarios**.
2. Crea el registro con datos básicos (persona, dependencia, sector, cargo).
3. Edita para subir foto y minuta.

📸 **[CAPTURA 10: Listado de Funcionarios]**
📸 **[CAPTURA 11: Formulario de creación de Funcionario]**

## 7. Administración de Usuarios (`/admin/usuarios`)

Gestiona las cuentas de acceso al sistema (usuario + rol), vinculadas a una Persona.

1. Entra a **Usuarios**.
2. Crea un usuario asociándolo a una Persona existente (funcionario o contratista) y
   asignando su **rol** (`digitador`, `funcionario`, `contratista`, `supervisor_contratos`, etc.).
3. Si un usuario fue desactivado, puedes **reactivarlo** desde el listado.
4. Puedes **restablecer la contraseña** de un usuario (se envía o genera una nueva).

📸 **[CAPTURA 12: Listado de Usuarios con las acciones de reactivar y restablecer contraseña]**
📸 **[CAPTURA 13: Modal de confirmación al restablecer contraseña]**

## 8. Dashboard

Igual que en el resto de roles administrativos: métricas de eventos por estado, tareas y
compromisos.

📸 **[CAPTURA 14: Dashboard del Administrador]**

## 9. Cerrar sesión

Clic en tu nombre/avatar → **Cerrar sesión** → confirmar en el modal.

📸 **[CAPTURA 15: Modal de confirmación de cierre de sesión]**
