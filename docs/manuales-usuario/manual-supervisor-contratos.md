# Manual de Usuario — Supervisor de Contratos

## 1. ¿Quién usa este manual?

El **Supervisor de Contratos** (`supervisor_contratos`) es un rol restringido, enfocado
únicamente en la gestión de contratos de los contratistas. No tiene acceso a eventos, tareas,
calendario ni reportes generales — su sesión se limita a dos pantallas.

## 2. Iniciar sesión

1. Ingresa a la URL del sistema con tu correo y contraseña.
2. Pulsa **Iniciar sesión**.

📸 **[CAPTURA 1: Pantalla de login]**

## 3. Menú lateral

Como Supervisor de Contratos verás únicamente:

- **Gestión Contratos**
- **Contratistas**

📸 **[CAPTURA 2: Menú lateral del Supervisor de Contratos (solo dos opciones)]**

No verás Dashboard, Calendario, Eventos, Tareas ni Mapa — este rol es intencionalmente
acotado a la gestión contractual.

## 4. Gestión Contratos (`/gestion-contratos`)

Vista completa del ciclo de vida de los contratos de todos los contratistas.

1. Entra a **Gestión Contratos**.
2. Consulta el estado de cada contrato: **vigente** o **vencido**, con las alertas de
   vencimiento próximo (30, 15 y 7 días antes de vencer).
3. Abre un contratista para ver el detalle de su contrato: valor, duración, fechas, objeto,
   número de contrato y datos del supervisor.
4. Consulta el historial de **renovaciones** (`contrato_renovaciones`): prórrogas,
   adiciones o nuevos contratos, cada una con su snapshot de fechas/valores anteriores y
   nuevos, y los documentos de soporte adjuntos.

📸 **[CAPTURA 3: Listado de contratos con columna de estado (vigente/vencido)]**
📸 **[CAPTURA 4: Detalle de contrato de un contratista]**
📸 **[CAPTURA 5: Historial de renovaciones de un contrato]**

> Los correos de aviso (`ContratoVencimientoNotification` a 30/15/7 días y
> `ContratoVencidoNotification` al vencer, `ContratoRenovadoNotification` al renovar) se
> envían automáticamente por el sistema; como supervisor no necesitas enviarlos manualmente,
> solo darles seguimiento aquí.

## 5. Contratistas (`/admin/contratistas`)

Misma pantalla de administración de contratistas que usa el Administrador, pero con tu rol
solo la usas para consultar y mantener al día la información contractual (no gestionas
usuarios ni parametrización general).

1. Entra a **Contratistas**.
2. Abre el registro de un contratista para revisar o actualizar:
   - **Datos del Contrato** (número, fechas, objeto, valor).
   - **Documentos legales**, incluida la minuta y la Resolución del Supervisor (ambas
     disparan extracción automática de datos por IA al subirlas).
   - **Obligaciones** contractuales registradas.
   - El estado de **líder** del contratista, si necesitas activarlo/desactivarlo.

📸 **[CAPTURA 6: Listado de Contratistas]**
📸 **[CAPTURA 7: Edición de un Contratista — pestaña de Documentos]**

## 6. Cerrar sesión

Clic en tu nombre/avatar → **Cerrar sesión** → confirmar en el modal.

📸 **[CAPTURA 8: Modal de confirmación de cierre de sesión]**
