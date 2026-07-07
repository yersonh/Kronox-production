const TZ = 'America/Bogota';

/**
 * Converts an API datetime string (UTC ISO) to a value usable in <input type="datetime-local">
 * showing the correct Bogotá time.
 *
 * Usage (loading existing record into a form):
 *   fecha_hora: apiToInput(evento.fecha_hora)
 */
export function apiToInput(utcString) {
    if (!utcString) return '';
    const date = new Date(utcString);
    if (isNaN(date)) return '';

    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).formatToParts(date);

    const get = type => parts.find(p => p.type === type)?.value ?? '00';
    const hour = get('hour') === '24' ? '00' : get('hour'); // Intl edge case en medianoche

    return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
}

/**
 * Formats a datetime-local input value for display (e.g. in tables or labels).
 * Returns "DD/MM/YYYY HH:mm" in Bogotá time.
 *
 * Usage:
 *   formatDisplay(evento.fecha_hora)  // "29/04/2026 10:00"
 */
export function formatDisplay(utcString) {
    if (!utcString) return '—';
    const date = new Date(utcString);
    if (isNaN(date)) return '—';

    return new Intl.DateTimeFormat('es-CO', {
        timeZone: TZ,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(date);
}
