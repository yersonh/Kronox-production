// resources/js/pages/admin/Panorama.jsx
import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { useTheme } from '../../hooks/useTheme';
import {
    RefreshCw, CalendarCheck, CheckSquare, ClipboardList, TrendingUp,
    Clock, AlertTriangle, Gauge, Info, Calendar,
} from 'lucide-react';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const AÑO_ACTUAL = new Date().getFullYear();
const AÑOS = Array.from({ length: 4 }, (_, i) => AÑO_ACTUAL - 3 + i + 1).reverse(); // current + 3 back

function tono(pct) {
    if (pct === null || pct === undefined) return 'gray';
    if (pct >= 80) return 'emerald';
    if (pct >= 50) return 'amber';
    return 'red';
}

const TONOS = {
    emerald: { text: 'text-emerald-500', bar: 'bg-emerald-500', ring: 'text-emerald-500', soft: 'bg-emerald-500/10' },
    amber:   { text: 'text-amber-500',   bar: 'bg-amber-500',   ring: 'text-amber-500',   soft: 'bg-amber-500/10' },
    red:     { text: 'text-red-500',     bar: 'bg-red-500',     ring: 'text-red-500',     soft: 'bg-red-500/10' },
    gray:    { text: 'text-gray-400',    bar: 'bg-gray-400',    ring: 'text-gray-400',    soft: 'bg-gray-500/10' },
};

function AnilloIndice({ valor, isDark }) {
    const radio = 54;
    const circ = 2 * Math.PI * radio;
    const pct = valor ?? 0;
    const offset = circ - (pct / 100) * circ;
    const t = TONOS[tono(valor)];
    return (
        <div className="relative w-40 h-40 flex-shrink-0">
            <svg className="w-40 h-40 -rotate-90" viewBox="0 0 128 128">
                <circle cx="64" cy="64" r={radio} fill="none" strokeWidth="11"
                    className={isDark ? 'stroke-gray-700' : 'stroke-gray-200'} />
                <circle cx="64" cy="64" r={radio} fill="none" strokeWidth="11" strokeLinecap="round"
                    className={`${t.ring} transition-all duration-1000`}
                    stroke="currentColor" strokeDasharray={circ} strokeDashoffset={offset} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {valor === null ? '—' : `${valor}%`}
                </span>
                <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>a tiempo</span>
            </div>
        </div>
    );
}

function BarraPuntualidad({ aTiempo, tarde, isDark }) {
    const total = aTiempo + tarde;
    const pctOk = total > 0 ? (aTiempo / total) * 100 : 0;
    return (
        <div className={`h-2.5 rounded-full overflow-hidden flex ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div className="bg-emerald-500 h-full transition-all duration-700" style={{ width: `${pctOk}%` }} />
            <div className="bg-red-400 h-full transition-all duration-700" style={{ width: `${100 - pctOk}%` }} />
        </div>
    );
}

function TarjetaTipo({ icon, titulo, completadas, aTiempo, tarde, pendientes, vencidas, pctATiempo, color, isDark, palabraDestiempo = 'tarde', notaDestiempo }) {
    const t = TONOS[tono(pctATiempo)];
    return (
        <div className={`p-5 rounded-2xl border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl ${color.soft} ${color.text}`}>{icon}</div>
                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>{titulo}</h3>
                </div>
                <div className="text-right">
                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{completadas}</p>
                    <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>completadas</p>
                </div>
            </div>
            {completadas > 0 ? (
                <>
                    <div className="flex justify-between text-xs mb-1.5">
                        <span className={`font-medium ${t.text}`}>{pctATiempo}% a tiempo</span>
                        <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>
                            {aTiempo} a tiempo · {tarde} {palabraDestiempo}
                        </span>
                    </div>
                    <BarraPuntualidad aTiempo={aTiempo} tarde={tarde} isDark={isDark} />
                    {notaDestiempo && tarde > 0 && (
                        <p className={`flex items-start gap-1.5 mt-2 text-[11px] leading-tight ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            <Info size={12} className="flex-shrink-0 mt-px text-red-400" />
                            <span>{notaDestiempo}</span>
                        </p>
                    )}
                </>
            ) : (
                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Sin actividades completadas</p>
            )}
            <div className={`grid grid-cols-2 gap-2 mt-4 pt-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className="flex items-center gap-1.5">
                    <Clock size={13} className="text-amber-500" />
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 justify-end">
                    <AlertTriangle size={13} className="text-red-500" />
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {vencidas} vencida{vencidas !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>
        </div>
    );
}

function GraficoTendencia({ datos, isDark }) {
    const [hover, setHover] = useState(null);
    const [animado, setAnimado] = useState(false);

    useEffect(() => {
        setAnimado(false);
        const t = setTimeout(() => setAnimado(true), 50);
        return () => clearTimeout(t);
    }, [datos]);

    const max = Math.max(1, ...datos.map(d => d.eventos + d.tareas + d.compromisos));
    const series = [
        { key: 'eventos',     label: 'Eventos',     color: '#6366f1' },
        { key: 'tareas',      label: 'Tareas',      color: '#a855f7' },
        { key: 'compromisos', label: 'Compromisos', color: '#14b8a6' },
    ];

    return (
        <div>
            <div className="flex items-end justify-between gap-3 h-48">
                {datos.map((d, idx) => {
                    const total = d.eventos + d.tareas + d.compromisos;
                    const hTotal = animado ? (total / max) * 100 : 0;
                    const activo = hover === idx;
                    return (
                        <div
                            key={d.mes}
                            className="relative flex-1 flex flex-col items-center justify-end h-full gap-2 cursor-pointer group"
                            onMouseEnter={() => setHover(idx)}
                            onMouseLeave={() => setHover(null)}
                        >
                            {activo && total > 0 && (
                                <div className={`absolute bottom-full mb-2 z-20 w-44 p-3 rounded-xl shadow-xl border text-left pointer-events-none transition-opacity ${
                                    isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
                                }`}>
                                    <p className={`text-xs font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>{d.label}</p>
                                    <div className="space-y-1.5">
                                        {series.map(s => (
                                            <div key={s.key} className="flex items-center justify-between gap-2">
                                                <span className="flex items-center gap-1.5">
                                                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }} />
                                                    <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{s.label}</span>
                                                </span>
                                                <span className={`text-xs font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>{d[s.key]}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className={`flex items-center justify-between gap-2 mt-2 pt-2 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                        <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Total</span>
                                        <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{total}</span>
                                    </div>
                                    <div className={`absolute top-full left-1/2 -translate-x-1/2 -mt-px w-2 h-2 rotate-45 border-r border-b ${
                                        isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
                                    }`} />
                                </div>
                            )}
                            <span className={`text-xs font-semibold transition-colors ${
                                activo ? (isDark ? 'text-white' : 'text-gray-900') : (isDark ? 'text-gray-300' : 'text-gray-600')
                            }`}>{total}</span>
                            <div
                                className={`w-full flex flex-col-reverse rounded-t-lg overflow-hidden transition-all duration-700 ease-out ${
                                    activo ? 'ring-2 ring-indigo-400/60' : ''
                                }`}
                                style={{ height: `${hTotal}%`, minHeight: total > 0 ? '6px' : '0', opacity: hover === null || activo ? 1 : 0.55 }}
                            >
                                {series.map(s => {
                                    const val = d[s.key];
                                    if (val === 0) return null;
                                    return <div key={s.key} className="transition-all duration-300" style={{ height: `${(val / total) * 100}%`, backgroundColor: s.color }} />;
                                })}
                            </div>
                            <span className={`text-[11px] transition-colors ${
                                activo ? (isDark ? 'text-gray-200' : 'text-gray-700') : (isDark ? 'text-gray-400' : 'text-gray-500')
                            }`}>{d.label}</span>
                        </div>
                    );
                })}
            </div>
            <div className="flex items-center justify-center gap-4 mt-4">
                {series.map(s => (
                    <div key={s.key} className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: s.color }} />
                        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{s.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── Filter helpers ────────────────────────────────────────────────────────────

function lastDayOfMonth(year, month) {
    return new Date(year, month, 0).getDate();
}

function pad(n) { return String(n).padStart(2, '0'); }

function buildApiParams(filtroTipo, filtroAnio, filtroMes, semestre) {
    if (filtroTipo === 'todo') return {};

    if (filtroTipo === 'mes') {
        const desde = `${filtroAnio}-${pad(filtroMes)}-01`;
        const hasta = `${filtroAnio}-${pad(filtroMes)}-${lastDayOfMonth(filtroAnio, filtroMes)}`;
        // Tendencia shows full year so the selected month is visible in context
        return { desde, hasta, t_desde: `${filtroAnio}-01-01`, t_hasta: `${filtroAnio}-12-31` };
    }

    if (filtroTipo === 'año') {
        let desde, hasta;
        if (semestre === 1)      { desde = `${filtroAnio}-01-01`; hasta = `${filtroAnio}-06-30`; }
        else if (semestre === 2) { desde = `${filtroAnio}-07-01`; hasta = `${filtroAnio}-12-31`; }
        else                     { desde = `${filtroAnio}-01-01`; hasta = `${filtroAnio}-12-31`; }
        return { desde, hasta, t_desde: desde, t_hasta: hasta };
    }

    return {};
}

function periodoLabel(filtroTipo, filtroAnio, filtroMes, semestre) {
    if (filtroTipo === 'todo') return 'Histórico completo';
    if (filtroTipo === 'mes') return `${MESES[filtroMes - 1]} ${filtroAnio}`;
    if (filtroTipo === 'año') {
        if (semestre === 1) return `1er semestre ${filtroAnio}`;
        if (semestre === 2) return `2do semestre ${filtroAnio}`;
        return `Año ${filtroAnio}`;
    }
    return '';
}

function tendenciaSubtitulo(filtroTipo, filtroAnio, filtroMes, semestre) {
    if (filtroTipo === 'todo') return 'Eventos finalizados, tareas realizadas y compromisos cumplidos en los últimos 6 meses';
    if (filtroTipo === 'mes') return `Actividades completadas por mes en ${filtroAnio} — ${MESES[filtroMes - 1]} resaltado`;
    if (filtroTipo === 'año') {
        if (semestre === 1) return `Actividades completadas — primer semestre (Ene–Jun ${filtroAnio})`;
        if (semestre === 2) return `Actividades completadas — segundo semestre (Jul–Dic ${filtroAnio})`;
        return `Actividades completadas por mes en ${filtroAnio}`;
    }
    return '';
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Panorama() {
    const { isDark } = useTheme();
    const [data, setData]     = useState(null);
    const [loading, setLoading] = useState(true);

    // Filter state
    const [filtroTipo, setFiltroTipo] = useState('todo'); // 'todo' | 'mes' | 'año'
    const [filtroAnio, setFiltroAnio] = useState(AÑO_ACTUAL);
    const [filtroMes,  setFiltroMes]  = useState(new Date().getMonth() + 1); // 1-12
    const [semestre,   setSemestre]   = useState(null); // null | 1 | 2

    useEffect(() => { cargar(); }, [filtroTipo, filtroAnio, filtroMes, semestre]);

    const cargar = async () => {
        setLoading(true);
        try {
            const params = buildApiParams(filtroTipo, filtroAnio, filtroMes, semestre);
            const res = await api.get('/estadisticas/panorama', { params });
            setData(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const cardBase = isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200 shadow-sm';
    const tIndice  = TONOS[tono(data?.indice_cumplimiento)];

    const btnFiltro = (tipo) =>
        `px-3 py-1.5 text-sm font-medium rounded-lg transition ${
            filtroTipo === tipo
                ? 'bg-indigo-600 text-white'
                : isDark
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-gray-100'
        }`;

    const selectBase = `text-sm rounded-lg px-2.5 py-1.5 border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${
        isDark
            ? 'bg-gray-700 border-gray-600 text-white'
            : 'bg-white border-gray-200 text-gray-700'
    }`;

    const btnSem = (val) =>
        `px-3 py-1.5 text-xs font-medium rounded-lg border transition ${
            semestre === val
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : isDark
                    ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
        }`;

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                Panorama General
                            </h1>
                            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Visión global del rendimiento de la alcaldía: cumplimiento y puntualidad
                            </p>
                        </div>
                        <button
                            onClick={cargar}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition self-start"
                        >
                            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                            Actualizar
                        </button>
                    </div>

                    {/* Filter bar */}
                    <div className={`flex flex-wrap items-center gap-3 p-3 rounded-xl border ${isDark ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-1">
                            <Calendar size={15} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                            <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Período:</span>
                        </div>

                        {/* Type pills */}
                        <div className={`flex items-center gap-1 p-1 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-white border border-gray-200'}`}>
                            <button className={btnFiltro('todo')} onClick={() => { setFiltroTipo('todo'); setSemestre(null); }}>Todo</button>
                            <button className={btnFiltro('mes')}  onClick={() => setFiltroTipo('mes')}>Por mes</button>
                            <button className={btnFiltro('año')}  onClick={() => { setFiltroTipo('año'); setSemestre(null); }}>Por año</button>
                        </div>

                        {/* Year selector — shown when mes or año */}
                        {filtroTipo !== 'todo' && (
                            <select
                                value={filtroAnio}
                                onChange={e => setFiltroAnio(Number(e.target.value))}
                                className={selectBase}
                            >
                                {AÑOS.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        )}

                        {/* Month selector — shown when mes */}
                        {filtroTipo === 'mes' && (
                            <select
                                value={filtroMes}
                                onChange={e => setFiltroMes(Number(e.target.value))}
                                className={selectBase}
                            >
                                {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                            </select>
                        )}

                        {/* Semestre options — shown when año */}
                        {filtroTipo === 'año' && (
                            <div className="flex items-center gap-1.5">
                                <button className={btnSem(null)} onClick={() => setSemestre(null)}>Todo el año</button>
                                <button className={btnSem(1)}    onClick={() => setSemestre(1)}>1er semestre</button>
                                <button className={btnSem(2)}    onClick={() => setSemestre(2)}>2do semestre</button>
                            </div>
                        )}

                        {/* Active period badge */}
                        {filtroTipo !== 'todo' && (
                            <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-700'}`}>
                                {periodoLabel(filtroTipo, filtroAnio, filtroMes, semestre)}
                            </span>
                        )}
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
                    </div>
                ) : !data ? (
                    <p className={`text-sm text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        No se pudieron cargar los datos
                    </p>
                ) : (
                    <>
                        {/* Índice general + resumen */}
                        <div className={`p-6 rounded-2xl ${cardBase}`}>
                            <div className="flex flex-col lg:flex-row items-center gap-8">
                                <div className="flex items-center gap-5">
                                    <AnilloIndice valor={data.indice_cumplimiento} isDark={isDark} />
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Gauge size={18} className={tIndice.text} />
                                            <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                                Índice de cumplimiento
                                            </h2>
                                        </div>
                                        <p className={`text-sm max-w-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            De las <strong>{data.total_completadas}</strong> actividades completadas,
                                            <strong className="text-emerald-500"> {data.total_a_tiempo}</strong> se realizaron a tiempo
                                            y <strong className="text-red-500"> {data.total_destiempo}</strong> en destiempo.
                                        </p>
                                        {filtroTipo !== 'todo' && (
                                            <p className={`text-xs mt-1.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                Período: <span className="font-medium">{periodoLabel(filtroTipo, filtroAnio, filtroMes, semestre)}</span>
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Mini contadores globales */}
                                <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
                                    {[
                                        { label: 'Eventos realizados',     val: data.eventos.realizados,                                    sub: `${data.eventos.pct_a_tiempo ?? 0}% a tiempo` },
                                        { label: 'Tareas realizadas',      val: data.tareas.realizadas,                                     sub: `${data.tareas.pct_a_tiempo ?? 0}% a tiempo` },
                                        { label: 'Compromisos cumplidos',  val: data.compromisos.cumplidos,                                 sub: `${data.compromisos.pct_a_tiempo ?? 0}% a tiempo` },
                                        { label: 'Eventos en agenda',      val: data.eventos.programados + data.eventos.en_curso,           sub: 'programados / en curso' },
                                    ].map((kpi) => (
                                        <div key={kpi.label} className={`p-3 rounded-xl ${isDark ? 'bg-gray-700/40' : 'bg-gray-50'}`}>
                                            <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{kpi.val}</p>
                                            <p className={`text-[11px] leading-tight mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{kpi.label}</p>
                                            <p className={`text-[10px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{kpi.sub}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Tarjetas por tipo */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <TarjetaTipo
                                icon={<CalendarCheck size={18} />} titulo="Eventos"
                                completadas={data.eventos.realizados}
                                aTiempo={data.eventos.a_tiempo} tarde={data.eventos.destiempo}
                                pendientes={data.eventos.programados + data.eventos.en_curso}
                                vencidas={data.eventos.cancelados}
                                pctATiempo={data.eventos.pct_a_tiempo}
                                color={{ soft: 'bg-indigo-500/10', text: 'text-indigo-500' }}
                                isDark={isDark}
                                palabraDestiempo="sin finalizar"
                                notaDestiempo="Cerrados automáticamente por el sistema porque el responsable no los finalizó a tiempo."
                            />
                            <TarjetaTipo
                                icon={<CheckSquare size={18} />} titulo="Tareas"
                                completadas={data.tareas.realizadas}
                                aTiempo={data.tareas.a_tiempo} tarde={data.tareas.tarde}
                                pendientes={data.tareas.pendientes} vencidas={data.tareas.vencidas}
                                pctATiempo={data.tareas.pct_a_tiempo}
                                color={{ soft: 'bg-violet-500/10', text: 'text-violet-500' }}
                                isDark={isDark}
                            />
                            <TarjetaTipo
                                icon={<ClipboardList size={18} />} titulo="Compromisos"
                                completadas={data.compromisos.cumplidos}
                                aTiempo={data.compromisos.a_tiempo} tarde={data.compromisos.tarde}
                                pendientes={data.compromisos.pendientes} vencidas={data.compromisos.vencidos}
                                pctATiempo={data.compromisos.pct_a_tiempo}
                                color={{ soft: 'bg-teal-500/10', text: 'text-teal-500' }}
                                isDark={isDark}
                            />
                        </div>

                        {/* Tendencia */}
                        <div className={`p-6 rounded-2xl ${cardBase}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp size={18} className="text-indigo-500" />
                                <h2 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                    Tendencia de actividades completadas
                                </h2>
                            </div>
                            <p className={`text-xs mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {tendenciaSubtitulo(filtroTipo, filtroAnio, filtroMes, semestre)}
                            </p>
                            <GraficoTendencia datos={data.tendencia} isDark={isDark} />
                        </div>
                    </>
                )}
            </div>
        </Layout>
    );
}
