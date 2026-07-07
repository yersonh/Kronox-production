import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import TareaDetalleModal from '../components/TareaDetalleModal';
import api from '../api/axios';
import { useTheme } from '../hooks/useTheme';
import { useSearchParams } from 'react-router-dom';
import {
    ClipboardList, Circle, CheckCircle, AlertTriangle, AlertCircle,
    Calendar, User, Building2, Search, Filter, X
} from 'lucide-react';

export default function Compromisos() {
    const { isDark } = useTheme();
    const [searchParams, setSearchParams] = useSearchParams();
    const [compromisos, setCompromisos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [busqueda, setBusqueda] = useState('');
    const [seleccionado, setSeleccionado] = useState(null);

    const hoy = new Date().toISOString().split('T')[0];

    useEffect(() => { fetchCompromisos(); }, []);

    const fetchCompromisos = async () => {
        try {
            const res = await api.get('/reportes/compromisos');
            const lista = res.data.compromisos ?? [];
            setCompromisos(lista);

            // Auto-abrir si viene ?ver=ID
            const verId = searchParams.get('ver');
            if (verId) {
                const found = lista.find(c => String(c.id) === String(verId));
                if (found) setSeleccionado(transformar(found));
                setSearchParams({}, { replace: true });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Adapta el formato plano del reporte al formato que espera TareaDetalleModal
    const transformar = (c) => ({
        ...c,
        persona: typeof c.persona === 'string'
            ? { nombre: c.persona, apellido: '' }
            : c.persona,
        dependencia: typeof c.dependencia === 'string'
            ? { nombre: c.dependencia }
            : c.dependencia,
        evento: typeof c.evento === 'string'
            ? { tema: c.evento }
            : c.evento,
    });

    const compromisosFiltrados = compromisos
        .filter(c => filtroEstado === 'todos' || c.estado === filtroEstado)
        .filter(c =>
            c.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
            (typeof c.persona === 'string' ? c.persona : `${c.persona?.nombre} ${c.persona?.apellido}`)
                .toLowerCase().includes(busqueda.toLowerCase())
        );

    const stats = {
        total:     compromisos.length,
        pendiente: compromisos.filter(c => c.estado === 'pendiente').length,
        vencidos:  compromisos.filter(c => c.estado === 'vencida').length,
        cumplidos: compromisos.filter(c => c.estado === 'cumplido').length,
    };

    const statCards = [
        { label: 'Total',     value: stats.total,     icon: <ClipboardList size={22} />, color: 'text-blue-600 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-900/20' },
        { label: 'Pendientes',value: stats.pendiente,  icon: <Circle size={22} />,        color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/20' },
        { label: 'Vencidos',  value: stats.vencidos,   icon: <AlertTriangle size={22} />, color: 'text-rose-600 dark:text-rose-400',    bg: 'bg-rose-50 dark:bg-rose-900/20' },
        { label: 'Cumplidos', value: stats.cumplidos,  icon: <CheckCircle size={22} />,   color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
    ];

    const getEstadoInfo = (c) => {
        if (c.estado === 'vencida') return {
            label: 'Vencido',
            bg: isDark ? 'bg-rose-500/20' : 'bg-rose-100',
            text: isDark ? 'text-rose-300' : 'text-rose-700',
        };
        if (c.estado === 'cumplido') return {
            label: 'Cumplido',
            bg: isDark ? 'bg-emerald-500/20' : 'bg-emerald-100',
            text: isDark ? 'text-emerald-300' : 'text-emerald-700',
        };
        if (c.estado === 'cancelado') return {
            label: 'Cancelado',
            bg: isDark ? 'bg-gray-500/20' : 'bg-gray-100',
            text: isDark ? 'text-gray-400' : 'text-gray-600',
        };
        return {
            label: 'Pendiente',
            bg: isDark ? 'bg-amber-500/20' : 'bg-amber-100',
            text: isDark ? 'text-amber-300' : 'text-amber-700',
        };
    };

    const cumplidoTarde = (c) =>
        c.estado === 'cumplido' &&
        c.cumplido_at &&
        c.fecha_limite &&
        new Date(c.cumplido_at) > new Date(String(c.fecha_limite).slice(0, 10) + 'T23:59:59');

    const filtros = [
        { value: 'todos',    label: 'Todos' },
        { value: 'pendiente',label: 'Pendientes' },
        { value: 'vencida',  label: 'Vencidos' },
        { value: 'cumplido', label: 'Cumplidos' },
        { value: 'cancelado',label: 'Cancelados' },
    ];

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <ClipboardList size={24} className={isDark ? 'text-teal-400' : 'text-teal-600'} />
                        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Compromisos</h2>
                    </div>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Compromisos generados en eventos
                    </p>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {statCards.map(card => (
                        <div key={card.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{card.label}</p>
                                    <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{card.value}</p>
                                </div>
                                <div className={`${card.bg} ${card.color} p-3 rounded-xl`}>{card.icon}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filtros y búsqueda */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <input
                            type="text"
                            placeholder="Buscar por descripción o responsable..."
                            value={busqueda}
                            onChange={e => setBusqueda(e.target.value)}
                            className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-teal-500 transition ${
                                isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                            }`}
                        />
                        {busqueda && (
                            <button onClick={() => setBusqueda('')} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {filtros.map(f => (
                            <button key={f.value} onClick={() => setFiltroEstado(f.value)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                                    filtroEstado === f.value
                                        ? isDark ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30' : 'bg-teal-600 text-white shadow-sm'
                                        : isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                }`}>
                                {f.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tabla */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-teal-500 border-t-transparent" />
                    </div>
                ) : (
                    <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'}`}>
                        {/* Desktop */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className={isDark ? 'bg-gray-900/50 border-b border-gray-700' : 'bg-gray-50 border-b border-gray-200'}>
                                    <tr>
                                        {['#', 'Descripción', 'Responsable', 'Evento', 'Dependencia', 'Fecha límite', 'Fecha cierre', 'Estado'].map(h => (
                                            <th key={h} className={`text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {compromisosFiltrados.map(c => {
                                        const ei = getEstadoInfo(c);
                                        const tarde = cumplidoTarde(c);
                                        const personaLabel = typeof c.persona === 'string' ? c.persona : `${c.persona?.nombre ?? ''} ${c.persona?.apellido ?? ''}`.trim();
                                        const eventoLabel  = typeof c.evento === 'string' ? c.evento : c.evento?.tema ?? '-';
                                        return (
                                            <tr key={c.id} className={`transition ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                                                <td className={`px-5 py-3.5 font-mono text-xs whitespace-nowrap ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{c.numero || `C-${c.id}`}</td>
                                                <td className="px-5 py-3.5">
                                                    <button
                                                        onClick={() => setSeleccionado(transformar(c))}
                                                        className={`font-medium text-left hover:underline transition ${isDark ? 'text-teal-300 hover:text-teal-200' : 'text-teal-700 hover:text-teal-900'}`}
                                                    >
                                                        {c.descripcion}
                                                    </button>
                                                </td>
                                                <td className={`px-5 py-3.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{personaLabel || '-'}</td>
                                                <td className={`px-5 py-3.5 max-w-[160px] truncate ${isDark ? 'text-gray-400' : 'text-gray-600'}`} title={eventoLabel}>{eventoLabel}</td>
                                                <td className={`px-5 py-3.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{c.dependencia ?? '-'}</td>
                                                <td className={`px-5 py-3.5 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                                    {c.fecha_limite ? new Date(String(c.fecha_limite).slice(0, 10) + 'T00:00:00').toLocaleDateString('es-CO') : '-'}
                                                </td>
                                                <td className={`px-5 py-3.5 text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {c.cumplido_at
                                                        ? new Date(c.cumplido_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                                                        : <span className={isDark ? 'text-gray-600' : 'text-gray-400'}>—</span>
                                                    }
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ei.bg} ${ei.text}`}>
                                                            {ei.label}
                                                        </span>
                                                        {tarde && (
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${isDark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700'}`}>
                                                                <AlertCircle size={11} /> Fuera de tiempo
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {compromisosFiltrados.length === 0 && (
                                        <tr>
                                            <td colSpan="8" className={`px-5 py-16 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                <ClipboardList size={48} className={`mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                                                <p>No hay compromisos registrados</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile */}
                        <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
                            {compromisosFiltrados.map(c => {
                                const ei = getEstadoInfo(c);
                                const tarde = cumplidoTarde(c);
                                const personaLabel = typeof c.persona === 'string' ? c.persona : `${c.persona?.nombre ?? ''} ${c.persona?.apellido ?? ''}`.trim();
                                const eventoLabel  = typeof c.evento === 'string' ? c.evento : c.evento?.tema ?? '-';
                                return (
                                    <div key={c.id} className={`p-4 ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                                        <div className="flex items-start justify-between mb-2 gap-3">
                                            <button
                                                onClick={() => setSeleccionado(transformar(c))}
                                                className={`font-semibold text-left hover:underline transition ${isDark ? 'text-teal-300' : 'text-teal-700'}`}
                                            >
                                                {c.descripcion}
                                            </button>
                                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ei.bg} ${ei.text}`}>{ei.label}</span>
                                                {tarde && (
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700'}`}>
                                                        <AlertCircle size={11} /> Fuera de tiempo
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className={`space-y-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                            {personaLabel && <p className="flex items-center gap-1"><User size={12} /> {personaLabel}</p>}
                                            {eventoLabel !== '-' && <p className="flex items-center gap-1"><ClipboardList size={12} /> {eventoLabel}</p>}
                                            {c.fecha_limite && <p className="flex items-center gap-1"><Calendar size={12} /> Límite: {new Date(String(c.fecha_limite).slice(0, 10) + 'T00:00:00').toLocaleDateString('es-CO')}</p>}
                                            {c.cumplido_at && <p className="flex items-center gap-1"><Calendar size={12} /> Cierre: {new Date(c.cumplido_at).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>}
                                        </div>
                                    </div>
                                );
                            })}
                            {compromisosFiltrados.length === 0 && (
                                <div className={`p-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <ClipboardList size={48} className={`mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                                    <p>No hay compromisos registrados</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {seleccionado && (
                <TareaDetalleModal
                    item={seleccionado}
                    tipo="compromiso"
                    onClose={() => setSeleccionado(null)}
                />
            )}
        </Layout>
    );
}
