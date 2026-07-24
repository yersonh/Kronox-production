# Manual de Usuario — Contratista

## 1. ¿Quién usa este manual?

El **Contratista** participa en eventos y tareas igual que un funcionario, pero además
gestiona la documentación de su contrato, sus obligaciones contractuales y puede generar el
**Auxiliar de Informe** para presentar el cumplimiento de sus obligaciones. Si tiene el
atributo de **líder**, también puede enviar reportes diarios de actividad.

## 2. Iniciar sesión

1. Ingresa a la URL del sistema con tu correo y contraseña.
2. Pulsa **Iniciar sesión**.

📸 **[CAPTURA 1: Pantalla de login]**

## 3. Menú lateral

Como Contratista verás:

- **Dashboard**
- **Mi Perfil**
- **Mi Calendario**
- **Mis Eventos**
- **Mis Tareas**
- **Mapa de Eventos**
- **Reporte de incidencias** (solo si tienes el rol de líder habilitado)
- **Auxiliar Informe**

📸 **[CAPTURA 2: Menú lateral del Contratista]**

## 4. Mi Perfil (`/perfil`)

Página central de autoservicio. A diferencia del funcionario, aquí gestionas también los
documentos legales de tu contrato.

1. **Foto de perfil** — súbela o actualízala.
2. **Minuta de contrato** — al subirla, el sistema extrae automáticamente (vía IA) el valor
   del contrato, la duración y la fecha de suscripción, y completa el número/objeto de
   contrato si estaban vacíos.
3. **Documentos legales** (10 documentos requeridos) — sube cada uno desde su sección
   correspondiente. El documento **Resolución del Supervisor** dispara además la extracción
   automática de los datos del supervisor (nombre, cédula, fecha y valor de
   adición/prórroga).
4. **Datos del Contrato** — puedes editar número de contrato, fecha de inicio, fecha de fin
   y objeto del contrato.
5. **Obligaciones** — crea, edita, cambia el estado (`pendiente` / `en_proceso` / `cumplida`)
   o elimina tus obligaciones contractuales.

📸 **[CAPTURA 3: Pantalla "Mi Perfil" — resumen con estado de los 10 documentos]**
📸 **[CAPTURA 4: Formulario de subida de la Minuta de Contrato]**
📸 **[CAPTURA 5: Sección de Documentos Legales con el indicador de subidos/faltantes]**
📸 **[CAPTURA 6: Formulario "Datos del Contrato"]**
📸 **[CAPTURA 7: Listado de Obligaciones con selector de estado]**

> Si te faltan documentos, recibirás recordatorios automáticos por correo a las 24h, 72h y
> 7 días después de creada tu cuenta (y también si un administrador ejecuta el recordatorio
> manual). El correo enlaza directamente a **Mi Perfil**.

## 5. Mi Calendario, Mis Eventos y Mis Tareas

Funcionan igual que para el rol Funcionario:

- **Mi Calendario** (`/mi-calendario`): calendario personal de tus eventos.
- **Mis Eventos** (`/mis-eventos`): listado de eventos donde participas; confirma/rechaza
  asistencia como invitado; si eres el responsable, puedes **finalizar** el evento con
  conclusiones y asistencias.
- **Mis Tareas** (`/mis-tareas`): tareas y compromisos asignados; ciérralos adjuntando
  conclusiones, soporte y fotos.

📸 **[CAPTURA 8: "Mis Eventos" del Contratista]**
📸 **[CAPTURA 9: "Mis Tareas" del Contratista]**

## 6. Mapa de Eventos (`/mapa-eventos`)

Igual que en los demás roles: mapa con eventos coloreados por estado y alerta de proximidad
por geolocalización.

📸 **[CAPTURA 10: Mapa de Eventos]**

## 7. Reporte de incidencias (`/reportes-lider`) — solo si eres líder

Este módulo solo aparece si un administrador te marcó como **líder** (`es_lider`).

1. Entra a **Reporte de incidencias**.
2. Pulsa **Nuevo Reporte** y completa descripción, lugar y fecha de la actividad.
3. Guarda. Solo verás los reportes de tu propia dependencia.

📸 **[CAPTURA 11: Formulario de nuevo reporte de incidencias (vista de líder)]**

## 8. Auxiliar Informe (`/auxiliar-informe`)

Módulo exclusivo de contratistas para vincular tu actividad (eventos, tareas, compromisos) a
tus obligaciones contractuales y generar el **informe institucional en PDF**.

### 8.1 Vincular actividades a obligaciones

1. Entra a **Auxiliar Informe**.
2. Selecciona el período del informe (mes/rango de fechas).
3. Verás tus eventos, tareas y compromisos del período. Para cada uno, elige a qué
   **obligación** corresponde usando el selector de vinculación.
4. Puedes quitar una vinculación en cualquier momento.

📸 **[CAPTURA 12: Pantalla de Auxiliar Informe con el selector de período]**
📸 **[CAPTURA 13: Tabla de actividades con el selector de obligación por fila]**

### 8.2 Analizar soportes con IA

1. Selecciona hasta 20 ítems con soporte adjunto.
2. Pulsa **Analizar soportes** — el sistema envía los documentos al servicio de IA y guarda
   el análisis (se reutiliza en consultas posteriores, no se vuelve a llamar al servicio).

📸 **[CAPTURA 14: Resultado del análisis de soportes]**

### 8.3 Planillas de pago

1. En la sección de **Planillas**, sube la planilla de pago correspondiente al período
   (formato de período `AAAA-MM`).
2. El sistema extrae automáticamente los datos de seguridad social (pensión, ARL, EPS, IBC,
   valores) mediante IA.
3. Puedes descargar cualquier planilla ya subida desde el listado.

📸 **[CAPTURA 15: Sección de Planillas con el listado por período]**
📸 **[CAPTURA 16: Formulario de subida de planilla]**

### 8.4 Generar el informe en PDF

1. Con las vinculaciones y (si aplica) la planilla del período listas, pulsa
   **Generar Informe**.
2. El PDF incluye: encabezado institucional, datos del contrato y del supervisor, tabla de
   cumplimiento de obligaciones con soportes y fotos, y — si hay planilla del período —
   las tablas de discriminación de planilla y cumplimiento de seguridad social.
3. Descarga o imprime el PDF generado.

📸 **[CAPTURA 17: Botón "Generar Informe" y vista previa/descarga del PDF]**

## 9. Dashboard

Resumen de tus eventos y tareas próximas.

📸 **[CAPTURA 18: Dashboard del Contratista]**

## 10. Cerrar sesión

Clic en tu nombre/avatar → **Cerrar sesión** → confirmar.

📸 **[CAPTURA 19: Modal de confirmación de cierre de sesión]**
