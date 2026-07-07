// resources/js/components/CalendarioWidget.jsx
import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { useTheme } from '../hooks/useTheme';

// Soft palette — light & dark
const LIGHT = {
    programado:  { bg: '#dbeafe', color: '#1e40af' },
    en_curso:    { bg: '#e0e7ff', color: '#3730a3' },
    finalizado:  { bg: '#dcfce7', color: '#14532d' },
    cerrado:     { bg: '#f3f4f6', color: '#374151' },
    aplazado:    { bg: '#fed7aa', color: '#92400e' },
    cancelado:   { bg: '#fee2e2', color: '#7f1d1d' },
    tarea:       { bg: '#fef9c3', color: '#713f12' },
    compromiso:  { bg: '#fce7f3', color: '#9d174d' },
};
const DARK = {
    programado:  { bg: 'rgba(59,130,246,0.22)',   color: '#93c5fd' },
    en_curso:    { bg: 'rgba(99,102,241,0.22)',   color: '#a5b4fc' },
    finalizado:  { bg: 'rgba(34,197,94,0.18)',    color: '#6ee7b7' },
    cerrado:     { bg: 'rgba(107,114,128,0.18)',  color: '#d1d5db' },
    aplazado:    { bg: 'rgba(245,158,11,0.22)',   color: '#fcd34d' },
    cancelado:   { bg: 'rgba(239,68,68,0.18)',    color: '#fca5a5' },
    tarea:       { bg: 'rgba(234,179,8,0.20)',    color: '#fde68a' },
    compromiso:  { bg: 'rgba(236,72,153,0.18)',  color: '#f9a8d4' },
};

function EventPill({ info }) {
    const { isDark } = useTheme();
    const tipo = info.event.extendedProps?.tipo;
    const estado = (tipo === 'tarea' || tipo === 'compromiso')
        ? tipo
        : (info.event.extendedProps?.data?.estado ?? 'programado');
    const palette = (isDark ? DARK : LIGHT)[estado] ?? (isDark ? DARK : LIGHT).programado;
    const hora = info.timeText;

    return (
        <div style={{
            background: palette.bg,
            color: palette.color,
            borderRadius: '6px',
            padding: '2px 7px',
            fontSize: '0.72rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            width: '100%',
            overflow: 'hidden',
        }}>
            {hora && (
                <span style={{ fontWeight: 700, flexShrink: 0, opacity: 0.7, fontSize: '0.63rem' }}>
                    {hora}
                </span>
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {info.event.title}
            </span>
        </div>
    );
}

export default function CalendarioWidget({ events = [], onDateClick, onEventClick, onDatesSet, loading = false, height = 'auto', initialDate }) {
    const { isDark } = useTheme();

    return (
        <div className={`relative rounded-2xl shadow-lg overflow-hidden transition-all ${isDark ? 'bg-gray-800 border border-gray-700/60' : 'bg-white border border-gray-100'}`}>
            {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/10 backdrop-blur-[1px] rounded-2xl">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent" />
                </div>
            )}
            <style>{`
                .fc { font-family: 'Inter', system-ui, -apple-system, sans-serif; }

                /* Toolbar */
                .fc-toolbar {
                    padding: 18px 20px !important;
                    border-bottom: 1px solid ${isDark ? '#374151' : '#f1f5f9'};
                    flex-wrap: wrap;
                    gap: 8px;
                }
                .fc-toolbar-title {
                    font-size: 1.05rem !important;
                    font-weight: 700 !important;
                    ${isDark ? 'color: #f1f5f9 !important;' : 'color: #1e293b !important;'}
                }

                /* Base buttons */
                .fc-button {
                    border-radius: 10px !important;
                    font-size: 0.78rem !important;
                    font-weight: 600 !important;
                    padding: 6px 13px !important;
                    transition: all 0.15s ease !important;
                    background-color: ${isDark ? '#1f2937 !important' : '#f1f5f9 !important'};
                    border-color: ${isDark ? '#374151 !important' : '#e2e8f0 !important'};
                    color: ${isDark ? '#d1d5db !important' : '#475569 !important'};
                    box-shadow: none !important;
                }
                .fc-button:hover {
                    background-color: ${isDark ? '#374151 !important' : '#e2e8f0 !important'} !important;
                    transform: translateY(-1px) !important;
                }
                .fc-button:focus { box-shadow: none !important; outline: none !important; }

                /* View group — Mes / Semana / Día / Lista */
                .fc-button-group {
                    display: flex !important;
                    gap: 5px !important;
                }
                .fc-button-group .fc-button {
                    border-radius: 10px !important;
                    margin: 0 !important;
                }
                .fc-button-active {
                    background-color: #6366f1 !important;
                    border-color: #6366f1 !important;
                    color: white !important;
                    box-shadow: 0 2px 8px rgba(99,102,241,0.3) !important;
                }

                /* Today button */
                .fc-today-button {
                    background: ${isDark ? '#1f2937 !important' : '#f1f5f9 !important'} !important;
                    border-color: ${isDark ? '#374151 !important' : '#e2e8f0 !important'} !important;
                    color: ${isDark ? '#d1d5db !important' : '#475569 !important'} !important;
                }
                .fc-today-button:disabled { opacity: 0.4 !important; }

                /* Day header */
                .fc-col-header-cell {
                    background-color: ${isDark ? '#1f2937' : '#f8fafc'} !important;
                    border-bottom: 2px solid ${isDark ? '#374151' : '#e2e8f0'} !important;
                }
                .fc-col-header-cell-cushion {
                    font-size: 0.7rem !important;
                    font-weight: 700 !important;
                    letter-spacing: 0.08em !important;
                    text-transform: uppercase !important;
                    padding: 10px 8px !important;
                    ${isDark ? 'color: #9ca3af !important;' : 'color: #64748b !important;'}
                    text-decoration: none !important;
                }

                /* Day cells */
                .fc-daygrid-day { transition: background 0.12s ease !important; }
                .fc-daygrid-day:hover {
                    background-color: ${isDark ? '#374151 !important' : '#f8fafc !important'} !important;
                    cursor: pointer !important;
                }
                .fc-daygrid-day-frame { background-color: ${isDark ? '#1f2937' : '#ffffff'} !important; }
                .fc-daygrid-day-number {
                    font-size: 0.82rem !important;
                    font-weight: 500 !important;
                    ${isDark ? 'color: #9ca3af !important;' : 'color: #64748b !important;'}
                    padding: 6px 8px !important;
                    text-decoration: none !important;
                }

                /* Today — indigo circle on the number, very subtle cell tint */
                .fc-day-today {
                    background-color: ${isDark ? 'rgba(99,102,241,0.07) !important' : 'rgba(99,102,241,0.05) !important'} !important;
                }
                .fc-day-today .fc-daygrid-day-number {
                    background: #6366f1 !important;
                    color: white !important;
                    border-radius: 50% !important;
                    width: 28px !important;
                    height: 28px !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    font-weight: 700 !important;
                }

                /* Events */
                .fc-event {
                    border: none !important;
                    background: transparent !important;
                    box-shadow: none !important;
                    cursor: pointer !important;
                    padding: 1px 2px !important;
                    transition: transform 0.12s ease, opacity 0.12s ease !important;
                }
                .fc-event:hover { transform: translateY(-1px) !important; opacity: 0.88 !important; }
                .fc-daygrid-event-harness { margin-top: 2px !important; }
                .fc-event-main { padding: 0 !important; }

                /* Grid borders */
                .fc-scrollgrid { border: none !important; }
                .fc-scrollgrid td, .fc-scrollgrid th {
                    border-color: ${isDark ? '#374151' : '#f1f5f9'} !important;
                }

                /* List view */
                .fc-list-table { background-color: ${isDark ? '#1f2937' : '#fff'} !important; }
                .fc-list-day-cushion {
                    background-color: ${isDark ? '#111827 !important' : '#f8fafc !important'} !important;
                    padding: 10px 16px !important;
                }
                .fc-list-day-text, .fc-list-day-side-text {
                    font-size: 0.8rem !important; font-weight: 700 !important;
                    ${isDark ? 'color: #f1f5f9 !important;' : 'color: #1e293b !important;'}
                }
                .fc-list-event-title a, .fc-list-event-time {
                    ${isDark ? 'color: #d1d5db !important;' : 'color: #374151 !important;'}
                }
                .fc-list-event:hover td {
                    background-color: ${isDark ? '#374151 !important' : '#f9fafb !important'} !important;
                }
                .fc-list-empty { background-color: ${isDark ? '#1f2937 !important' : '#fff !important'} !important; }
                .fc-list-empty-cushion { ${isDark ? 'color: #6b7280 !important;' : 'color: #94a3b8 !important;'} }

                /* Time grid — columnas y fondo */
                .fc-timegrid-col { background-color: ${isDark ? '#1f2937' : '#fff'} !important; }
                .fc-timegrid-col-frame { background-color: ${isDark ? '#1f2937' : '#fff'} !important; }
                .fc-timegrid-axis {
                    background-color: ${isDark ? '#1f2937' : '#f8fafc'} !important;
                    border-color: ${isDark ? '#374151' : '#e2e8f0'} !important;
                }

                /* Time grid — slots (filas de hora) */
                .fc-timegrid-slot {
                    border-color: ${isDark ? '#283548' : '#f1f5f9'} !important;
                    height: 44px !important;
                }
                .fc-timegrid-slot-minor {
                    border-color: ${isDark ? '#1e2d3d' : '#f8fafc'} !important;
                }
                .fc-timegrid-slot-label {
                    background-color: ${isDark ? '#1f2937' : '#f8fafc'} !important;
                    border-color: ${isDark ? '#374151' : '#e2e8f0'} !important;
                }
                .fc-timegrid-slot-label-cushion, .fc-timegrid-axis-cushion {
                    font-size: 0.68rem !important;
                    font-weight: 600 !important;
                    ${isDark ? 'color: #6b7280 !important;' : 'color: #94a3b8 !important;'}
                }

                /* Time grid — línea de ahora */
                .fc-timegrid-now-indicator-line { border-color: #f43f5e !important; border-width: 2px !important; }
                .fc-timegrid-now-indicator-arrow { border-top-color: #f43f5e !important; border-bottom-color: #f43f5e !important; }

                /* List view */
                .fc-list { border-color: ${isDark ? '#374151' : '#e5e7eb'} !important; }
                .fc-list-table { background-color: ${isDark ? '#1f2937' : '#fff'} !important; }
                .fc-list-table td, .fc-list-table th {
                    border-color: ${isDark ? '#283548' : '#f1f5f9'} !important;
                    background-color: ${isDark ? '#1f2937' : '#fff'} !important;
                }
                /* Date header rows */
                .fc-list-day td {
                    background-color: ${isDark ? '#111827' : '#f8fafc'} !important;
                    border-color: ${isDark ? '#374151' : '#e5e7eb'} !important;
                }
                .fc-list-day-cushion {
                    background-color: ${isDark ? '#111827' : '#f8fafc'} !important;
                    padding: 8px 14px !important;
                }
                .fc-list-day-text, .fc-list-day-side-text {
                    font-size: 0.8rem !important;
                    font-weight: 700 !important;
                    ${isDark ? 'color: #e5e7eb !important;' : 'color: #1e293b !important;'}
                }
                .fc-list-event td { background-color: ${isDark ? '#1f2937' : '#fff'} !important; }
                .fc-list-event:hover td {
                    background-color: ${isDark ? '#283548' : '#f9fafb'} !important;
                }
                .fc-list-event-dot { border-radius: 50% !important; }
                .fc-list-event-title a {
                    ${isDark ? 'color: #d1d5db !important;' : 'color: #374151 !important;'}
                    text-decoration: none !important;
                    font-size: 0.85rem !important;
                    font-weight: 500 !important;
                }
                .fc-list-event-time {
                    ${isDark ? 'color: #6b7280 !important;' : 'color: #94a3b8 !important;'}
                    font-size: 0.75rem !important;
                }
                .fc-list-empty { background-color: ${isDark ? '#1f2937' : '#fff'} !important; }
                .fc-list-empty-cushion { ${isDark ? 'color: #6b7280 !important;' : 'color: #94a3b8 !important;'} }

                /* Popover "+N más" */
                .fc-popover {
                    background-color: ${isDark ? '#1f2937' : '#ffffff'} !important;
                    border: 1px solid ${isDark ? '#374151' : '#e5e7eb'} !important;
                    border-radius: 12px !important;
                    box-shadow: 0 8px 24px rgba(0,0,0,${isDark ? '0.5' : '0.12'}) !important;
                    overflow: hidden !important;
                }
                .fc-popover-header {
                    background-color: ${isDark ? '#111827' : '#f8fafc'} !important;
                    border-bottom: 1px solid ${isDark ? '#374151' : '#e5e7eb'} !important;
                    padding: 8px 12px !important;
                    ${isDark ? 'color: #f1f5f9 !important;' : 'color: #1e293b !important;'}
                    font-size: 0.8rem !important;
                    font-weight: 600 !important;
                }
                .fc-popover-body {
                    background-color: ${isDark ? '#1f2937' : '#ffffff'} !important;
                    padding: 6px 8px !important;
                }
                .fc-popover-close {
                    ${isDark ? 'color: #9ca3af !important;' : 'color: #6b7280 !important;'}
                    opacity: 0.7 !important;
                }
                .fc-popover-close:hover { opacity: 1 !important; }
            `}</style>

            <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                locale={esLocale}
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth',
                }}
                initialDate={initialDate}
                events={events}
                dateClick={onDateClick}
                eventClick={onEventClick}
                datesSet={onDatesSet}
                height={height}
                selectable={true}
                eventContent={(info) => <EventPill info={info} />}
                eventTimeFormat={{ hour: '2-digit', minute: '2-digit', meridiem: false, hour12: false }}
                buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día', list: 'Lista' }}
                noEventsText="No hay eventos programados"
                defaultTimedEventDuration="00:30"
                slotEventOverlap={false}
                dayMaxEvents={3}
                moreLinkText={(n) => `+${n} más`}
            />
        </div>
    );
}
