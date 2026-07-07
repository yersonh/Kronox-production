import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import EventoDetalleModal from '../components/EventoDetalleModal';
import TareaDetalleModal from '../components/TareaDetalleModal';
import api from '../api/axios';
import storage from '../api/storage';
import { CalendarDays, CheckSquare, AlertTriangle, Clock, PlayCircle, TrendingUp, ClipboardList, Building2, Calendar, ScrollText, CheckCircle, Ban, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

const toLocalDate = (s) => s ? new Date(s.slice(0, 16)) : new Date();

const EMPTY_STATS = {
    eventos_programados: 0,
    eventos_en_curso: 0,
    eventos_finalizados: 0,
    eventos_hoy: 0,
    eventos_total: 0,
    eventos_aplazados: 0,
    tareas_pendientes: 0,
    tareas_realizadas: 0,
    tareas_vencidas: 0,
    tareas_total: 0,
    compromisos_total: 0,
    compromisos_pendientes: 0,
    compromisos_realizados: 0,
    compromisos_vencidos: 0,
};

export default function Dashboard() {
    const navigate   = useNavigate();
    const user       = JSON.parse(storage.get('user') || '{}');
    const { isDark } = useTheme();
    const esGestor        = ['admin', 'super_admin', 'digitador'].includes(user.rol);
    const esAdminVista    = ['admin', 'super_admin'].includes(user.rol);

    const [stats, setStats]                       = useState(EMPTY_STATS);
    const [proximosEventos, setProximos]          = useState([]);
    const [proximasTareas, setProximasTareas]     = useState([]);
    const [proximosCompromisos, setProximosCompromisos] = useState([]);
    const [loading, setLoading]                   = useState(true);
    const [eventoModal, setEventoModal]           = useState(null);
    const [tareaModal, setTareaModal]             = useState(null);
    const [compromisoModal, setCompromisoModal]   = useState(null);

    const transformarCompromiso = (c) => ({
        ...c,
        persona:    typeof c.persona    === 'string' ? { nombre: c.persona, apellido: '' } : c.persona,
        dependencia: typeof c.dependencia === 'string' ? { nombre: c.dependencia } : c.dependencia,
        evento:     typeof c.evento     === 'string' ? { tema: c.evento } : c.evento,
    });

    useEffect(() => { fetchStats(); }, []);

    const fetchStats = async () => {
        try {
            const hoy   = new Date().toISOString().split('T')[0];
            const ahora = new Date();

            if (esGestor) {
                const [eventosRes, tareasRes, compromisosRes] = await Promise.all([
                    api.get('/eventos?per_page=500'),
                    api.get('/tareas?per_page=500'),
                    api.get('/reportes/compromisos'),
                ]);

                const eventos     = eventosRes.data.data ?? eventosRes.data;
                const tareas      = tareasRes.data.data ?? tareasRes.data;
                const compromisos = compromisosRes.data.compromisos ?? [];

                setStats({
                    eventos_programados: eventos.filter(e => e.estado === 'programado').length,
                    eventos_en_curso:    eventos.filter(e => e.estado === 'en_curso').length,
                    eventos_finalizados: eventos.filter(e => ['finalizado', 'cerrado'].includes(e.estado)).length,
                    eventos_hoy:         eventos.filter(e => e.fecha_hora?.startsWith(hoy)).length,
                    eventos_total:       eventos.length,
                    eventos_aplazados:   eventos.filter(e => e.estado === 'aplazado').length,
                    tareas_pendientes:   tareas.filter(t => t.estado === 'pendiente').length,
                    tareas_realizadas:   tareas.filter(t => t.estado === 'realizado').length,
                    tareas_vencidas:     tareas.filter(t => t.estado === 'pendiente' && t.fecha_vencimiento && t.fecha_vencimiento < hoy).length,
                    tareas_total:        tareas.length,
                    compromisos_total:      compromisos.length,
                    compromisos_pendientes: compromisos.filter(c => c.estado === 'pendiente').length,
                    compromisos_realizados: compromisos.filter(c => c.estado === 'cumplido').length,
                    compromisos_vencidos:   compromisos.filter(c => c.estado === 'vencida').length,
                });

                setProximos(
                    eventos
                        .filter(e => ['programado', 'en_curso', 'aplazado'].includes(e.estado) && toLocalDate(e.fecha_hora) >= ahora)
                        .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora))
                        .slice(0, 3)
                );

                setProximasTareas(
                    tareas
                        .filter(t => t.estado === 'pendiente')
                        .sort((a, b) => new Date(a.fecha_vencimiento ?? '9999') - new Date(b.fecha_vencimiento ?? '9999'))
                        .slice(0, 3)
                );

                setProximosCompromisos(
                    compromisos
                        .filter(c => c.estado === 'pendiente' || c.estado === 'vencida')
                        .sort((a, b) => new Date(a.fecha_limite ?? '9999') - new Date(b.fecha_limite ?? '9999'))
                        .slice(0, 3)
                );

            } else {
                const [eventosRes, misTareasRes] = await Promise.all([
                    api.get('/eventos?per_page=500'),
                    api.get('/mis-tareas'),
                ]);

                const eventos     = eventosRes.data.data ?? eventosRes.data;
                const tareas      = misTareasRes.data.tareas      ?? [];
                const compromisos = misTareasRes.data.compromisos ?? [];

                setStats({
                    eventos_programados: eventos.filter(e => e.estado === 'programado').length,
                    eventos_en_curso:    eventos.filter(e => e.estado === 'en_curso').length,
                    eventos_finalizados: eventos.filter(e => ['finalizado', 'cerrado'].includes(e.estado)).length,
                    eventos_hoy:         eventos.filter(e => e.fecha_hora?.startsWith(hoy)).length,
                    eventos_total:       eventos.length,
                    eventos_aplazados:   eventos.filter(e => e.estado === 'aplazado').length,
                    tareas_pendientes:   tareas.filter(t => t.estado === 'pendiente').length,
                    tareas_realizadas:   tareas.filter(t => t.estado === 'realizado').length,
                    tareas_vencidas:     tareas.filter(t => t.estado === 'pendiente' && t.fecha_vencimiento && t.fecha_vencimiento < hoy).length,
                    tareas_total:        tareas.length,
                    compromisos_total:      compromisos.length,
                    compromisos_pendientes: compromisos.filter(c => c.estado === 'pendiente').length,
                    compromisos_realizados: compromisos.filter(c => c.estado === 'cumplido').length,
                    compromisos_vencidos:   compromisos.filter(c => c.estado === 'vencida').length,
                });

                setProximos(
                    eventos
                        .filter(e => ['programado', 'en_curso', 'aplazado'].includes(e.estado) && toLocalDate(e.fecha_hora) >= ahora)
                        .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora))
                        .slice(0, 3)
                );

                setProximasTareas(
                    tareas
                        .filter(t => t.estado === 'pendiente')
                        .sort((a, b) => new Date(a.fecha_vencimiento ?? '9999') - new Date(b.fecha_vencimiento ?? '9999'))
                        .slice(0, 3)
                );

                setProximosCompromisos(
                    compromisos
                        .filter(c => c.estado === 'pendiente' || c.estado === 'vencida')
                        .sort((a, b) => new Date(a.fecha_limite ?? '9999') - new Date(b.fecha_limite ?? '9999'))
                        .slice(0, 3)
                );
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const pct = (n, total) => total > 0 ? Math.round((n / total) * 100) : 0;

    const cards = [
        {
            label: 'Programados',
            value: stats.eventos_programados,
            icon:  <Clock size={22} />,
            color: 'text-blue-600 dark:text-blue-400',
            bg:    'bg-blue-50 dark:bg-blue-900/20',
        },
        {
            label: 'En curso',
            value: stats.eventos_en_curso,
            icon:  <PlayCircle size={22} />,
            color: 'text-indigo-600 dark:text-indigo-400',
            bg:    'bg-indigo-50 dark:bg-indigo-900/20',
        },
        {
            label: 'Tareas pendientes',
            value: stats.tareas_pendientes,
            icon:  <CheckSquare size={22} />,
            color: 'text-violet-600 dark:text-violet-400',
            bg:    'bg-violet-50 dark:bg-violet-900/20',
        },
        {
            label: stats.compromisos_vencidos > 0 ? 'Compromisos vencidos' : 'Compromisos pendientes',
            value: stats.compromisos_vencidos > 0 ? stats.compromisos_vencidos : stats.compromisos_pendientes,
            icon:  <AlertTriangle size={22} />,
            color: stats.compromisos_vencidos > 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-amber-600 dark:text-amber-400',
            bg: stats.compromisos_vencidos > 0
                ? 'bg-rose-50 dark:bg-rose-900/20'
                : 'bg-amber-50 dark:bg-amber-900/20',
        },
    ];

    const badgeColor = (estado) => {
        const map = {
            programado: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
            en_curso:   'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
            aplazado:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
        };
        return map[estado] ?? 'bg-gray-100 text-gray-600';
    };

    const labelEstado = { programado: 'Programado', en_curso: 'En curso', aplazado: 'Aplazado' };

    const metricasGestor = [
        {
            label:  'Eventos finalizados',
            value:  stats.eventos_finalizados,
            total:  stats.eventos_total,
            bar:    'bg-emerald-500',
            detail: `${stats.eventos_finalizados} de ${stats.eventos_total}`,
        },
        {
            label:  'Tareas realizadas',
            value:  stats.tareas_realizadas,
            total:  stats.tareas_total,
            bar:    'bg-indigo-500',
            detail: `${stats.tareas_realizadas} de ${stats.tareas_total}`,
        },
        {
            label:  'Tareas en riesgo',
            value:  stats.tareas_vencidas,
            total:  stats.tareas_total,
            bar:    'bg-rose-500',
            detail: `${stats.tareas_vencidas} vencida${stats.tareas_vencidas !== 1 ? 's' : ''}`,
        },
        {
            label:  'Compromisos cumplidos',
            value:  stats.compromisos_realizados,
            total:  stats.compromisos_total,
            bar:    'bg-teal-500',
            detail: `${stats.compromisos_realizados} de ${stats.compromisos_total}`,
        },
        {
            label:  'Compromisos vencidos',
            value:  stats.compromisos_vencidos,
            total:  stats.compromisos_total,
            bar:    'bg-rose-500',
            detail: `${stats.compromisos_vencidos} vencido${stats.compromisos_vencidos !== 1 ? 's' : ''}`,
        },
    ];

    const metricasPersonal = [
        {
            label:  'Mis eventos finalizados',
            value:  stats.eventos_finalizados,
            total:  stats.eventos_total,
            bar:    'bg-emerald-500',
            detail: `${stats.eventos_finalizados} de ${stats.eventos_total}`,
        },
        {
            label:  'Mis tareas realizadas',
            value:  stats.tareas_realizadas,
            total:  stats.tareas_total,
            bar:    'bg-indigo-500',
            detail: `${stats.tareas_realizadas} de ${stats.tareas_total}`,
        },
        {
            label:  'Mis tareas en riesgo',
            value:  stats.tareas_vencidas,
            total:  stats.tareas_total,
            bar:    'bg-rose-500',
            detail: `${stats.tareas_vencidas} vencida${stats.tareas_vencidas !== 1 ? 's' : ''}`,
        },
        {
            label:  'Mis compromisos cumplidos',
            value:  stats.compromisos_realizados,
            total:  stats.compromisos_total,
            bar:    'bg-teal-500',
            detail: `${stats.compromisos_realizados} de ${stats.compromisos_total}`,
        },
        {
            label:  'Compromisos vencidos',
            value:  stats.compromisos_vencidos,
            total:  stats.compromisos_total,
            bar:    'bg-rose-500',
            detail: `${stats.compromisos_vencidos} vencido${stats.compromisos_vencidos !== 1 ? 's' : ''}`,
        },
    ];

    const metricas = esGestor ? metricasGestor : metricasPersonal;

    const NuevoBadge = () => (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300 uppercase tracking-wide">
            Nuevo
        </span>
    );

    const SectionHeader = ({ icon, label, color }) => (
        <div className={`flex items-center gap-1.5 mb-2 mt-4 first:mt-0`}>
            <span className={color}>{icon}</span>
            <span className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</span>
        </div>
    );

    const EmptyRow = ({ label }) => (
        <p className={`text-xs italic py-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{label}</p>
    );

    return (
        <>
        <Layout>
            {/* Hero */}
            <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 shadow-xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full filter blur-3xl opacity-20" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500 rounded-full filter blur-3xl opacity-20" />
                <div className="relative z-10">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                        ¡Bienvenido, {user.name?.split(' ')[0]}!
                    </h2>
                    <p className="text-indigo-200 text-sm">
                        {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    {stats.eventos_en_curso > 0 && (
                        <div className="mt-3 inline-flex items-center gap-2 bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-xs px-3 py-1.5 rounded-full">
                            <PlayCircle size={13} />
                            {stats.eventos_en_curso} evento{stats.eventos_en_curso !== 1 ? 's' : ''} en curso ahora
                        </div>
                    )}
                </div>
            </div>

            {/* Cards KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {cards.map(card => (
                    <div key={card.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{card.label}</p>
                                <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{loading ? '—' : card.value}</p>
                            </div>
                            <div className={`${card.bg} ${card.color} p-3 rounded-xl`}>
                                {card.icon}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Widget Mi Contrato — solo para contratistas */}
            {user.rol === 'contratista' && (() => {
                const c = user.persona?.contratista;
                if (!c) return null;
                const dias = c.fecha_fin ? Math.ceil((new Date(String(c.fecha_fin).substring(0, 10) + 'T12:00:00') - new Date()) / 86400000) : null;
                // Derivar estado efectivo desde fecha_fin: no depender del cron para actualizar el badge
                const estadoDB = c.estado_contrato ?? 'vigente';
                const estado = estadoDB === 'suspendido' ? 'suspendido'
                    : dias !== null && dias < 0  ? 'vencido'
                    : dias !== null && dias <= 30 ? 'por_vencer'
                    : 'vigente';

                const estadoCfg = {
                    vigente:    { label: 'Vigente',    cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: <CheckCircle size={14} />, barColor: 'bg-emerald-500' },
                    por_vencer: { label: 'Por vencer', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse', icon: <Clock size={14} />, barColor: 'bg-amber-500' },
                    vencido:    { label: 'Vencido',    cls: 'bg-red-500/20 text-red-300 border-red-500/30',   icon: <AlertTriangle size={14} />, barColor: 'bg-red-500' },
                    suspendido: { label: 'Suspendido', cls: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: <Ban size={14} />, barColor: 'bg-gray-500' },
                };
                const { label, cls, icon, barColor } = estadoCfg[estado] ?? estadoCfg.vigente;

                // Progreso del contrato: % del tiempo transcurrido
                let progreso = 0;
                if (c.fecha_inicio && c.fecha_fin) {
                    const inicio = new Date(String(c.fecha_inicio).substring(0, 10) + 'T12:00:00');
                    const fin    = new Date(String(c.fecha_fin).substring(0, 10) + 'T12:00:00');
                    const total  = fin - inicio;
                    const pasado = new Date() - inicio;
                    progreso = Math.min(100, Math.max(0, Math.round((pasado / total) * 100)));
                }

                return (
                    <div className="mb-6">
                        {(estado === 'vencido' || estado === 'por_vencer' || estado === 'suspendido') && (
                            <div className={`mb-4 flex items-start gap-3 p-4 rounded-xl border ${
                                estado === 'vencido'    ? 'bg-red-500/10 border-red-500/30 text-red-300' :
                                estado === 'suspendido' ? 'bg-gray-500/10 border-gray-500/30 text-gray-300' :
                                'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            }`}>
                                <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
                                <p className="text-sm">
                                    {estado === 'vencido'    && 'Tu contrato ha vencido. Tu acceso al sistema ha sido desactivado. Comunícate con el área de contratación.'}
                                    {estado === 'por_vencer' && `Tu contrato vence en ${dias} día${dias !== 1 ? 's' : ''}. Contacta al área de contratación para gestionar la renovación.`}
                                    {estado === 'suspendido' && `Tu contrato ha sido suspendido. Motivo: ${c.motivo_suspension ?? '—'}. Comunícate con el área de contratación.`}
                                </p>
                            </div>
                        )}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                                        <ScrollText size={18} className="text-indigo-600 dark:text-indigo-400" />
                                    </div>
                                    <h3 className="font-semibold text-gray-800 dark:text-white">Mi Contrato</h3>
                                </div>
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cls}`}>
                                    {icon} {label}{dias !== null && dias >= 0 && dias <= 30 && ` — ${dias}d`}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm mb-4">
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">N° Contrato</p>
                                    <p className="font-medium text-gray-800 dark:text-white">{c.numero_contrato || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Vigencia</p>
                                    <p className="font-medium text-gray-800 dark:text-white text-xs">
                                        {c.fecha_inicio ? new Date(String(c.fecha_inicio).substring(0, 10) + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                        {' → '}
                                        {c.fecha_fin ? new Date(String(c.fecha_fin).substring(0, 10) + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Dependencia</p>
                                    <p className="font-medium text-gray-800 dark:text-white">{c.dependencia?.nombre || '—'}</p>
                                </div>
                            </div>
                            {c.objeto_contrato && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">{c.objeto_contrato}</p>
                            )}
                            <div>
                                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1.5">
                                    <span>Tiempo transcurrido</span>
                                    <span>{progreso}%</span>
                                </div>
                                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                                    <div className={`${barColor} h-2 rounded-full transition-all duration-700`} style={{ width: `${progreso}%` }} />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Grid principal */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Panel izquierdo: Próximos + Tareas + Compromisos */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <CalendarDays size={20} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="font-semibold text-gray-800 dark:text-white">
                            {esGestor ? 'Próximos y pendientes' : 'Mis próximos y pendientes'}
                        </h3>
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            {[1, 2, 3, 4, 5].map(i => (
                                <div key={i} className="h-12 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div>
                            {/* Eventos */}
                            <SectionHeader
                                icon={<CalendarDays size={13} />}
                                label="Próximos eventos"
                                color="text-blue-500"
                            />
                            {proximosEventos.length === 0 ? (
                                <EmptyRow label="Sin eventos próximos" />
                            ) : (
                                <div className="space-y-1">
                                    {proximosEventos.map((e, idx) => (
                                        <div
                                            key={e.id}
                                            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition cursor-pointer ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}
                                            onClick={() => esAdminVista
                                                ? setEventoModal(e)
                                                : navigate(esGestor
                                                    ? `/calendario?fecha=${e.fecha_hora?.slice(0, 10)}`
                                                    : `/mi-calendario?fecha=${e.fecha_hora?.slice(0, 10)}`
                                                )
                                            }
                                        >
                                            <div className={`rounded-lg p-1.5 text-center min-w-[40px] flex-shrink-0 ${
                                                e.estado === 'en_curso'
                                                    ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400'
                                                    : e.estado === 'aplazado'
                                                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                                                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                            }`}>
                                                <p className="text-xs font-bold leading-none">
                                                    {toLocalDate(e.fecha_hora).toLocaleDateString('es-CO', { day: '2-digit' })}
                                                </p>
                                                <p className="text-[10px] uppercase leading-none mt-0.5">
                                                    {toLocalDate(e.fecha_hora).toLocaleDateString('es-CO', { month: 'short' })}
                                                </p>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{e.tema}</p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                                    {toLocalDate(e.fecha_hora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                                                    {e.sala?.nombre ? ` · ${e.sala.nombre}` : e.sitio ? ` · ${e.sitio}` : ''}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                {idx === proximosEventos.length - 1 && <NuevoBadge />}
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor(e.estado)}`}>
                                                    {labelEstado[e.estado] ?? e.estado}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Tareas */}
                            <div className={`border-t mt-3 pt-3 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                <SectionHeader
                                    icon={<CheckSquare size={13} />}
                                    label="Tareas pendientes"
                                    color="text-violet-500"
                                />
                                {proximasTareas.length === 0 ? (
                                    <EmptyRow label="Sin tareas pendientes" />
                                ) : (
                                    <div className="space-y-1">
                                        {proximasTareas.map((t, idx) => (
                                            <div
                                                key={t.id}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-xl ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} transition cursor-pointer`}
                                                onClick={() => esAdminVista
                                                    ? setTareaModal(t)
                                                    : navigate(esGestor ? `/tareas?ver=${t.id}` : `/mis-tareas?ver=${t.id}`)
                                                }
                                            >
                                                <div className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex-shrink-0">
                                                    <CheckSquare size={13} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{t.asunto}</p>
                                                    {t.fecha_vencimiento && (
                                                        <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                                            <Calendar size={10} />
                                                            Vence: {new Date(String(t.fecha_vencimiento).slice(0, 10) + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                                                        </p>
                                                    )}
                                                </div>
                                                {idx === proximasTareas.length - 1 && <NuevoBadge />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Compromisos */}
                            <div className={`border-t mt-3 pt-3 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                <SectionHeader
                                    icon={<ClipboardList size={13} />}
                                    label="Compromisos pendientes"
                                    color="text-teal-500"
                                />
                                {proximosCompromisos.length === 0 ? (
                                    <EmptyRow label="Sin compromisos pendientes" />
                                ) : (
                                    <div className="space-y-1">
                                        {proximosCompromisos.map((c, idx) => (
                                            <div
                                                key={c.id}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-xl ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} transition cursor-pointer`}
                                                onClick={() => esAdminVista
                                                    ? setCompromisoModal(transformarCompromiso(c))
                                                    : navigate(esGestor ? `/compromisos?ver=${c.id}` : `/mis-tareas?tab=compromisos&ver=${c.id}`)
                                                }
                                            >
                                                <div className={`p-1.5 rounded-lg flex-shrink-0 ${c.estado === 'vencida' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400' : 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'}`}>
                                                    <ClipboardList size={13} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{c.descripcion}</p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                                                        {(c.evento?.tema ?? (typeof c.evento === 'string' ? c.evento : null)) && <><Building2 size={10} /> {c.evento?.tema ?? c.evento}</>}
                                                        {c.fecha_limite && <><Calendar size={10} /> {new Date(String(c.fecha_limite).slice(0, 10) + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}</>}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                                    {idx === proximosCompromisos.length - 1 && <NuevoBadge />}
                                                    {c.estado === 'vencida' && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                                                            Vencido
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Métricas */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                            <TrendingUp size={20} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="font-semibold text-gray-800 dark:text-white">Métricas generales</h3>
                    </div>

                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3, 4].map(i => <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />)}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {metricas.map(item => (
                                <div key={item.label}>
                                    <div className="flex justify-between text-sm mb-1.5">
                                        <span className="text-gray-600 dark:text-gray-400 font-medium">{item.label}</span>
                                        <span className="text-gray-500 dark:text-gray-400 text-xs">{item.detail}</span>
                                    </div>
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                                        <div
                                            className={`${item.bar} h-2 rounded-full transition-all duration-700`}
                                            style={{ width: `${pct(item.value, item.total)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>

        {eventoModal && (
            <EventoDetalleModal
                evento={eventoModal}
                onClose={() => setEventoModal(null)}
            />
        )}
        {tareaModal && (
            <TareaDetalleModal
                item={tareaModal}
                tipo="tarea"
                onClose={() => setTareaModal(null)}
            />
        )}
        {compromisoModal && (
            <TareaDetalleModal
                item={compromisoModal}
                tipo="compromiso"
                onClose={() => setCompromisoModal(null)}
            />
        )}
        </>
    );
}
