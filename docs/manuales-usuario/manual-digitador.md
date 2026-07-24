# Manual de Usuario — Digitador

## 1. ¿Quién usa este manual?

El **Digitador** es quien opera la agenda día a día: crea y edita eventos, asigna
responsables e invitados, agenda tareas y da seguimiento a compromisos derivados de
reuniones.

## 2. Iniciar sesión

1. Ingresa a la URL del sistema con tu correo y contraseña.
2. Pulsa **Iniciar sesión**.

📸 **[CAPTURA 1: Pantalla de login]**

## 3. Menú lateral

Como Digitador verás:

- **Dashboard**
- **Calendario**
- **Eventos**
- **Tareas**
- **Compromisos**
- **Mapa de Eventos**

📸 **[CAPTURA 2: Menú lateral del Digitador]**

## 4. Calendario (`/calendario`)

Vista de calendario mensual/semanal/diaria (FullCalendar) con todos los eventos.

1. Navega entre meses/semanas con las flechas.
2. Haz clic en un día o en un evento existente para ver/crear el detalle.
3. Cambia de vista (mes/semana/día) con los botones superiores.

📸 **[CAPTURA 3: Vista mensual del Calendario]**
📸 **[CAPTURA 4: Vista semanal/diaria del Calendario]**

## 5. Eventos (`/eventos`)

### 5.1 Crear un evento

1. Entra a **Eventos** y pulsa **Nuevo Evento** (o haz clic en un día del calendario).
2. Completa: título, tipo de evento, prioridad, responsable, dependencia(s), sector(es),
   sala, fecha y hora de inicio/fin, ubicación (opcional, con el selector de mapa).
3. Agrega **invitados** (funcionarios y/o contratistas).
4. Guarda. El evento queda en estado **programado**.

📸 **[CAPTURA 5: Listado de Eventos]**
📸 **[CAPTURA 6: Formulario de creación de Evento — datos generales]**
📸 **[CAPTURA 7: Selector de invitados dentro del formulario de Evento]**
📸 **[CAPTURA 8: Selector de ubicación en el mapa (MapaPicker)]**

### 5.2 Ciclo de vida del evento

```
programado → en_curso → finalizado → cerrado
     ↓
 aplazado / cancelado
```

- El paso `programado → en_curso` es **automático** cuando llega la fecha/hora.
- Puedes **editar** el evento mientras esté `programado` o `en_curso`.
- Puedes **aplazar** un evento `programado` indicando la razón (modal dedicado). El evento
  vuelve a activarse automáticamente en la nueva fecha.
- **No puedes finalizar** un evento salvo que seas su responsable (ese paso lo hace el
  funcionario/contratista responsable o un administrador — ver manuales de Funcionario/Contratista).
- Si nadie finaliza el evento y pasa su día, el sistema lo **cierra automáticamente** a las
  00:00 del día siguiente (estado `cerrado`).

📸 **[CAPTURA 9: Modal "Aplazar evento" solicitando la razón]**
📸 **[CAPTURA 10: Vista de detalle de un evento en estado "cerrado" (solo lectura)]**

### 5.3 Documentos y evidencias del evento

Desde el detalle del evento puedes subir/descargar:

- **Documento de soporte**
- **Acta de reunión** — al subirla, el sistema genera automáticamente (vía IA) un resumen
  ejecutivo de dos párrafos que se guarda como borrador editable antes de finalizar el evento.
- **Lista de asistencia**
- **Fotos** del evento (galería, se pueden agregar o eliminar).

📸 **[CAPTURA 11: Sección de documentos del evento (acta, soporte, lista de asistencia)]**
📸 **[CAPTURA 12: Barra de progreso mientras se genera el resumen del acta con IA]**
📸 **[CAPTURA 13: Galería de fotos del evento]**

## 6. Tareas (`/tareas`)

1. Entra a **Tareas** y pulsa **Nueva Tarea**.
2. Completa título, descripción, responsable, fecha límite y prioridad.
3. Guarda. La tarea queda visible para el responsable en su vista personal.

📸 **[CAPTURA 14: Listado de Tareas]**
📸 **[CAPTURA 15: Formulario de creación de Tarea]**

## 7. Compromisos (`/compromisos`)

Los compromisos surgen normalmente de una reunión (`TareaCompromiso`, vinculado a un evento).

1. Entra a **Compromisos** para ver el listado general con su estado (pendiente, cumplida,
   vencida).
2. Da seguimiento a los compromisos próximos a vencer o ya vencidos.

📸 **[CAPTURA 16: Listado de Compromisos con columna de estado]**

## 8. Mapa de Eventos (`/mapa-eventos`)

Igual que en el resto de roles: mapa con todos los eventos coloreados por estado, filtrable
por estado/dependencia/sector/fecha.

📸 **[CAPTURA 17: Mapa de Eventos filtrado por estado]**

## 9. Dashboard

Métricas generales: eventos por estado, tareas y compromisos.

📸 **[CAPTURA 18: Dashboard del Digitador]**

## 10. Cerrar sesión

Clic en tu nombre/avatar → **Cerrar sesión** → confirmar.

📸 **[CAPTURA 19: Modal de confirmación de cierre de sesión]**
