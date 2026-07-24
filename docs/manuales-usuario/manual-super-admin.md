# Manual de Usuario — Super Administrador

## 1. ¿Quién usa este manual?

El **Super Administrador** es el rol con la visión más amplia del sistema. No participa en
la operación diaria de agendar eventos, pero supervisa el funcionamiento general: estadísticas,
mapa de calor de actividad, auditoría de eventos vencidos y reportes de incidencias.

## 2. Iniciar sesión

1. Ingresa a la URL del sistema.
2. Escribe tu correo y contraseña institucionales.
3. Marca "Recordarme" si deseas mantener la sesión iniciada en este equipo (usa `localStorage`);
   si no la marcas, la sesión se cierra al cerrar el navegador (`sessionStorage`).
4. Pulsa **Iniciar sesión**.

📸 **[CAPTURA 1: Pantalla de login con el logo y nombre de la entidad]**

Si tu cuenta aún no verificó el correo, el sistema te lo indicará y podrás solicitar el
reenvío del correo de verificación.

## 3. Menú lateral — qué vas a ver

Como Super Administrador, el menú lateral muestra:

- **Dashboard**
- **Mapa de Eventos**
- **Reporte de incidencias**
- Sección **Super Admin**:
  - **Panorama**
  - **Estadísticas**
  - **Mapa de Calor**
  - **Auditoría**

📸 **[CAPTURA 2: Menú lateral completo, mostrando la sección "Super Admin"]**

No tienes acceso a creación/edición de eventos, tareas o gestión de personas — ese trabajo
operativo lo hacen digitador y admin.

## 4. Dashboard

Vista general con métricas reales: cantidad de eventos por estado (programado, en curso,
finalizado, cerrado, aplazado, cancelado), tareas pendientes/cerradas y compromisos por vencer.

📸 **[CAPTURA 3: Dashboard con las tarjetas de métricas]**

## 5. Panorama (`/admin/panorama`)

Vista consolidada de alto nivel pensada para tener una foto rápida del estado general del
sistema (eventos activos, alertas, actividad reciente).

📸 **[CAPTURA 4: Pantalla de Panorama]**

## 6. Estadísticas (`/admin/estadisticas`)

Estadísticas de actividad agrupadas por dependencia y por contratista. Útil para ver carga
de trabajo y cumplimiento por área.

1. Selecciona el rango de fechas o filtro que necesites.
2. Consulta los gráficos/tablas por dependencia o por contratista.

📸 **[CAPTURA 5: Pantalla de Estadísticas con los gráficos por dependencia]**

## 7. Mapa de Calor (`/admin/mapa-calor`)

Visualización geográfica de concentración de eventos, útil para identificar zonas con más
actividad institucional.

📸 **[CAPTURA 6: Mapa de calor con la leyenda de intensidad]**

## 8. Auditoría (`/admin/auditoria`)

Panel exclusivo de Super Administrador para revisar **eventos vencidos por abandono**
(eventos que pasaron a `en_curso` pero nadie los finalizó y el sistema los cerró
automáticamente a las 00:00 del día siguiente).

1. Entra a **Auditoría**.
2. Revisa el listado de eventos cerrados por abandono, con su responsable y fecha.
3. Usa esta información para dar seguimiento con el responsable o su dependencia.

📸 **[CAPTURA 7: Panel de Auditoría con el listado de eventos cerrados por abandono]**

## 9. Mapa de Eventos (`/mapa-eventos`)

Mapa (Leaflet) con todos los eventos, coloreados según su estado. Permite:

- Filtrar por estado, dependencia, sector o rango de fechas.
- Ver el detalle de un evento al hacer clic en su marcador (se agrupan en clusters cuando
  hay muchos eventos cercanos).
- Exportar los eventos visibles como GeoJSON.

📸 **[CAPTURA 8: Mapa de eventos con marcadores de colores por estado]**
📸 **[CAPTURA 9: Popup de detalle al hacer clic en un evento del mapa]**

## 10. Reporte de incidencias (`/reportes-lider`)

Como Super Administrador, aquí ves **todos** los reportes diarios de actividad enviados por
líderes de contratistas y funcionarios de todas las dependencias (otros roles solo ven los
de su propia dependencia).

1. Entra a **Reporte de incidencias**.
2. Filtra por dependencia o fecha si necesitas ubicar un reporte específico.
3. Abre un reporte para ver su descripción, lugar y fecha.

📸 **[CAPTURA 10: Listado de reportes de incidencias con el filtro por dependencia]**

## 11. Cerrar sesión

Haz clic en tu nombre/avatar en la parte superior del menú lateral y selecciona **Cerrar sesión**.
Confirma en el modal que aparece.

📸 **[CAPTURA 11: Modal de confirmación de cierre de sesión]**
