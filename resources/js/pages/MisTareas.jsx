import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import TareaDetalleModal from '../components/TareaDetalleModal';
import { useTheme } from '../hooks/useTheme';
import ModalCumplirTarea from '../components/ModalCumplirTarea';
import { useSearchParams } from 'react-router-dom';
import {
    ClipboardList, Calendar, CheckCircle, Clock,
    AlertCircle, Building2, CheckSquare, CheckCheck
} from 'lucide-react';

export default function MisTareas() {
    const { isDark } = useTheme();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [tareas, setTareas] = useState([]);
    const [compromisos, setCompromisos] = useState([]);
    const [resumen, setResumen] = useState({
        total_tareas: 0, pendientes: 0, realizadas: 0, vencidas: 0, canceladas: 0, total_compromisos: 0,
    });
    const [tab, setTab] = useState(() => searchParams.get('tab') === 'compromisos' ? 'compromisos' : 'tareas');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [filtroEstadoCompromiso, setFiltroEstadoCompromiso] = useState('todos');
    const [modalItem, setModalItem] = useState(null);
    const [itemDetalle, setItemDetalle] = useState(null);

    useEffect(() => { fetchMisTareas(); }, []);

    useEffect(() => {
        const verId = searchParams.get('ver');
        if (!verId || loading) return;
        const tabParam = searchParams.get('tab');
        if (tabParam === 'compromisos') {
            const c = compromisos.find(c => String(c.id) === String(verId));
            if (c) setItemDetalle({ tipo: 'compromiso', item: c });
        } else {
            const t = tareas.find(t => String(t.id) === String(verId));
            if (t) setItemDetalle({ tipo: 'tarea', item: t });
        }
    }, [searchParams, tareas, compromisos, loading]);

    const fetchMisTareas = async () => {
        setLoading(true);
        try {
            const res = await api.get('/mis-tareas');
            setTareas(res.data.tareas ?? []);
            setCompromisos(res.data.compromisos ?? []);
            setResumen(res.data.resumen ?? {});
        } catch (err) {
            console.error('Error al cargar mis tareas:', err);
        } finally {
            setLoading(false);
        }
    };

    const hoy = new Date().toISOString().split('T')[0];

    const compromisosFiltrados = compromisos.filter(c => {
        if (filtroEstadoCompromiso === 'todos') return true;
        if (filtroEstadoCompromiso === 'pendiente') return c.estado === 'pendiente';
        if (filtroEstadoCompromiso === 'cumplido') return c.estado === 'cumplido';
        if (filtroEstadoCompromiso === 'vencida') return c.estado === 'vencida';
        return true;
    });

    const tareasFiltradas = tareas.filter(t => {
        if (filtroEstado === 'vencidas')  return t.estado === 'vencido';
        if (filtroEstado === 'cancelado') return t.estado === 'cancelado';
        if (filtroEstado === 'todos') return true;
        return t.estado === filtroEstado;
    });

    const getEstadoTarea = (t) => {
        if (t.estado === 'vencido')   return { label: 'Vencida',   bg: isDark ? 'bg-red-500/20 text-red-300'     : 'bg-red-100 text-red-700'     };
        if (t.estado === 'realizado') return { label: 'Realizado', bg: isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700' };
        if (t.estado === 'cancelado') return { label: 'Cancelado', bg: isDark ? 'bg-gray-500/20 text-gray-300'    : 'bg-gray-100 text-gray-600'    };
        return { label: 'Pendiente', bg: isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-amber-100 text-amber-700' };
    };

    const cumplidaTarde = (t) =>
        t.estado === 'realizado' &&
        t.cerrado_at &&
        t.fecha_vencimiento &&
        new Date(t.cerrado_at) > new Date(String(t.fecha_vencimiento).slice(0, 10) + 'T23:59:59');

    const compromisoCumplidoTarde = (c) =>
        c.estado === 'cumplido' &&
        c.cumplido_at &&
        c.fecha_limite &&
        new Date(c.cumplido_at) > new Date(String(c.fecha_limite).slice(0, 10) + 'T23:59:59');

    const totalPendientes = tareas.filter(t => t.estado === 'pendiente').length
        + compromisos.filter(c => c.estado === 'pendiente').length;
    const totalRealizadas = tareas.filter(t => t.estado === 'realizado').length
        + compromisos.filter(c => c.estado === 'cumplido').length;
    const totalVencidas = tareas.filter(t => t.estado === 'vencido').length
        + compromisos.filter(c => c.estado === 'vencida').length;

    const statCards = [
        { label: 'Total',       value: tareas.length + compromisos.length, icon: <ClipboardList size={20} />, color: isDark ? 'text-indigo-400' : 'text-indigo-600', bg: isDark ? 'bg-indigo-500/10' : 'bg-indigo-50' },
        { label: 'Pendientes',  value: totalPendientes,                    icon: <Clock size={20} />,         color: isDark ? 'text-amber-400'  : 'text-amber-700',  bg: isDark ? 'bg-amber-500/10'  : 'bg-amber-50'  },
        { label: 'Realizadas',  value: totalRealizadas,                    icon: <CheckCircle size={20} />,   color: isDark ? 'text-emerald-400': 'text-emerald-700',bg: isDark ? 'bg-emerald-500/10': 'bg-emerald-50' },
        { label: 'Vencidas',    value: totalVencidas,                      icon: <AlertCircle size={20} />,   color: isDark ? 'text-red-400'    : 'text-red-700',    bg: isDark ? 'bg-red-500/10'    : 'bg-red-50'    },
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
                        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>Mis Tareas</h1>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Tareas asignadas y compromisos de eventos
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
                                    <p className={`text-2xl font-bold mt-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{card.value ?? 0}</p>
                                </div>
                                <div className={`p-2.5 rounded-xl ${card.bg} ${card.color}`}>{card.icon}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className={`flex gap-1 p-1 rounded-xl w-fit ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    {[
                        { key: 'tareas', label: 'Tareas asignadas', count: resumen.total_tareas, icon: <CheckSquare size={15} /> },
                        { key: 'compromisos', label: 'Compromisos de eventos', count: resumen.total_compromisos, icon: <ClipboardList size={15} /> },
                    ].map(t => (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                                tab === t.key
                                    ? isDark ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-700 shadow-sm'
                                    : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                            }`}>
                            {t.icon}
                            {t.label}
                            {t.count > 0 && (
                                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                                    tab === t.key ? 'bg-white/20' : isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-600'
                                }`}>{t.count}</span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent" />
                    </div>
                ) : tab === 'tareas' ? (
                    <div className="space-y-4">
                        {/* Filtros */}
                        <div className="flex gap-2 flex-wrap">
                            {[
                                { value: 'todos',     label: 'Todas' },
                                { value: 'pendiente', label: 'Pendientes' },
                                { value: 'realizado', label: 'Realizadas' },
                                { value: 'vencidas',  label: 'Vencidas' },
                            ].map(f => (
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

                        <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'}`}>
                            {tareasFiltradas.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16">
                                    <CheckSquare size={40} className={`mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                                    <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        {filtroEstado === 'todos' ? 'No tienes tareas asignadas' : 'Sin tareas en este estado'}
                                    </p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {tareasFiltradas.map(t => {
                                        const { label, bg } = getEstadoTarea(t);
                                        const pendiente = t.estado === 'pendiente' || t.estado === 'vencido';
                                        return (
                                            <div key={t.id} className={`p-5 transition ${isDark ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50'}`}>
                                                <div className="flex items-start justify-between gap-3 mb-2">
                                                    <div className="flex-1 min-w-0">
                                                        <button 
                                                            onClick={() => setItemDetalle({ tipo: 'tarea', item: t })}
                                                            className={`font-semibold text-left hover:underline transition ${isDark ? 'text-white hover:text-indigo-300' : 'text-gray-900 hover:text-indigo-700'}`}
                                                        >
                                                            {t.asunto}
                                                        </button>
                                                        {t.descripcion && (
                                                            <p className={`text-sm mt-0.5 line-clamp-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t.descripcion}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        {cumplidaTarde(t) && (
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700'}`}
                                                                title="Completada después de la fecha límite">
                                                                <AlertCircle size={11} /> Fuera de tiempo
                                                            </span>
                                                        )}
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${bg}`}>
                                                            {label}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                                    <div className={`flex flex-wrap gap-x-4 gap-y-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                                        {t.prioridad && (
                                                            <span className="flex items-center gap-1">
                                                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.prioridad.color }}></span>
                                                                {t.prioridad.nombre}
                                                            </span>
                                                        )}
                                                        {t.dependencia && (
                                                            <span className="flex items-center gap-1">
                                                                <Building2 size={12} /> {t.dependencia.nombre}
                                                            </span>
                                                        )}
                                                        {t.fecha_vencimiento && (
                                                            <span className="flex items-center gap-1">
                                                                <Calendar size={12} />
                                                                Vence: {new Date(String(t.fecha_vencimiento).slice(0, 10) + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    {pendiente && (
                                                        <button
                                                            onClick={() => setModalItem({ tipo: 'tarea', item: t })}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30 transition"
                                                        >
                                                            <CheckCheck size={13} /> Marcar como realizada
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Compromisos de eventos */
                    <div className="space-y-4">
                        {/* Filtros */}
                        <div className="flex gap-2 flex-wrap">
                            {[
                                { value: 'todos',     label: 'Todos' },
                                { value: 'pendiente', label: 'Pendientes' },
                                { value: 'cumplido',  label: 'Cumplidos' },
                                { value: 'vencida',   label: 'Vencidos' },
                            ].map(f => (
                                <button key={f.value} onClick={() => setFiltroEstadoCompromiso(f.value)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                        filtroEstadoCompromiso === f.value
                                            ? 'bg-indigo-600 text-white'
                                            : isDark ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                    }`}>
                                    {f.label}
                                </button>
                            ))}
                        </div>

                    <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'}`}>
                        {compromisosFiltrados.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <ClipboardList size={40} className={`mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                                <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>No tienes compromisos de eventos</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {compromisosFiltrados.map(c => {
                                    const estadoCls = c.estado === 'cumplido'
                                        ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700'
                                        : c.estado === 'vencida'
                                            ? isDark ? 'bg-red-500/20 text-red-400' : 'bg-red-50 text-red-700'
                                            : isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-700';
                                    const estadoLabel = c.estado === 'cumplido' ? 'Cumplido' : c.estado === 'vencida' ? 'Vencido' : 'Pendiente';
                                    const puedeCumplir = c.estado === 'pendiente' || c.estado === 'vencida';
                                    const tardio = compromisoCumplidoTarde(c);
                                    return (
                                        <div key={c.id} className={`p-5 transition ${isDark ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50'}`}>
                                            <div className="flex items-start justify-between gap-3 mb-2">
                                                <button
                                                    onClick={() => setItemDetalle({ tipo: 'compromiso', item: c })}
                                                    className={`font-semibold text-left flex-1 hover:underline transition ${isDark ? 'text-white hover:text-emerald-300' : 'text-gray-900 hover:text-emerald-700'}`}
                                                >
                                                    {c.descripcion}
                                                </button>
                                                <div className="flex items-center gap-2 flex-shrink-0">
                                                    {tardio && (
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700'}`}
                                                            title="Cumplido después de la fecha límite">
                                                            <AlertCircle size={11} /> Fuera de tiempo
                                                        </span>
                                                    )}
                                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${estadoCls}`}>
                                                        {estadoLabel}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between gap-4 flex-wrap">
                                                <div className={`flex flex-wrap gap-x-4 gap-y-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                                    {c.evento?.tema && (
                                                        <span className="flex items-center gap-1">
                                                            <Building2 size={12} /> {c.evento.tema}
                                                        </span>
                                                    )}
                                                    {c.fecha_limite && (
                                                        <span className="flex items-center gap-1">
                                                            <Calendar size={12} />
                                                            Límite: {new Date(String(c.fecha_limite).slice(0, 10) + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </span>
                                                    )}
                                                </div>
                                                {puedeCumplir && (
                                                    <button
                                                        onClick={() => setModalItem({ tipo: 'compromiso', item: c })}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                                            c.estado === 'vencida'
                                                                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:hover:bg-orange-500/30'
                                                                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:hover:bg-emerald-500/30'
                                                        }`}
                                                    >
                                                        <CheckCheck size={13} />
                                                        {c.estado === 'vencida' ? 'Cumplir (fuera de tiempo)' : 'Marcar como cumplido'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    </div>
                )}
            </div>

            {modalItem && (
                <ModalCumplirTarea
                    tipo={modalItem.tipo}
                    item={modalItem.item}
                    onClose={() => setModalItem(null)}
                    onCumplido={() => { setModalItem(null); fetchMisTareas(); }}
                />
            )}
            {itemDetalle && (
                <TareaDetalleModal
                    item={itemDetalle.item}
                    tipo={itemDetalle.tipo}
                    onClose={() => setItemDetalle(null)}
                />
            )}
        </Layout>
    );
}
