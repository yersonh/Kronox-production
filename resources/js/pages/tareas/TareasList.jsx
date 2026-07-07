// resources/js/pages/tareas/TareasList.jsx
import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import TareaDetalleModal from '../../components/TareaDetalleModal';
import ModalCumplirTarea from '../../components/ModalCumplirTarea';
import api from '../../api/axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import storage from '../../api/storage';
import {
    Plus, CheckSquare, Circle, CheckCircle,
    AlertTriangle, AlertCircle, Calendar, User, Flag, Edit, Trash2,
    Search, Filter, X, ListTodo
} from 'lucide-react';

export default function TareasList() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { isDark } = useTheme();
    const user = JSON.parse(storage.get('user') || '{}');
    const esAdmin = ['admin', 'super_admin'].includes(user?.rol);
    const esGestor = ['admin', 'super_admin', 'digitador'].includes(user?.rol);
    const puedeInteractuar = user?.rol === 'digitador';
    const [tareas, setTareas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [busqueda, setBusqueda] = useState('');
    const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
    const [modalCumplir, setModalCumplir] = useState(null);
    const [confirmCancelar, setConfirmCancelar] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => { fetchTareas(); }, []);

    useEffect(() => {
        const verId = searchParams.get('ver');
        if (verId && tareas.length > 0) {
            const t = tareas.find(t => String(t.id) === String(verId));
            if (t) setTareaSeleccionada(t);
        }
    }, [searchParams, tareas]);

    const fetchTareas = async () => {
        try {
            const res = await api.get('/tareas');
            setTareas(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelar = async () => {
        if (!confirmCancelar) return;
        setActionLoading(true);
        try {
            await api.delete(`/tareas/${confirmCancelar}`);
            setConfirmCancelar(null);
            fetchTareas();
        } catch (err) {
            console.error(err);
        } finally {
            setActionLoading(false);
        }
    };

    const hoy = new Date().toISOString().split('T')[0];

    const cumplidaTarde = (t) =>
        t.estado === 'realizado' &&
        t.cerrado_at &&
        t.fecha_vencimiento &&
        new Date(t.cerrado_at) > new Date(String(t.fecha_vencimiento).slice(0, 10) + 'T23:59:59');

    const getEstadoInfo = (tarea) => {
        const vencida = tarea.estado === 'pendiente' && tarea.fecha_vencimiento < hoy;
        
        if (vencida) {
            return {
                label: 'Vencida',
                bg: isDark ? 'bg-orange-500/20' : 'bg-orange-100',
                text: isDark ? 'text-orange-300' : 'text-orange-700',
                icon: <AlertTriangle size={10} className="fill-current" />
            };
        }
        
        switch (tarea.estado) {
            case 'pendiente':
                return {
                    label: 'Pendiente',
                    bg: isDark ? 'bg-amber-500/20' : 'bg-amber-100',
                    text: isDark ? 'text-amber-300' : 'text-amber-700',
                    icon: <Circle size={10} className="fill-current" />
                };
            case 'realizado':
                return {
                    label: 'Realizado',
                    bg: isDark ? 'bg-emerald-500/20' : 'bg-emerald-100',
                    text: isDark ? 'text-emerald-300' : 'text-emerald-700',
                    icon: <CheckCircle size={10} className="fill-current" />
                };
            case 'cancelado':
                return {
                    label: 'Cancelado',
                    bg: isDark ? 'bg-red-500/20' : 'bg-red-100',
                    text: isDark ? 'text-red-300' : 'text-red-700',
                    icon: <CheckCircle size={10} className="fill-current" />
                };
            default:
                return {
                    label: 'Pendiente',
                    bg: isDark ? 'bg-amber-500/20' : 'bg-amber-100',
                    text: isDark ? 'text-amber-300' : 'text-amber-700',
                    icon: <Circle size={10} className="fill-current" />
                };
        }
    };

    const tareasFiltradas = tareas
        .filter(t => filtroEstado === 'todos' || t.estado === filtroEstado)
        .filter(t => t.asunto?.toLowerCase().includes(busqueda.toLowerCase()) ||
                     t.persona?.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
                     t.persona?.apellido?.toLowerCase().includes(busqueda.toLowerCase()));

    const stats = {
        total: tareas.length,
        pendientes: tareas.filter(t => t.estado === 'pendiente').length,
        vencidas: tareas.filter(t => t.estado === 'pendiente' && t.fecha_vencimiento < hoy).length,
        realizadas: tareas.filter(t => t.estado === 'realizado').length,
    };

    // Cards con los mismos colores que el Dashboard
    const statCards = [
        {
            label: 'Total',
            value: stats.total,
            icon: <ListTodo size={22} />,
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-900/20',
        },
        {
            label: 'Pendientes',
            value: stats.pendientes,
            icon: <Circle size={22} />,
            color: 'text-violet-600 dark:text-violet-400',
            bg: 'bg-violet-50 dark:bg-violet-900/20',
        },
        {
            label: 'Vencidas',
            value: stats.vencidas,
            icon: <AlertTriangle size={22} />,
            color: 'text-rose-600 dark:text-rose-400',
            bg: 'bg-rose-50 dark:bg-rose-900/20',
        },
        {
            label: 'Realizadas',
            value: stats.realizadas,
            icon: <CheckCircle size={22} />,
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        },
    ];

    const estados = [
        { value: 'todos', label: 'Todas', icon: <Filter size={14} /> },
        { value: 'pendiente', label: 'Pendientes', icon: <Circle size={14} /> },
        { value: 'realizado', label: 'Realizadas', icon: <CheckCircle size={14} /> },
        { value: 'cancelado', label: 'Canceladas', icon: <CheckCircle size={14} /> },
    ];

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <CheckSquare size={24} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                Tareas
                            </h2>
                        </div>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Gestión y seguimiento de tareas
                        </p>
                    </div>
                    {puedeInteractuar && (
                        <button
                            onClick={() => navigate('/tareas/nueva')}
                            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all transform hover:scale-[1.02]"
                        >
                            <Plus size={18} />
                            Nueva Tarea
                        </button>
                    )}
                </div>

                {/* Stats Cards - Mismo estilo que Dashboard */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {statCards.map((card) => (
                        <div key={card.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{card.label}</p>
                                    <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{card.value}</p>
                                </div>
                                <div className={`${card.bg} ${card.color} p-3 rounded-xl`}>
                                    {card.icon}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Filtros y búsqueda */}
                <div className="flex flex-col sm:flex-row gap-4">
                    {/* Buscador */}
                    <div className="flex-1 relative">
                        <Search size={18} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <input
                            type="text"
                            placeholder="Buscar por asunto o responsable..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm transition ${
                                isDark 
                                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500' 
                                    : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500'
                            } border focus:outline-none`}
                        />
                        {busqueda && (
                            <button
                                onClick={() => setBusqueda('')}
                                className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {/* Filtros de estado */}
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {estados.map(estado => (
                            <button
                                key={estado.value}
                                onClick={() => setFiltroEstado(estado.value)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                                    filtroEstado === estado.value
                                        ? isDark
                                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                            : 'bg-indigo-600 text-white shadow-sm'
                                        : isDark
                                            ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
                                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                }`}
                            >
                                {estado.icon}
                                {estado.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tabla de tareas */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent"></div>
                    </div>
                ) : (
                    <div className={`rounded-2xl shadow-lg overflow-hidden transition ${
                        isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'
                    }`}>
                        {/* Vista para desktop */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className={isDark ? 'bg-gray-900/50 border-b border-gray-700' : 'bg-gray-50 border-b border-gray-200'}>
                                    <tr>
                                        <th className={`text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            No.
                                        </th>
                                        <th className={`text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            Asunto
                                        </th>
                                        <th className={`text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            <div className="flex items-center gap-1">
                                                <User size={12} />
                                                Responsable
                                            </div>
                                        </th>
                                        <th className={`text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            <div className="flex items-center gap-1">
                                                <Flag size={12} />
                                                Prioridad
                                            </div>
                                        </th>
                                        <th className={`text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            <div className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                Vencimiento
                                            </div>
                                        </th>
                                        <th className={`text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            Estado
                                        </th>
                                        {puedeInteractuar && (
                                            <th className={`px-5 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                Acciones
                                            </th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {tareasFiltradas.map(t => {
                                        const estadoInfo = getEstadoInfo(t);
                                        return (
                                            <tr key={t.id} className={`transition ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                                                <td className={`px-5 py-3.5 font-mono text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    {t.numero || `T-${t.id}`}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <button
                                                        onClick={() => setTareaSeleccionada(t)}
                                                        className={`font-medium text-left hover:underline transition ${isDark ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-700 hover:text-indigo-900'}`}
                                                        title="Ver detalle de la tarea"
                                                    >
                                                        {t.asunto}
                                                    </button>
                                                    {t.descripcion && (
                                                        <p className={`text-xs mt-0.5 truncate max-w-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                            {t.descripcion}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                    {t.persona ? `${t.persona.nombre} ${t.persona.apellido}` : '-'}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    {t.prioridad && (
                                                        <span className="flex items-center gap-1.5">
                                                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.prioridad.color }}></span>
                                                            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                                {t.prioridad.nombre}
                                                            </span>
                                                        </span>
                                                    )}
                                                </td>
                                                <td className={`px-5 py-3.5 text-sm ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                                                    {t.fecha_vencimiento ? new Date(String(t.fecha_vencimiento).slice(0, 10) + 'T00:00:00').toLocaleDateString('es-CO') : '-'}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex flex-row flex-wrap items-center gap-1.5">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${estadoInfo.bg} ${estadoInfo.text}`}>
                                                            {estadoInfo.icon}
                                                            {estadoInfo.label}
                                                        </span>
                                                        {cumplidaTarde(t) && (
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700'}`}
                                                                title="Completada después de la fecha límite">
                                                                <AlertCircle size={11} /> Fuera de tiempo
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                {puedeInteractuar && (
                                                    <td className="px-5 py-3.5">
                                                        <div className="flex items-center gap-2">
                                                            {t.estado === 'pendiente' && (
                                                                <button
                                                                    onClick={() => navigate(`/tareas/${t.id}/editar`)}
                                                                    className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-indigo-400' : 'hover:bg-gray-100 text-gray-500 hover:text-indigo-600'}`}
                                                                    title="Editar"
                                                                >
                                                                    <Edit size={16} />
                                                                </button>
                                                            )}
                                                            {t.estado === 'pendiente' && user?.persona_id && t.persona_id == user.persona_id && (
                                                                <button
                                                                    onClick={() => setModalCumplir(t)}
                                                                    className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-emerald-400' : 'hover:bg-gray-100 text-gray-500 hover:text-emerald-600'}`}
                                                                    title="Marcar como realizada"
                                                                >
                                                                    <CheckSquare size={16} />
                                                                </button>
                                                            )}
                                                            {t.estado === 'pendiente' && (
                                                                <button
                                                                    onClick={() => setConfirmCancelar(t.id)}
                                                                    className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-red-400' : 'hover:bg-gray-100 text-gray-500 hover:text-red-600'}`}
                                                                    title="Cancelar"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                    {tareasFiltradas.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className={`px-5 py-16 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                <CheckSquare size={48} className={`mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                                                <p>No hay tareas registradas</p>
                                                {puedeInteractuar && (
                                                    <button
                                                        onClick={() => navigate('/tareas/nueva')}
                                                        className={`mt-3 text-sm font-medium transition ${
                                                            isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
                                                        }`}
                                                    >
                                                        Crear primera tarea
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Vista para móvil - Cards */}
                        <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
                            {tareasFiltradas.map(t => {
                                const estadoInfo = getEstadoInfo(t);
                                return (
                                    <div key={t.id} className={`p-4 ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <button
                                                    onClick={() => setTareaSeleccionada(t)}
                                                    className={`font-semibold text-left hover:underline transition ${isDark ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-700 hover:text-indigo-900'}`}
                                                    title="Ver detalle de la tarea"
                                                >
                                                    {t.asunto}
                                                </button>
                                                <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    {t.numero || `T-${t.id}`}
                                                </p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${estadoInfo.bg} ${estadoInfo.text}`}>
                                                    {estadoInfo.icon}
                                                    {estadoInfo.label}
                                                </span>
                                                {cumplidaTarde(t) && (
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700'}`}
                                                        title="Completada después de la fecha límite">
                                                        <AlertCircle size={11} /> Fuera de tiempo
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        
                                        {t.descripcion && (
                                            <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                                {t.descripcion}
                                            </p>
                                        )}
                                        
                                        <div className="space-y-1.5 mt-3">
                                            <div className="flex items-center gap-2 text-sm">
                                                <User size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                                                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                                    {t.persona ? `${t.persona.nombre} ${t.persona.apellido}` : '-'}
                                                </span>
                                            </div>
                                            {t.prioridad && (
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Flag size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                                                    <span className="flex items-center gap-1.5">
                                                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.prioridad.color }}></span>
                                                        <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                                            {t.prioridad.nombre}
                                                        </span>
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex items-center gap-2 text-sm">
                                                <Calendar size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                                                <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                                    Vence: {t.fecha_vencimiento ? new Date(String(t.fecha_vencimiento).slice(0, 10) + 'T00:00:00').toLocaleDateString('es-CO') : '-'}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        {puedeInteractuar && t.estado === 'pendiente' && (
                                            <div className="flex gap-3 mt-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                                                <button
                                                    onClick={() => navigate(`/tareas/${t.id}/editar`)}
                                                    className={`flex items-center gap-1 text-sm font-medium transition ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
                                                >
                                                    <Edit size={14} /> Editar
                                                </button>
                                                {user?.persona_id && t.persona_id == user.persona_id && (
                                                    <button
                                                        onClick={() => setModalCumplir(t)}
                                                        className={`flex items-center gap-1 text-sm font-medium transition ${isDark ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700'}`}
                                                    >
                                                        <CheckSquare size={14} /> Marcar realizada
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setConfirmCancelar(t.id)}
                                                    className={`flex items-center gap-1 text-sm font-medium transition ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}
                                                >
                                                    <Trash2 size={14} /> Cancelar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {tareasFiltradas.length === 0 && (
                                <div className={`p-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <CheckSquare size={48} className={`mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                                    <p>No hay tareas registradas</p>
                                    {puedeInteractuar && (
                                        <button
                                            onClick={() => navigate('/tareas/nueva')}
                                            className={`mt-3 text-sm font-medium transition ${
                                                isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
                                            }`}
                                        >
                                            Crear primera tarea
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            {tareaSeleccionada && (
                <TareaDetalleModal
                    item={tareaSeleccionada}
                    tipo="tarea"
                    onClose={() => setTareaSeleccionada(null)}
                />
            )}

            {modalCumplir && (
                <ModalCumplirTarea
                    tipo="tarea"
                    item={modalCumplir}
                    onClose={() => setModalCumplir(null)}
                    onCumplido={() => { setModalCumplir(null); fetchTareas(); }}
                />
            )}

            {/* Modal confirmar cancelar tarea */}
            {confirmCancelar && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmCancelar(null)} />
                    <div className={`relative w-full max-w-sm rounded-2xl shadow-2xl p-6 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}>
                            <Trash2 size={24} className={isDark ? 'text-red-400' : 'text-red-600'} />
                        </div>
                        <h3 className={`text-lg font-semibold text-center mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>¿Cancelar esta tarea?</h3>
                        <p className={`text-sm text-center mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>La tarea quedará marcada como cancelada y no se podrá revertir.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmCancelar(null)} disabled={actionLoading}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                No, volver
                            </button>
                            <button onClick={handleCancelar} disabled={actionLoading}
                                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50">
                                {actionLoading ? 'Cancelando...' : 'Sí, cancelar tarea'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}