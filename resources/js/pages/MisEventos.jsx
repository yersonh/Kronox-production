import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import DependenciasCell from '../components/DependenciasCell';
import EventoDetalleModal from '../components/EventoDetalleModal';
import ModalFinalizar from '../components/ModalFinalizar';
import api from '../api/axios';
import storage from '../api/storage';
import { useTheme } from '../hooks/useTheme';
import { ClipboardList, Calendar, CheckCircle, Clock, Building2, User, CheckCheck } from 'lucide-react';

const toLocalDate = (s) => s ? new Date(s.slice(0, 16)) : new Date();
const normalizeEstado = (e) => (e ?? 'programado').replace(/a$/, 'o');

export default function MisEventos() {
    const { isDark } = useTheme();
    const user = JSON.parse(storage.get('user') || '{}');

    const [loading, setLoading] = useState(true);
    const [eventos, setEventos] = useState([]);
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
    const [eventoFinalizar, setEventoFinalizar] = useState(null);

    useEffect(() => { fetchEventos(); }, []);

    const fetchEventos = async () => {
        setLoading(true);
        try {
            const res = await api.get('/eventos');
            const todos = res.data.data ?? res.data;
            const propios = todos.filter(e =>
                e.invitados?.some(i => i.persona_id === user.persona_id)
            );
            setEventos(propios);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const eventosFiltrados = eventos.filter(e => {
        if (filtroEstado === 'todos') return true;
        return normalizeEstado(e.estado) === filtroEstado;
    });

    const resumen = {
        total:       eventos.length,
        programados: eventos.filter(e => normalizeEstado(e.estado) === 'programado').length,
        en_curso:    eventos.filter(e => normalizeEstado(e.estado) === 'en_curso').length,
        finalizados: eventos.filter(e => ['finalizado', 'cerrado'].includes(normalizeEstado(e.estado))).length,
    };

    const statCards = [
        { label: 'Total',       value: resumen.total,       icon: <ClipboardList size={20} />, color: isDark ? 'text-indigo-400' : 'text-indigo-600', bg: isDark ? 'bg-indigo-500/10' : 'bg-indigo-50' },
        { label: 'Programados', value: resumen.programados, icon: <Clock size={20} />,         color: isDark ? 'text-blue-400'   : 'text-blue-600',   bg: isDark ? 'bg-blue-500/10'   : 'bg-blue-50'   },
        { label: 'En curso',    value: resumen.en_curso,    icon: <CheckCircle size={20} />,   color: isDark ? 'text-indigo-400' : 'text-indigo-600', bg: isDark ? 'bg-indigo-500/10' : 'bg-indigo-50' },
        { label: 'Finalizados', value: resumen.finalizados, icon: <CheckCheck size={20} />,    color: isDark ? 'text-emerald-400': 'text-emerald-600',bg: isDark ? 'bg-emerald-500/10': 'bg-emerald-50'},
    ];

    const getEstadoInfo = (estado) => {
        const map = {
            programado: { label: 'Programado', cls: isDark ? 'bg-blue-500/20 text-blue-300'     : 'bg-blue-100 text-blue-700'    },
            en_curso:   { label: 'En curso',   cls: isDark ? 'bg-indigo-500/20 text-indigo-300'  : 'bg-indigo-100 text-indigo-700' },
            finalizado: { label: 'Finalizado', cls: isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'},
            cerrado:    { label: 'Cerrado',    cls: isDark ? 'bg-gray-500/20 text-gray-300'      : 'bg-gray-100 text-gray-600'    },
            aplazado:   { label: 'Aplazado',   cls: isDark ? 'bg-amber-500/20 text-amber-300'    : 'bg-amber-100 text-amber-700'  },
            cancelado:  { label: 'Cancelado',  cls: isDark ? 'bg-red-500/20 text-red-300'        : 'bg-red-100 text-red-700'      },
        };
        return map[normalizeEstado(estado)] ?? { label: estado, cls: isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600' };
    };

    const getAsistenciaInfo = (evento) => {
        const inv = evento.invitados?.find(i => i.persona_id === user.persona_id);
        if (!inv) return null;
        const map = {
            confirmado: { label: 'Confirmada',  cls: isDark ? 'text-emerald-400' : 'text-emerald-600' },
            rechazado:  { label: 'Rechazada',   cls: isDark ? 'text-red-400'     : 'text-red-600'     },
            pendiente:  { label: 'Pendiente',   cls: isDark ? 'text-amber-400'   : 'text-amber-600'   },
        };
        return map[inv.confirmacion] ?? map.pendiente;
    };

    const filtrosBtns = [
        { value: 'todos',      label: 'Todos' },
        { value: 'programado', label: 'Programados' },
        { value: 'en_curso',   label: 'En curso' },
        { value: 'finalizado', label: 'Finalizados' },
        { value: 'aplazado',   label: 'Aplazados' },
    ];

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                        <ClipboardList size={24} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                    </div>
                    <div>
                        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Mis Eventos</h1>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Eventos a los que estás invitado
                        </p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {statCards.map(card => (
                        <div key={card.label} className={`p-4 rounded-xl border shadow-sm ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className={`text-xs font-medium uppercase tracking-wide ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{card.label}</p>
                                    <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{card.value}</p>
                                </div>
                                <div className={`p-2.5 rounded-xl ${card.bg} ${card.color}`}>{card.icon}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filtros */}
                <div className="flex gap-2 flex-wrap">
                    {filtrosBtns.map(f => (
                        <button key={f.value} onClick={() => setFiltroEstado(f.value)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                filtroEstado === f.value
                                    ? 'bg-indigo-600 text-white'
                                    : isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                            }`}>
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Lista */}
                <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'}`}>
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent" />
                        </div>
                    ) : eventosFiltrados.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16">
                            <ClipboardList size={40} className={`mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {filtroEstado === 'todos' ? 'No tienes eventos asignados' : 'Sin eventos en este estado'}
                            </p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {eventosFiltrados.map(e => {
                                const { label, cls } = getEstadoInfo(e.estado);
                                const asistencia = getAsistenciaInfo(e);
                                const fecha = toLocalDate(e.fecha_hora);
                                return (
                                    <div
                                        key={e.id}
                                        className={`p-5 transition ${isDark ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50'}`}
                                    >
                                        <div
                                            className="flex items-start justify-between gap-3 mb-2 cursor-pointer"
                                            onClick={() => setEventoSeleccionado(e)}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className={`font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{e.tema}</p>
                                                {e.descripcion && (
                                                    <p className={`text-sm mt-0.5 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{e.descripcion}</p>
                                                )}
                                            </div>
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${cls}`}>
                                                {label}
                                            </span>
                                        </div>
                                        <div
                                            className={`flex flex-wrap gap-x-4 gap-y-1 text-xs cursor-pointer ${isDark ? 'text-gray-500' : 'text-gray-500'}`}
                                            onClick={() => setEventoSeleccionado(e)}
                                        >
                                            <span className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                {fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                {' · '}
                                                {fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                            </span>
                                            {e.dependencias?.length > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <Building2 size={12} /> <DependenciasCell dependencias={e.dependencias} max={1} />
                                                </span>
                                            )}
                                            {e.responsable && (
                                                <span className="flex items-center gap-1">
                                                    <User size={12} /> {e.responsable.nombre} {e.responsable.apellido}
                                                </span>
                                            )}
                                            {asistencia && (
                                                <span className={`flex items-center gap-1 font-medium ${asistencia.cls}`}>
                                                    <CheckCircle size={12} /> Asistencia: {asistencia.label}
                                                </span>
                                            )}
                                        </div>
                                        {/* Botón finalizar / registrar en destiempo */}
                                        {['en_curso', 'cerrado'].includes(normalizeEstado(e.estado)) && String(user.persona_id) === String(e.responsable_id) && (
                                            <div className="mt-3">
                                                <button
                                                    onClick={(ev) => { ev.stopPropagation(); setEventoFinalizar(e); }}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition ${normalizeEstado(e.estado) === 'cerrado' ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600' : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700'}`}
                                                >
                                                    <CheckCheck size={13} /> {normalizeEstado(e.estado) === 'cerrado' ? 'Registrar en destiempo' : 'Finalizar evento'}
                                                </button>
                                            </div>
                                        )}
                                        {e.en_destiempo && (
                                            <span className={`inline-flex items-center mt-2 px-2 py-0.5 rounded text-xs font-medium ${isDark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700'}`}>
                                                Registrado en destiempo
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {eventoSeleccionado && (
                <EventoDetalleModal
                    evento={eventoSeleccionado}
                    onClose={() => setEventoSeleccionado(null)}
                    isMyEventView={true}
                />
            )}

            {eventoFinalizar && (
                <ModalFinalizar
                    evento={eventoFinalizar}
                    onClose={() => setEventoFinalizar(null)}
                    onFinalizado={() => { setEventoFinalizar(null); fetchEventos(); }}
                />
            )}
        </Layout>
    );
}
