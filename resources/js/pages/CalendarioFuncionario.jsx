import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import storage from '../api/storage';
import CalendarioWidget from '../components/CalendarioWidget';
import ModalFinalizar from '../components/ModalFinalizar';
import ModalRechazarAsistencia from '../components/ModalRechazarAsistencia';
import TareaDetalleModal from '../components/TareaDetalleModal';
import ModalCumplirTarea from '../components/ModalCumplirTarea';
import { useTheme } from '../hooks/useTheme';
import { CalendarDays, Clock, CheckCircle, XCircle, ChevronRight, User, CheckCheck, CheckSquare, ClipboardList } from 'lucide-react';

const toLocalDate = (s) => s ? new Date(s.slice(0, 16)) : new Date();

const colorEstado = (estado) => {
    switch (estado) {
        case 'programado': return '#3B82F6';
        case 'en_curso':   return '#6366F1';
        case 'finalizado': return '#10B981';
        case 'cerrado':    return '#6B7280';
        case 'aplazado':   return '#F59E0B';
        case 'cancelado':  return '#EF4444';
        default:           return '#3B82F6';
    }
};

const normalizeEstado = (e) => {
    if (!e) return 'programado';
    return e.replace(/a$/, 'o');
};

const badgeEstado = {
    programado: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    en_curso:   'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
    finalizado: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    cerrado:    'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    cancelado:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    aplazado:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

const labelEstado = {
    programado: 'Programado', en_curso: 'En curso', finalizado: 'Finalizado',
    cerrado: 'Cerrado', cancelado: 'Cancelado', aplazado: 'Aplazado',
};

export default function CalendarioFuncionario() {
    const { isDark } = useTheme();
    const user = JSON.parse(storage.get('user') || '{}');

    const [misEventosRaw, setMisEventosRaw] = useState([]);
    const [tareas, setTareas] = useState([]);
    const [compromisos, setCompromisos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtro, setFiltro] = useState('todos');

    const [eventoDetalle, setEventoDetalle] = useState(null);
    const [confirmando, setConfirmando] = useState(false);
    const [eventoFinalizar, setEventoFinalizar] = useState(null);
    const [eventoRechazar, setEventoRechazar] = useState(null);
    const [tareaDetalle, setTareaDetalle] = useState(null);
    const [tareaFinalizar, setTareaFinalizar] = useState(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [resEventos, resTareas] = await Promise.all([
                api.get('/eventos'),
                api.get('/mis-tareas'),
            ]);

            const todos = resEventos.data.data ?? resEventos.data;
            const propios = todos.filter(e =>
                e.invitados?.some(i => i.persona_id === user.persona_id)
            );
            setMisEventosRaw(propios);
            setTareas(resTareas.data.tareas ?? []);
            setCompromisos(resTareas.data.compromisos ?? []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const eventosCalendar = misEventosRaw.map(e => ({
        id: `evento-${e.id}`,
        title: e.tema,
        start: e.fecha_hora?.slice(0, 16),
        backgroundColor: colorEstado(e.estado),
        borderColor: 'transparent',
        textColor: '#fff',
        extendedProps: { tipo: 'evento', data: e },
    }));

    const tareasCalendar = tareas.map(t => ({
        id: `tarea-${t.id}`,
        title: t.asunto,
        start: t.fecha_hora?.slice(0, 16),
        extendedProps: { tipo: 'tarea', data: t },
    }));

    const compromisosCalendar = compromisos.map(c => ({
        id: `compromiso-${c.id}`,
        title: c.descripcion,
        start: c.fecha_limite?.slice(0, 10),
        extendedProps: { tipo: 'compromiso', data: c },
    }));

    const allEvents = [
        ...(filtro === 'todos' || filtro === 'eventos' ? eventosCalendar : []),
        ...(filtro === 'todos' || filtro === 'tareas' ? tareasCalendar : []),
        ...(filtro === 'todos' || filtro === 'tareas' ? compromisosCalendar : []),
    ];

    const proximosEventos = misEventosRaw
        .filter(e => ['programado', 'en_curso'].includes(e.estado) && toLocalDate(e.fecha_hora) >= new Date())
        .sort((a, b) => toLocalDate(a.fecha_hora) - toLocalDate(b.fecha_hora))
        .slice(0, 8);

    const handleEventClick = (info) => {
        const { tipo, data } = info.event.extendedProps;
        if (tipo === 'evento') setEventoDetalle(data);
        else if (tipo === 'tarea' || tipo === 'compromiso') setTareaDetalle({ tipo, item: data });
    };

    const confirmarAsistencia = async (confirmacion, motivo = null) => {
        if (!eventoDetalle || !user.persona_id) return;
        setConfirmando(true);
        try {
            const payload = { persona_id: user.persona_id, confirmacion };
            if (motivo) payload.motivo_rechazo = motivo;
            await api.post(`/eventos/${eventoDetalle.id}/confirmar-asistencia`, payload);
            await fetchData();
            setEventoDetalle(prev => ({
                ...prev,
                invitados: prev.invitados?.map(i =>
                    i.persona_id === user.persona_id ? { ...i, confirmacion } : i
                ),
            }));
        } catch (err) {
            console.error(err);
        } finally {
            setConfirmando(false);
        }
    };

    const formatFecha = (s) => toLocalDate(s).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' });
    const formatHora  = (s) => toLocalDate(s).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });

    const filtros = [
        { key: 'todos',    label: 'Todos',      icon: <CalendarDays size={13} /> },
        { key: 'eventos',  label: 'Eventos',    icon: <ClipboardList size={13} /> },
        { key: 'tareas',   label: 'Tareas',     icon: <CheckSquare size={13} /> },
    ];

    const leyenda = [
        { dot: '#3B82F6', label: 'Programado' },
        { dot: '#6366F1', label: 'En curso' },
        { dot: '#10B981', label: 'Finalizado' },
        { dot: '#6B7280', label: 'Cerrado' },
        { dot: '#F59E0B', label: 'Aplazado' },
        { dot: '#EF4444', label: 'Cancelado' },
        { dot: '#EAB308', label: 'Tarea' },
        { dot: '#EC4899', label: 'Compromiso' },
    ];

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <CalendarDays size={24} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Mi Calendario</h2>
                    </div>
                    <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Eventos, tareas asignadas y compromisos
                    </p>
                </div>

                {/* Main grid */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                    {/* Calendar — 2/3 */}
                    <div className="xl:col-span-2 space-y-3">
                        {/* Filtros + Leyenda */}
                        <div className="flex flex-wrap items-center gap-2">
                            {filtros.map(f => (
                                <button
                                    key={f.key}
                                    onClick={() => setFiltro(f.key)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                                        filtro === f.key
                                            ? 'bg-indigo-600 text-white border-indigo-600'
                                            : isDark
                                                ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                    }`}
                                >
                                    {f.icon} {f.label}
                                </button>
                            ))}
                            <div className={`h-5 w-px mx-1 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
                            {leyenda
                                .filter(l => {
                                    if (filtro === 'eventos') return !['Tarea', 'Compromiso'].includes(l.label);
                                    if (filtro === 'tareas')  return ['Tarea', 'Compromiso'].includes(l.label);
                                    return true;
                                })
                                .map(({ dot, label }) => (
                                    <span key={label} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${isDark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-white border-gray-200 text-gray-600'}`}>
                                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
                                        {label}
                                    </span>
                                ))}
                        </div>

                        <CalendarioWidget
                            events={allEvents}
                            onEventClick={handleEventClick}
                            loading={loading}
                        />
                    </div>

                    {/* Upcoming — 1/3 */}
                    <div className={`rounded-2xl border p-5 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'}`}>
                        <h3 className={`text-sm font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-700'}`}>
                            <Clock size={15} className="text-indigo-500" />
                            Próximos eventos
                        </h3>

                        {loading ? (
                            <div className="flex justify-center py-12">
                                <div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" />
                            </div>
                        ) : proximosEventos.length === 0 ? (
                            <div className={`text-center py-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                <CalendarDays size={32} className="mx-auto mb-2 opacity-40" />
                                <p className="text-sm">Sin eventos próximos</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {proximosEventos.map(e => (
                                    <button
                                        key={e.id}
                                        onClick={() => setEventoDetalle(e)}
                                        className={`w-full text-left rounded-xl p-3 transition group ${isDark ? 'hover:bg-gray-700/60' : 'hover:bg-gray-50'}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: colorEstado(e.estado) }} />
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{e.tema}</p>
                                                <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    {formatFecha(e.fecha_hora)} · {formatHora(e.fecha_hora)}
                                                </p>
                                            </div>
                                            <ChevronRight size={14} className={`flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition ${isDark ? 'text-gray-400' : 'text-gray-400'}`} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal detalle evento */}
            {eventoDetalle && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className={`w-full max-w-lg rounded-2xl shadow-2xl ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
                        <div className="p-6 border-b" style={{ borderColor: isDark ? '#374151' : '#f1f5f9' }}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mb-2 ${badgeEstado[normalizeEstado(eventoDetalle.estado)] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                                        {labelEstado[normalizeEstado(eventoDetalle.estado)] ?? eventoDetalle.estado}
                                    </span>
                                    <h3 className={`text-lg font-semibold leading-snug ${isDark ? 'text-white' : 'text-gray-900'}`}>{eventoDetalle.tema}</h3>
                                </div>
                                <button onClick={() => setEventoDetalle(null)} className={`text-xl leading-none px-2 py-1 rounded-lg transition ${isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'}`}>×</button>
                            </div>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Fecha y hora</p>
                                    <p className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{formatFecha(eventoDetalle.fecha_hora)} · {formatHora(eventoDetalle.fecha_hora)}</p>
                                </div>
                                {eventoDetalle.responsable_id && (
                                    <div>
                                        <p className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Responsable</p>
                                        <p className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                            {eventoDetalle.responsable
                                                ? `${eventoDetalle.responsable.nombre ?? ''} ${eventoDetalle.responsable.apellido ?? ''}`.trim()
                                                : `ID ${eventoDetalle.responsable_id}`}
                                        </p>
                                    </div>
                                )}
                                {eventoDetalle.sala?.nombre && (
                                    <div>
                                        <p className={`text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Sala</p>
                                        <p className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{eventoDetalle.sala.nombre}</p>
                                    </div>
                                )}
                            </div>

                            {eventoDetalle.invitados?.length > 0 && (
                                <div>
                                    <p className={`text-xs font-medium mb-2 flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        <User size={11} /> Invitados ({eventoDetalle.invitados.length})
                                    </p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {eventoDetalle.invitados.slice(0, 10).map(inv => (
                                            <span key={inv.id} className={`px-2 py-0.5 rounded-full text-xs ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                                {inv.persona?.nombres} {inv.persona?.apellidos}
                                            </span>
                                        ))}
                                        {eventoDetalle.invitados.length > 10 && (
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                                +{eventoDetalle.invitados.length - 10} más
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Finalizar — solo responsable en_curso */}
                        {eventoDetalle.estado === 'en_curso' && String(user?.persona_id) === String(eventoDetalle.responsable_id) && (
                            <div className={`px-6 pb-2 pt-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                <button
                                    onClick={() => { setEventoFinalizar(eventoDetalle); setEventoDetalle(null); }}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white transition"
                                >
                                    <CheckCheck size={16} /> Finalizar evento
                                </button>
                            </div>
                        )}

                        {/* Confirmación asistencia */}
                        {(() => {
                            const miInvitacion = eventoDetalle.invitados?.find(i => i.persona_id === user.persona_id);
                            if (!miInvitacion || !['programado', 'aplazado'].includes(eventoDetalle.estado)) return null;
                            const conf = miInvitacion.confirmacion;
                            return (
                                <div className={`px-6 pb-2 pt-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                    <p className={`text-xs font-medium mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Tu asistencia:
                                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-semibold ${conf === 'confirmado' ? 'bg-emerald-100 text-emerald-700' : conf === 'rechazado' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                            {conf === 'confirmado' ? 'Confirmada' : conf === 'rechazado' ? 'Rechazada' : 'Pendiente'}
                                        </span>
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            disabled={confirmando || conf === 'confirmado'}
                                            onClick={() => confirmarAsistencia('confirmado')}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition ${conf === 'confirmado' ? 'bg-emerald-500 text-white cursor-default' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'} disabled:opacity-60`}
                                        >
                                            <CheckCircle size={15} /> Confirmar
                                        </button>
                                        <button
                                            disabled={confirmando || conf === 'rechazado'}
                                            onClick={() => setEventoRechazar(eventoDetalle)}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition ${conf === 'rechazado' ? 'bg-red-500 text-white cursor-default' : 'bg-red-100 text-red-700 hover:bg-red-200'} disabled:opacity-60`}
                                        >
                                            <XCircle size={15} /> No asistiré
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="px-6 pb-6 pt-3">
                            <button onClick={() => setEventoDetalle(null)} className={`w-full py-2.5 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {tareaDetalle && (
                <TareaDetalleModal
                    item={tareaDetalle.item}
                    tipo={tareaDetalle.tipo}
                    onClose={() => setTareaDetalle(null)}
                    onCumplir={
                        ['pendiente', 'vencida'].includes(tareaDetalle.item?.estado)
                            ? () => { setTareaFinalizar(tareaDetalle); setTareaDetalle(null); }
                            : undefined
                    }
                />
            )}

            {tareaFinalizar && (
                <ModalCumplirTarea
                    tipo={tareaFinalizar.tipo}
                    item={tareaFinalizar.item}
                    onClose={() => setTareaFinalizar(null)}
                    onCumplido={() => { setTareaFinalizar(null); fetchData(); }}
                />
            )}

            {eventoFinalizar && (
                <ModalFinalizar
                    evento={eventoFinalizar}
                    onClose={() => setEventoFinalizar(null)}
                    onFinalizado={() => { setEventoFinalizar(null); fetchData(); }}
                />
            )}

            {eventoRechazar && (
                <ModalRechazarAsistencia
                    evento={eventoRechazar}
                    onClose={() => setEventoRechazar(null)}
                    onConfirmar={async (motivo) => { await confirmarAsistencia('rechazado', motivo); setEventoRechazar(null); }}
                />
            )}
        </Layout>
    );
}
