import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import { useTheme } from '../hooks/useTheme';
import {
    ScrollText, Search, Building2, RefreshCw, Ban, RotateCcw,
    History, AlertTriangle, Clock, CheckCircle, X, AlertCircle,
    FileText, Calendar, ChevronLeft, ChevronRight, Download
} from 'lucide-react';

const ESTADO_CFG = {
    vigente:    { label: 'Vigente',    cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400', icon: <CheckCircle size={11} /> },
    por_vencer: { label: 'Por vencer', cls: 'bg-amber-50 text-amber-700 animate-pulse dark:bg-amber-500/20 dark:text-amber-400', icon: <Clock size={11} /> },
    vencido:    { label: 'Vencido',    cls: 'bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-400',     icon: <AlertTriangle size={11} /> },
    suspendido: { label: 'Suspendido', cls: 'bg-gray-100 text-gray-500 dark:bg-gray-600/40 dark:text-gray-400', icon: <Ban size={11} /> },
};

export default function GestionContratos() {
    const { isDark } = useTheme();
    const [contratistas, setContratistas] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
    const [dependencias, setDependencias] = useState([]);
    const [filtros, setFiltros] = useState({ search: '', dependencia_id: '', estado_contrato: '' });
    const [loading, setLoading] = useState(false);

    // Modal renovar
    const [modalRenovar, setModalRenovar] = useState({ show: false, contratista: null });
    const [formRenovar, setFormRenovar] = useState({ tipo: 'prorroga', fecha_inicio_nueva: '', fecha_fin_nueva: '', numero_nuevo: '', valor_adicion: '', motivo: '' });
    const [loadingRenovar, setLoadingRenovar] = useState(false);
    const [errorRenovar, setErrorRenovar] = useState('');
    const [minutaRenovar, setMinutaRenovar] = useState(null);
    const [actaInicioRenovar, setActaInicioRenovar] = useState(null);

    // Modal suspender
    const [modalSuspender, setModalSuspender] = useState({ show: false, contratista: null });
    const [motivoSuspension, setMotivoSuspension] = useState('');
    const [loadingSuspender, setLoadingSuspender] = useState(false);
    const [errorSuspender, setErrorSuspender] = useState('');

    // Modal historial
    const [modalHistorial, setModalHistorial] = useState({ show: false, contratista: null });
    const [historial, setHistorial] = useState([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);

    const inputClass = `w-full rounded-xl px-4 py-2.5 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`;
    const labelClass = `block text-sm font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`;

    useEffect(() => {
        fetchContratistas();
    }, [pagination.current_page, filtros.dependencia_id, filtros.estado_contrato]);

    useEffect(() => {
        const t = setTimeout(() => fetchContratistas(), 350);
        return () => clearTimeout(t);
    }, [filtros.search]);

    useEffect(() => {
        api.get('/dependencias').then(r => setDependencias(r.data)).catch(() => {});
    }, []);

    const fetchContratistas = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', pagination.current_page);
            params.append('per_page', pagination.per_page);
            if (filtros.search) params.append('search', filtros.search);
            if (filtros.dependencia_id) params.append('dependencia_id', filtros.dependencia_id);
            if (filtros.estado_contrato) params.append('estado_contrato', filtros.estado_contrato);
            const res = await api.get(`/contratistas?${params}`);
            setContratistas(res.data.data);
            setPagination(p => ({ ...p, current_page: res.data.current_page, last_page: res.data.last_page, total: res.data.total }));
        } catch { }
        finally { setLoading(false); }
    };

    // ── Renovar ─────────────────────────────────────────────────────────
    const abrirRenovar = (c) => {
        setFormRenovar({ tipo: 'prorroga', fecha_inicio_nueva: c.fecha_fin ? String(c.fecha_fin).slice(0, 10) : '', fecha_fin_nueva: '', numero_nuevo: c.numero_contrato ?? '', valor_adicion: '', motivo: '' });
        setErrorRenovar('');
        setModalRenovar({ show: true, contratista: c });
    };
    const cerrarRenovar = () => {
        setModalRenovar({ show: false, contratista: null });
        setErrorRenovar('');
        setMinutaRenovar(null);
        setActaInicioRenovar(null);
    };
    const confirmarRenovar = async () => {
        if (!formRenovar.fecha_inicio_nueva || !formRenovar.fecha_fin_nueva || !formRenovar.motivo.trim()) {
            setErrorRenovar('Fecha inicio, fecha fin y motivo son obligatorios'); return;
        }
        setLoadingRenovar(true); setErrorRenovar('');
        try {
            const id = modalRenovar.contratista.id;
            const res = await api.patch(`/contratistas/${id}/renovar`, formRenovar);
            const renovacionId = res.data.renovacion?.id;
            if (minutaRenovar) {
                const fd = new FormData();
                fd.append('minuta_pdf', minutaRenovar);
                if (renovacionId) fd.append('renovacion_id', renovacionId);
                await api.post(`/contratistas/${id}/minuta`, fd, { headers: { 'Content-Type': undefined } });
            }
            if (actaInicioRenovar) {
                const fd = new FormData();
                fd.append('archivo', actaInicioRenovar);
                if (renovacionId) fd.append('renovacion_id', renovacionId);
                await api.post(`/contratistas/${id}/documentos/acta-inicio`, fd, { headers: { 'Content-Type': undefined } });
            }
            cerrarRenovar(); fetchContratistas();
        } catch (err) {
            const errs = err.response?.data?.errors;
            setErrorRenovar(errs ? Object.values(errs)[0]?.[0] : err.response?.data?.message || 'Error al renovar');
        } finally { setLoadingRenovar(false); }
    };

    // ── Suspender ────────────────────────────────────────────────────────
    const abrirSuspender = (c) => { setMotivoSuspension(''); setErrorSuspender(''); setModalSuspender({ show: true, contratista: c }); };
    const cerrarSuspender = () => { setModalSuspender({ show: false, contratista: null }); setErrorSuspender(''); };
    const confirmarSuspender = async () => {
        if (!motivoSuspension.trim()) { setErrorSuspender('El motivo es obligatorio'); return; }
        setLoadingSuspender(true); setErrorSuspender('');
        try {
            await api.patch(`/contratistas/${modalSuspender.contratista.id}/suspender`, { motivo: motivoSuspension });
            cerrarSuspender(); fetchContratistas();
        } catch (err) {
            setErrorSuspender(err.response?.data?.message || 'Error al suspender');
        } finally { setLoadingSuspender(false); }
    };

    // ── Reactivar ────────────────────────────────────────────────────────
    const handleReactivar = async (c) => {
        if (!confirm(`¿Reactivar el contrato de ${c.persona?.nombres} ${c.persona?.apellidos}?`)) return;
        try {
            await api.patch(`/contratistas/${c.id}/reactivar`);
            fetchContratistas();
        } catch (err) {
            alert(err.response?.data?.message || 'Error al reactivar');
        }
    };

    // ── Historial ────────────────────────────────────────────────────────
    const abrirHistorial = async (c) => {
        setHistorial([]); setLoadingHistorial(true);
        setModalHistorial({ show: true, contratista: c });
        try {
            const res = await api.get(`/contratistas/${c.id}/historial`);
            setHistorial(res.data);
        } catch { }
        finally { setLoadingHistorial(false); }
    };
    const cerrarHistorial = () => { setModalHistorial({ show: false, contratista: null }); setHistorial([]); };

    const diasRestantes = (c) => {
        if (!c.fecha_fin) return null;
        return Math.ceil((new Date(String(c.fecha_fin).substring(0, 10) + 'T12:00:00') - new Date()) / 86400000);
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <ScrollText size={24} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Gestión de Contratos</h2>
                    </div>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Supervisa el ciclo de vida de los contratos: renovaciones, suspensiones y vencimientos.
                    </p>
                </div>

                {/* Filtros */}
                <div className={`rounded-2xl p-4 ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Buscar contratista</label>
                            <div className="relative">
                                <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                <input type="text" value={filtros.search} onChange={e => setFiltros(p => ({ ...p, search: e.target.value }))}
                                    placeholder="Nombre o cédula..."
                                    className={`w-full pl-9 pr-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
                            </div>
                        </div>
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Dependencia</label>
                            <select value={filtros.dependencia_id} onChange={e => setFiltros(p => ({ ...p, dependencia_id: e.target.value }))}
                                className={`w-full rounded-xl px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                                <option value="">Todas</option>
                                {dependencias.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Estado del contrato</label>
                            <select value={filtros.estado_contrato} onChange={e => setFiltros(p => ({ ...p, estado_contrato: e.target.value }))}
                                className={`w-full rounded-xl px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                                <option value="">Todos</option>
                                <option value="vigente">Vigente</option>
                                <option value="por_vencer">Por vencer</option>
                                <option value="vencido">Vencido</option>
                                <option value="suspendido">Suspendido</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Tabla */}
                <div className={`rounded-2xl shadow-sm overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                    <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                        <div className="flex items-center gap-2">
                            <ScrollText size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Contratos</h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>{pagination.total}</span>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent" /></div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className={isDark ? 'bg-gray-900/50 border-b border-gray-700' : 'bg-gray-50 border-b border-gray-200'}>
                                        {['Contratista', 'N° Contrato', 'Dependencia', 'Vigencia', 'Estado', 'Acciones'].map(h => (
                                            <th key={h} className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {contratistas.map(c => {
                                        const dias   = diasRestantes(c);
                                        const estado = c.estado_contrato ?? 'vigente';
                                        const { label, cls, icon } = ESTADO_CFG[estado] ?? ESTADO_CFG.vigente;
                                        return (
                                            <tr key={c.id} className={`transition ${isDark ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50'}`}>
                                                <td className={`px-4 py-3 font-medium whitespace-nowrap ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                                    {c.persona?.nombres} {c.persona?.apellidos}
                                                    <p className={`text-xs font-normal ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{c.persona?.numero_identificacion}</p>
                                                </td>
                                                <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{c.numero_contrato || '—'}</td>
                                                <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{c.dependencia?.nombre || '—'}</td>
                                                <td className={`px-4 py-3 whitespace-nowrap text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    {c.fecha_inicio ? new Date(String(c.fecha_inicio).substring(0, 10) + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                    {' → '}
                                                    {c.fecha_fin ? new Date(String(c.fecha_fin).substring(0, 10) + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                    {dias !== null && dias >= 0 && dias <= 30 && (
                                                        <span className={`ml-2 font-medium ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>({dias}d)</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
                                                        {icon} {label}
                                                    </span>
                                                    {estado === 'suspendido' && c.motivo_suspension && (
                                                        <p className={`text-xs mt-0.5 max-w-[180px] truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`} title={c.motivo_suspension}>{c.motivo_suspension}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-1">
                                                        <button onClick={() => abrirRenovar(c)} title="Renovar contrato"
                                                            className={`p-1.5 rounded-lg transition ${isDark ? 'text-emerald-500 hover:bg-gray-700 hover:text-emerald-400' : 'text-emerald-600 hover:bg-gray-100'}`}>
                                                            <RefreshCw size={15} />
                                                        </button>
                                                        {estado === 'suspendido' ? (
                                                            <button onClick={() => handleReactivar(c)} title="Reactivar"
                                                                className={`p-1.5 rounded-lg transition ${isDark ? 'text-sky-500 hover:bg-gray-700 hover:text-sky-400' : 'text-sky-600 hover:bg-gray-100'}`}>
                                                                <RotateCcw size={15} />
                                                            </button>
                                                        ) : (
                                                            <button onClick={() => abrirSuspender(c)} title="Suspender contrato"
                                                                className={`p-1.5 rounded-lg transition ${isDark ? 'text-red-500 hover:bg-gray-700 hover:text-red-400' : 'text-red-500 hover:bg-gray-100'}`}>
                                                                <Ban size={15} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => abrirHistorial(c)} title="Ver historial"
                                                            className={`p-1.5 rounded-lg transition ${isDark ? 'text-gray-400 hover:bg-gray-700 hover:text-indigo-400' : 'text-gray-400 hover:bg-gray-100 hover:text-indigo-600'}`}>
                                                            <History size={15} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {contratistas.length === 0 && (
                                        <tr><td colSpan="6" className={`px-6 py-12 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                            <ScrollText size={40} className="mx-auto mb-3 opacity-30" />
                                            <p>No hay contratos que coincidan con los filtros</p>
                                        </td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {pagination.last_page > 1 && (
                        <div className={`px-6 py-4 border-t flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <button onClick={() => setPagination(p => ({ ...p, current_page: p.current_page - 1 }))} disabled={pagination.current_page === 1}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition disabled:opacity-50 ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                <ChevronLeft size={16} /> Anterior
                            </button>
                            <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Página {pagination.current_page} de {pagination.last_page}</span>
                            <button onClick={() => setPagination(p => ({ ...p, current_page: p.current_page + 1 }))} disabled={pagination.current_page === pagination.last_page}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition disabled:opacity-50 ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                                Siguiente <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Modales ──────────────────────────────────────────────────────── */}

            {/* Modal renovar */}
            {modalRenovar.show && modalRenovar.contratista && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={cerrarRenovar} />
                    <div className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <div className="flex items-center gap-2">
                                <RefreshCw size={18} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
                                <div>
                                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Renovar Contrato</h3>
                                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{modalRenovar.contratista.persona?.nombres} {modalRenovar.contratista.persona?.apellidos}</p>
                                </div>
                            </div>
                            <button onClick={cerrarRenovar} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {errorRenovar && <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}><AlertCircle size={15} /> {errorRenovar}</div>}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}><FileText size={14} />Tipo de renovación *</label>
                                    <select value={formRenovar.tipo} onChange={e => setFormRenovar(p => ({ ...p, tipo: e.target.value }))} className={inputClass}>
                                        <option value="prorroga">Prórroga</option>
                                        <option value="adicion">Adición de valor</option>
                                        <option value="nuevo_contrato">Nuevo contrato</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}><FileText size={14} />N° Contrato nuevo</label>
                                    <input type="text" value={formRenovar.numero_nuevo} onChange={e => setFormRenovar(p => ({ ...p, numero_nuevo: e.target.value }))} className={inputClass} placeholder="Número de contrato" />
                                </div>
                                <div>
                                    <label className={labelClass}><Calendar size={14} />Nueva fecha inicio *</label>
                                    <input type="date" value={formRenovar.fecha_inicio_nueva} onChange={e => setFormRenovar(p => ({ ...p, fecha_inicio_nueva: e.target.value }))} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}><Calendar size={14} />Nueva fecha fin *</label>
                                    <input type="date" value={formRenovar.fecha_fin_nueva} onChange={e => setFormRenovar(p => ({ ...p, fecha_fin_nueva: e.target.value }))} className={inputClass} min={formRenovar.fecha_inicio_nueva} />
                                </div>
                                {formRenovar.tipo === 'adicion' && (
                                    <div className="sm:col-span-2">
                                        <label className={labelClass}><FileText size={14} />Valor adición ($)</label>
                                        <input type="number" value={formRenovar.valor_adicion} onChange={e => setFormRenovar(p => ({ ...p, valor_adicion: e.target.value }))} className={inputClass} placeholder="0.00" min="0" />
                                    </div>
                                )}
                                <div className="sm:col-span-2">
                                    <label className={labelClass}><FileText size={14} />Motivo / Justificación *</label>
                                    <textarea value={formRenovar.motivo} onChange={e => setFormRenovar(p => ({ ...p, motivo: e.target.value }))} rows={3} className={`${inputClass} resize-none`} placeholder="Describa el motivo de la renovación..." />
                                </div>
                                {/* Documentos de renovación */}
                                <div className="sm:col-span-2">
                                    <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Documentos de renovación</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[
                                            { key: 'minuta', label: 'Nueva Minuta de Contrato', file: minutaRenovar, set: setMinutaRenovar, inputId: 'minuta-renov-gc' },
                                            { key: 'acta',   label: 'Acta de Inicio',           file: actaInicioRenovar, set: setActaInicioRenovar, inputId: 'acta-renov-gc' },
                                        ].map(({ label, file, set, inputId }) => (
                                            <div key={inputId}
                                                onClick={() => document.getElementById(inputId).click()}
                                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition ${file ? (isDark ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-emerald-400 bg-emerald-50') : (isDark ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400')}`}>
                                                <input id={inputId} type="file" accept=".pdf" className="hidden"
                                                    onChange={e => { const f = e.target.files[0]; if (f) set(f); e.target.value = ''; }} />
                                                <FileText size={16} className={file ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-gray-500' : 'text-gray-400')} />
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</p>
                                                    <p className={`text-xs truncate ${file ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-gray-600' : 'text-gray-400')}`}>
                                                        {file ? file.name : 'Haz clic para adjuntar PDF'}
                                                    </p>
                                                </div>
                                                {file && (
                                                    <button type="button" onClick={e => { e.stopPropagation(); set(null); }}
                                                        className={`p-1 rounded-lg flex-shrink-0 ${isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}>
                                                        <X size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <button onClick={cerrarRenovar} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Cancelar</button>
                            <button onClick={confirmarRenovar} disabled={loadingRenovar}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white transition disabled:opacity-50">
                                {loadingRenovar ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Guardando...</> : <><RefreshCw size={15} /> Confirmar Renovación</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal suspender */}
            {modalSuspender.show && modalSuspender.contratista && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={cerrarSuspender} />
                    <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <div className="flex items-center gap-2">
                                <Ban size={18} className={isDark ? 'text-red-400' : 'text-red-600'} />
                                <div>
                                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Suspender Contrato</h3>
                                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{modalSuspender.contratista.persona?.nombres} {modalSuspender.contratista.persona?.apellidos}</p>
                                </div>
                            </div>
                            <button onClick={cerrarSuspender} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className={`p-3 rounded-xl flex items-start gap-2 ${isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
                                <AlertTriangle size={16} className={`mt-0.5 flex-shrink-0 ${isDark ? 'text-amber-400' : 'text-amber-600'}`} />
                                <p className={`text-sm ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                                    El acceso al sistema del contratista será desactivado inmediatamente y recibirá una notificación por correo.
                                </p>
                            </div>
                            {errorSuspender && <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}><AlertCircle size={15} /> {errorSuspender}</div>}
                            <div>
                                <label className={labelClass}><FileText size={14} />Motivo de suspensión *</label>
                                <textarea value={motivoSuspension} onChange={e => setMotivoSuspension(e.target.value)} rows={4} className={`${inputClass} resize-none`} placeholder="Indique el motivo de la suspensión del contrato..." />
                            </div>
                        </div>
                        <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <button onClick={cerrarSuspender} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Cancelar</button>
                            <button onClick={confirmarSuspender} disabled={loadingSuspender}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white transition disabled:opacity-50">
                                {loadingSuspender ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Suspendiendo...</> : <><Ban size={15} /> Confirmar Suspensión</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal historial */}
            {modalHistorial.show && modalHistorial.contratista && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={cerrarHistorial} />
                    <div className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <div className="flex items-center gap-2">
                                <History size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                <div>
                                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Historial Contractual</h3>
                                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{modalHistorial.contratista.persona?.nombres} {modalHistorial.contratista.persona?.apellidos}</p>
                                </div>
                            </div>
                            <button onClick={cerrarHistorial} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}><X size={18} /></button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
                            {loadingHistorial ? (
                                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" /></div>
                            ) : historial.length === 0 ? (
                                <div className={`text-center py-10 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <History size={36} className="mx-auto mb-2 opacity-40" />
                                    <p className="text-sm">Sin renovaciones registradas</p>
                                </div>
                            ) : historial.map(r => {
                                const tipoLabel = { prorroga: 'Prórroga', adicion: 'Adición', nuevo_contrato: 'Nuevo contrato' }[r.tipo] ?? r.tipo;
                                const tipoColor = { prorroga: isDark ? 'text-sky-400 bg-sky-500/10' : 'text-sky-700 bg-sky-50', adicion: isDark ? 'text-amber-400 bg-amber-500/10' : 'text-amber-700 bg-amber-50', nuevo_contrato: isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-50' }[r.tipo] ?? '';
                                return (
                                    <div key={r.id} className={`rounded-xl border p-4 ${isDark ? 'bg-gray-700/40 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tipoColor}`}>{tipoLabel}</span>
                                            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{new Date(r.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
                                            {r.numero_anterior && <div><span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Contrato anterior: </span><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{r.numero_anterior}</span></div>}
                                            {r.numero_nuevo && <div><span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Contrato nuevo: </span><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{r.numero_nuevo}</span></div>}
                                            {r.fecha_fin_anterior && <div><span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Fin anterior: </span><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{new Date(String(r.fecha_fin_anterior).substring(0, 10) + 'T12:00:00').toLocaleDateString('es-CO')}</span></div>}
                                            <div><span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Nueva vigencia: </span><span className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>{new Date(String(r.fecha_inicio_nueva).substring(0, 10) + 'T12:00:00').toLocaleDateString('es-CO')} → {new Date(String(r.fecha_fin_nueva).substring(0, 10) + 'T12:00:00').toLocaleDateString('es-CO')}</span></div>
                                            {r.valor_adicion && <div><span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Valor adición: </span><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>${Number(r.valor_adicion).toLocaleString('es-CO')}</span></div>}
                                        </div>
                                        <p className={`text-xs mt-2 italic ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{r.motivo}</p>
                                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Por: {r.renovado_por?.name ?? '—'}</p>
                                        {(r.ruta_minuta || r.ruta_acta_inicio) && (
                                            <div className="flex gap-2 mt-2 flex-wrap">
                                                {r.ruta_minuta && (
                                                    <button onClick={async () => {
                                                        const res = await api.get(`/contratistas/${modalHistorial.contratista.id}/renovaciones/${r.id}/documentos/minuta`, { responseType: 'blob' });
                                                        const url = URL.createObjectURL(res.data);
                                                        window.open(url, '_blank');
                                                        setTimeout(() => URL.revokeObjectURL(url), 15000);
                                                    }} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg ${isDark ? 'bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>
                                                        <Download size={11} /> Minuta
                                                    </button>
                                                )}
                                                {r.ruta_acta_inicio && (
                                                    <button onClick={async () => {
                                                        const res = await api.get(`/contratistas/${modalHistorial.contratista.id}/renovaciones/${r.id}/documentos/acta-inicio`, { responseType: 'blob' });
                                                        const url = URL.createObjectURL(res.data);
                                                        window.open(url, '_blank');
                                                        setTimeout(() => URL.revokeObjectURL(url), 15000);
                                                    }} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg ${isDark ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                                                        <Download size={11} /> Acta de Inicio
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        <div className={`px-6 py-3 border-t flex justify-end ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <button onClick={cerrarHistorial} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}
