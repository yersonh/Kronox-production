// resources/js/pages/admin/Estadisticas.jsx
import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { useTheme } from '../../hooks/useTheme';
import { useDebounce } from '../../hooks/useDebounce';
import {
    BarChart2, Users, RefreshCw, ChevronRight, ChevronLeft, CalendarDays, FileCheck,
    CalendarCheck, CheckSquare, ClipboardList, Briefcase, UserCog, Calendar,
} from 'lucide-react';

const COLORES = [
    'bg-indigo-400', 'bg-violet-400', 'bg-cyan-400', 'bg-emerald-400',
    'bg-yellow-400', 'bg-rose-400', 'bg-teal-400', 'bg-fuchsia-400',
];

const MESES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const AÑO_ACTUAL = new Date().getFullYear();
const AÑOS = Array.from({ length: 4 }, (_, i) => AÑO_ACTUAL - 3 + i + 1).reverse();

// ── Filter helpers (same as Panorama) ────────────────────────────────────────

function pad(n) { return String(n).padStart(2, '0'); }
function lastDay(y, m) { return new Date(y, m, 0).getDate(); }

function buildParams(filtroTipo, filtroAnio, filtroMes, semestre) {
    if (filtroTipo === 'todo') return {};
    if (filtroTipo === 'mes') {
        return {
            desde: `${filtroAnio}-${pad(filtroMes)}-01`,
            hasta: `${filtroAnio}-${pad(filtroMes)}-${lastDay(filtroAnio, filtroMes)}`,
        };
    }
    if (filtroTipo === 'año') {
        if (semestre === 1) return { desde: `${filtroAnio}-01-01`, hasta: `${filtroAnio}-06-30` };
        if (semestre === 2) return { desde: `${filtroAnio}-07-01`, hasta: `${filtroAnio}-12-31` };
        return { desde: `${filtroAnio}-01-01`, hasta: `${filtroAnio}-12-31` };
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

// ── Utility components ────────────────────────────────────────────────────────

function colorPct(pct, isDark) {
    if (pct === null || pct === undefined) return isDark ? 'text-gray-400' : 'text-gray-500';
    if (pct >= 80) return isDark ? 'text-emerald-300' : 'text-emerald-600';
    if (pct >= 50) return isDark ? 'text-amber-300' : 'text-amber-600';
    return isDark ? 'text-red-300' : 'text-red-600';
}

function PuntualidadInline({ aTiempo, destiempo, pct, isDark }) {
    if (aTiempo + destiempo === 0) {
        return <span className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Sin completar</span>;
    }
    return (
        <span className={`text-[11px] font-medium ${colorPct(pct, isDark)}`}>
            {pct}% a tiempo
            <span className={`ml-1 font-normal ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                ({aTiempo}✓ · {destiempo}✕)
            </span>
        </span>
    );
}

function BarraDependencia({ dep, max, isDark }) {
    const [expandido, setExpandido] = useState(false);
    const pct = max > 0 ? Math.round((dep.total / max) * 100) : 0;

    return (
        <div>
            <button
                onClick={() => dep.por_sector?.length > 0 && setExpandido(!expandido)}
                className={`w-full text-left group ${dep.por_sector?.length > 0 ? 'cursor-pointer' : 'cursor-default'}`}
            >
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-medium flex-1 truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                        {dep.nombre}
                    </span>
                    <PuntualidadInline aTiempo={dep.a_tiempo} destiempo={dep.destiempo} pct={dep.pct_a_tiempo} isDark={isDark} />
                    <span className={`text-xs font-bold w-7 text-right ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                        {dep.total}
                    </span>
                    {dep.por_sector?.length > 0 && (
                        <span className={`text-gray-400 transition-transform duration-200 ${expandido ? 'rotate-90' : ''}`}>
                            <ChevronRight size={14} />
                        </span>
                    )}
                </div>
                <div className={`h-5 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div className="h-full flex transition-all duration-700" style={{ width: `${pct}%` }}>
                        <div className="h-full bg-emerald-500/80" style={{ width: `${dep.total > 0 ? (dep.a_tiempo / dep.total) * 100 : 0}%` }} />
                        <div className="h-full bg-red-400/80" style={{ width: `${dep.total > 0 ? (dep.destiempo / dep.total) * 100 : 0}%` }} />
                    </div>
                </div>
            </button>

            {expandido && dep.por_sector?.length > 0 && (
                <div className="ml-4 mt-2 space-y-2 border-l-2 border-gray-200 dark:border-gray-600 pl-3">
                    {dep.por_sector.map((s) => {
                        const sPct = dep.total > 0 ? Math.round((s.total / dep.total) * 100) : 0;
                        return (
                            <div key={s.nombre}>
                                <div className="flex items-center gap-2 mb-0.5">
                                    <span className={`text-xs flex-1 truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{s.nombre}</span>
                                    <PuntualidadInline aTiempo={s.a_tiempo} destiempo={s.destiempo} pct={s.pct_a_tiempo} isDark={isDark} />
                                    <span className={`text-xs w-7 text-right ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{s.total}</span>
                                </div>
                                <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                    <div className="h-full flex" style={{ width: `${sPct}%` }}>
                                        <div className="h-full bg-emerald-500/70" style={{ width: `${s.total > 0 ? (s.a_tiempo / s.total) * 100 : 0}%` }} />
                                        <div className="h-full bg-red-400/70" style={{ width: `${s.total > 0 ? (s.destiempo / s.total) * 100 : 0}%` }} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function mesesEnPeriodo(filtroTipo, semestre) {
    if (filtroTipo === 'mes') return 1;
    if (filtroTipo === 'año') return (semestre === 1 || semestre === 2) ? 6 : 12;
    return null; // 'todo' — no aplica
}

function TarjetaPersona({ p, filtroTipo, semestre, isDark }) {
    const pctOblig = p.total_obligaciones > 0
        ? Math.round((p.obligaciones_evidenciadas / p.total_obligaciones) * 100)
        : null;

    const colorOblig = pctOblig === null ? 'bg-gray-500'
        : pctOblig >= 80 ? 'bg-emerald-500'
        : pctOblig >= 50 ? 'bg-amber-500'
        : 'bg-red-500';

    const totalMeses = mesesEnPeriodo(filtroTipo, semestre);
    const esMensual  = filtroTipo === 'mes';

    const esContratista = p.tipo === 'contratista';

    return (
        <div className={`p-3 rounded-xl border transition-colors overflow-hidden ${isDark ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
            <div className="flex items-start justify-between gap-2 mb-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                        <span className={`flex-shrink-0 ${esContratista ? 'text-indigo-400' : 'text-cyan-400'}`}>
                            {esContratista ? <Briefcase size={13} /> : <UserCog size={13} />}
                        </span>
                        <p className={`text-sm font-semibold truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>{p.nombre}</p>
                    </div>
                    {p.dependencia && (
                        <p className={`text-xs truncate mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{p.dependencia}</p>
                    )}
                    {p.detalle && (
                        <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{p.detalle}</p>
                    )}
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                    <span className={`text-lg font-bold ${colorPct(p.indice, isDark)}`}>
                        {p.indice === null ? '—' : `${p.indice}%`}
                    </span>
                    <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>a tiempo</span>
                </div>
            </div>

            <div className={`grid grid-cols-3 gap-1 mb-3 p-1.5 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-gray-100'}`}>
                {[
                    { icon: <CalendarCheck size={10} />, label: 'Eventos',     val: p.eventos_mes,     c: isDark ? 'text-indigo-300' : 'text-indigo-700', ci: isDark ? 'text-indigo-400' : 'text-indigo-600', tarde: null },
                    { icon: <CheckSquare size={10} />,  label: 'Tareas',       val: p.tareas_mes,      c: isDark ? 'text-violet-300' : 'text-violet-700', ci: isDark ? 'text-violet-400' : 'text-violet-600', tarde: p.tareas_tarde },
                    { icon: <ClipboardList size={10} />, label: 'Compromisos', val: p.compromisos_mes, c: isDark ? 'text-teal-300'   : 'text-teal-700',   ci: isDark ? 'text-teal-400'   : 'text-teal-600',   tarde: p.compromisos_tarde },
                ].map((d, i) => (
                    <div key={d.label} className={`text-center ${i === 1 ? `border-x ${isDark ? 'border-gray-600' : 'border-gray-200'}` : ''}`}>
                        <div className="flex items-center justify-center gap-1 mb-0.5">
                            <span className={d.ci}>{d.icon}</span>
                            <span className={`text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{d.label}</span>
                        </div>
                        <span className={`text-sm font-bold ${d.c}`}>{d.val ?? 0}</span>
                        {d.tarde > 0 && (
                            <span className="block text-[9px] text-red-400 leading-none">{d.tarde} tarde</span>
                        )}
                    </div>
                ))}
            </div>

            <div className="flex items-center justify-between text-xs mb-2">
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Total del período</span>
                <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                    {p.actividades_mes} {p.actividades_mes === 1 ? 'actividad' : 'actividades'}
                </span>
            </div>

            {esContratista && p.total_obligaciones > 0 && (
                <div>
                    {esMensual ? (
                        /* Vista mensual: % de obligaciones evidenciadas este mes */
                        <>
                            <div className="flex justify-between items-center text-xs mb-1">
                                <span className={`flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <FileCheck size={11} /> Obligaciones con soporte
                                </span>
                                <span className={`font-semibold ${colorPct(pctOblig, isDark)}`}>
                                    {p.obligaciones_evidenciadas}/{p.total_obligaciones} ({pctOblig}%)
                                </span>
                            </div>
                            <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                <div className={`h-full rounded-full transition-all duration-700 ${colorOblig}`}
                                    style={{ width: `${pctOblig}%` }} />
                            </div>
                        </>
                    ) : (
                        /* Vista semestral/anual/todo: meses con al menos una obligación evidenciada */
                        <>
                            <div className="flex justify-between items-center text-xs mb-1">
                                <span className={`flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    <FileCheck size={11} /> Meses con obligaciones evidenciadas
                                </span>
                                <span className={`font-semibold ${
                                    p.meses_con_obligaciones === 0 ? (isDark ? 'text-gray-400' : 'text-gray-500')
                                    : p.meses_con_obligaciones === totalMeses ? (isDark ? 'text-emerald-400' : 'text-emerald-600')
                                    : (isDark ? 'text-amber-400' : 'text-amber-600')
                                }`}>
                                    {p.meses_con_obligaciones}{totalMeses ? `/${totalMeses}` : ''} {totalMeses ? 'meses' : 'mes(es)'}
                                </span>
                            </div>
                            {totalMeses && (
                                <div className="flex gap-0.5">
                                    {Array.from({ length: totalMeses }).map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-2 flex-1 rounded-sm transition-all duration-500 ${
                                                i < p.meses_con_obligaciones
                                                    ? (p.meses_con_obligaciones === totalMeses ? 'bg-emerald-500' : 'bg-amber-500')
                                                    : (isDark ? 'bg-gray-700' : 'bg-gray-200')
                                            }`}
                                        />
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Estadisticas() {
    const { isDark } = useTheme();
    const [dependencias, setDependencias] = useState([]);
    const [personas, setPersonas]         = useState([]);
    const [loading, setLoading]           = useState(false);
    const [loadingP, setLoadingP]         = useState(false);
    const [busquedaP, setBusquedaP]       = useState('');
    const debBusqueda = useDebounce(busquedaP);
    const [filtroPersonaTipo, setFiltroPersonaTipo] = useState('todos');
    const [tab, setTab] = useState('dependencias');

    const [pageP, setPageP]       = useState(1);
    const [totalP, setTotalP]     = useState(0);
    const [lastPageP, setLastPageP] = useState(1);
    const PER_PAGE = 12;

    // Shared period filter
    const [filtroTipo, setFiltroTipo] = useState('todo'); // 'todo' | 'mes' | 'año'
    const [filtroAnio, setFiltroAnio] = useState(AÑO_ACTUAL);
    const [filtroMes,  setFiltroMes]  = useState(new Date().getMonth() + 1);
    const [semestre,   setSemestre]   = useState(null); // null | 1 | 2

    const periodoParams = buildParams(filtroTipo, filtroAnio, filtroMes, semestre);
    const periodoLbl    = periodoLabel(filtroTipo, filtroAnio, filtroMes, semestre);

    useEffect(() => {
        const params = buildParams(filtroTipo, filtroAnio, filtroMes, semestre);
        cargarDependencias(params);
    }, [filtroTipo, filtroAnio, filtroMes, semestre]);

    useEffect(() => {
        if (tab === 'personas') {
            const params = buildParams(filtroTipo, filtroAnio, filtroMes, semestre);
            cargarPersonas(params);
        }
    }, [tab, filtroTipo, filtroAnio, filtroMes, semestre, filtroPersonaTipo, debBusqueda, pageP]);

    const cargarDependencias = async (params = periodoParams) => {
        setLoading(true);
        try {
            const res = await api.get('/estadisticas/dependencias', { params });
            setDependencias(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const cargarPersonas = async (params = periodoParams) => {
        setLoadingP(true);
        try {
            const res = await api.get('/estadisticas/personas', {
                params: { ...params, page: pageP, per_page: PER_PAGE, tipo: filtroPersonaTipo, buscar: debBusqueda },
            });
            setPersonas(res.data.personas ?? []);
            setTotalP(res.data.total ?? 0);
            setLastPageP(res.data.last_page ?? 1);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingP(false);
        }
    };

    const maxDep = dependencias.reduce((m, d) => Math.max(m, d.total), 0);

    const cardBase = isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200 shadow-sm';

    const tabBase = (active) => `px-4 py-2 rounded-lg text-sm font-medium transition ${
        active
            ? 'bg-indigo-600 text-white shadow'
            : isDark
                ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    }`;

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

    const inputCls = `px-3 py-2 rounded-lg text-sm border outline-none transition ${
        isDark
            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-500'
            : 'bg-white border-gray-200 text-gray-800 focus:border-indigo-400'
    }`;

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                            <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                Estadísticas de Rendimiento
                            </h1>
                            <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Cumplimiento y puntualidad por dependencia, sector y persona
                            </p>
                        </div>
                        <button
                            onClick={() => { const p = buildParams(filtroTipo, filtroAnio, filtroMes, semestre); tab === 'dependencias' ? cargarDependencias(p) : cargarPersonas(p); }}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition self-start"
                        >
                            <RefreshCw size={15} className={(loading || loadingP) ? 'animate-spin' : ''} />
                            Actualizar
                        </button>
                    </div>

                    {/* Shared period filter */}
                    <div className={`flex flex-wrap items-center gap-3 p-3 rounded-xl border ${isDark ? 'bg-gray-800/60 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                        <div className="flex items-center gap-1">
                            <Calendar size={15} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
                            <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Período:</span>
                        </div>

                        <div className={`flex items-center gap-1 p-1 rounded-lg ${isDark ? 'bg-gray-700/50' : 'bg-white border border-gray-200'}`}>
                            <button className={btnFiltro('todo')} onClick={() => { setFiltroTipo('todo'); setSemestre(null); setPageP(1); }}>Todo</button>
                            <button className={btnFiltro('mes')}  onClick={() => { setFiltroTipo('mes'); setPageP(1); }}>Por mes</button>
                            <button className={btnFiltro('año')}  onClick={() => { setFiltroTipo('año'); setSemestre(null); setPageP(1); }}>Por año</button>
                        </div>

                        {filtroTipo !== 'todo' && (
                            <select value={filtroAnio} onChange={e => { setFiltroAnio(Number(e.target.value)); setPageP(1); }} className={selectBase}>
                                {AÑOS.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        )}

                        {filtroTipo === 'mes' && (
                            <select value={filtroMes} onChange={e => { setFiltroMes(Number(e.target.value)); setPageP(1); }} className={selectBase}>
                                {MESES.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                            </select>
                        )}

                        {filtroTipo === 'año' && (
                            <div className="flex flex-wrap items-center gap-1.5">
                                <button className={btnSem(null)} onClick={() => { setSemestre(null); setPageP(1); }}>Todo el año</button>
                                <button className={btnSem(1)}    onClick={() => { setSemestre(1);    setPageP(1); }}>1er semestre</button>
                                <button className={btnSem(2)}    onClick={() => { setSemestre(2);    setPageP(1); }}>2do semestre</button>
                            </div>
                        )}

                        {filtroTipo !== 'todo' && (
                            <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-indigo-50 text-indigo-700'}`}>
                                {periodoLbl}
                            </span>
                        )}
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex flex-wrap gap-2">
                    <button className={tabBase(tab === 'dependencias')} onClick={() => setTab('dependencias')}>
                        <span className="flex items-center gap-2"><BarChart2 size={15} />Dependencias y Sectores</span>
                    </button>
                    <button className={tabBase(tab === 'personas')} onClick={() => setTab('personas')}>
                        <span className="flex items-center gap-2"><Users size={15} />Contratistas y Funcionarios</span>
                    </button>
                </div>

                {/* Leyenda puntualidad */}
                {tab === 'dependencias' && (
                    <div className={`flex items-center gap-4 text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500/80" /> A tiempo</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-400/80" /> En destiempo (tarde o por el sistema)</span>
                    </div>
                )}

                {/* Tab: Dependencias */}
                {tab === 'dependencias' && (
                    loading ? (
                        <div className="flex items-center justify-center py-24">
                            <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
                        </div>
                    ) : (
                        <div className={`p-4 sm:p-6 rounded-xl ${cardBase}`}>
                            <h2 className={`text-base font-semibold mb-1 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                Eventos realizados por dependencia
                            </h2>
                            <p className={`text-xs mb-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Haz clic en una dependencia para ver el desglose por sector. Cuenta <strong>eventos finalizados o cerrados</strong>;
                                el color indica si se completaron <strong className="text-emerald-500">a tiempo</strong> o
                                <strong className="text-red-500"> en destiempo</strong> (finalizados tarde o cerrados automáticamente por el sistema).
                                {filtroTipo !== 'todo' && <> · <span className="font-semibold">{periodoLbl}</span></>}
                            </p>
                            {dependencias.length === 0 ? (
                                <p className={`text-sm text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Sin datos disponibles</p>
                            ) : (
                                <div className="space-y-4">
                                    {dependencias.map((dep, i) => (
                                        <BarraDependencia key={dep.id} dep={dep} max={maxDep} isDark={isDark} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                )}

                {/* Tab: Contratistas y Funcionarios */}
                {tab === 'personas' && (
                    <div className={`p-4 sm:p-6 rounded-xl ${cardBase}`}>
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 mb-5">
                            <div>
                                <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                    Rendimiento individual
                                </h2>
                                <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {totalP} {totalP === 1 ? 'persona' : 'personas'} · {periodoLbl} · El índice es el % de actividades realizadas a tiempo
                                </p>
                            </div>
                            <input
                                type="text"
                                placeholder="Buscar nombre o dependencia..."
                                value={busquedaP}
                                onChange={(e) => { setBusquedaP(e.target.value); setPageP(1); }}
                                className={`${inputCls} w-full sm:w-64`}
                            />
                        </div>

                        {/* Filtro tipo persona */}
                        <div className="flex gap-2 mb-5">
                            {[
                                { v: 'todos', l: 'Todos' },
                                { v: 'contratista', l: 'Contratistas' },
                                { v: 'funcionario', l: 'Funcionarios' },
                            ].map((f) => (
                                <button key={f.v} onClick={() => { setFiltroPersonaTipo(f.v); setPageP(1); }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                                        filtroPersonaTipo === f.v
                                            ? 'bg-indigo-600 text-white'
                                            : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}>
                                    {f.l}
                                </button>
                            ))}
                        </div>

                        {loadingP ? (
                            <div className="flex items-center justify-center py-16">
                                <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
                            </div>
                        ) : personas.length === 0 ? (
                            <p className={`text-sm text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Sin personas que coincidan
                            </p>
                        ) : (
                            <>
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 min-w-0">
                                    {personas.map((p) => (
                                        <TarjetaPersona key={p.id} p={p} filtroTipo={filtroTipo} semestre={semestre} isDark={isDark} />
                                    ))}
                                </div>

                                {lastPageP > 1 && (
                                    <div className="flex items-center justify-center gap-3 mt-6">
                                        <button
                                            onClick={() => setPageP((p) => Math.max(1, p - 1))}
                                            disabled={pageP <= 1}
                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
                                                isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            <ChevronLeft size={15} /> Anterior
                                        </button>
                                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            Página <strong className={isDark ? 'text-white' : 'text-gray-800'}>{pageP}</strong> de {lastPageP}
                                        </span>
                                        <button
                                            onClick={() => setPageP((p) => Math.min(lastPageP, p + 1))}
                                            disabled={pageP >= lastPageP}
                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed ${
                                                isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            Siguiente <ChevronRight size={15} />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}
