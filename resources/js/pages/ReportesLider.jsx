import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import storage from '../api/storage';
import { useTheme } from '../hooks/useTheme';
import { FileText, Plus, X, ChevronLeft, ChevronRight, CalendarDays, MapPin, User, RefreshCw, Building2, Clock } from 'lucide-react';

function inputClass(isDark) {
    return `w-full px-3 py-2 rounded-lg border text-sm transition focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
        isDark
            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
            : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
    }`;
}

export default function ReportesLider() {
    const { isDark } = useTheme();
    const [user, setUser] = useState(() => JSON.parse(storage.get('user') || '{}'));

    useEffect(() => {
        api.get('/me').then(res => setUser(res.data)).catch(() => {});
    }, []);

    const isLider      = user?.persona?.contratista?.es_lider === true;
    const rol          = user?.rol;
    const isSuperAdmin = rol === 'super_admin';
    const canView      = rol === 'contratista' || rol === 'funcionario' || isSuperAdmin;

    const [reportes, setReportes]     = useState([]);
    const [meta, setMeta]             = useState(null);
    const [page, setPage]             = useState(1);
    const [loading, setLoading]       = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError]           = useState('');
    const [success, setSuccess]       = useState('');
    const [showForm, setShowForm]     = useState(false);

    useEffect(() => {
        if (!success) return;
        const t = setTimeout(() => setSuccess(''), 3000);
        return () => clearTimeout(t);
    }, [success]);

    const hoy = new Date().toISOString().slice(0, 10);
    const [preset, setPreset]   = useState(null); // 'hoy' | '7dias' | 'mes' | null
    const [filtros, setFiltros] = useState(() => {
        const r = JSON.parse(storage.get('user') || '{}')?.rol;
        const esPersonal = r === 'contratista' || r === 'funcionario';
        return { fecha_inicio: esPersonal ? hoy : '', fecha_fin: esPersonal ? hoy : '' };
    });
    const [form, setForm]       = useState({ descripcion: '', fecha: new Date().toISOString().slice(0, 10), lugar: '' });
    const [formErrors, setFormErrors] = useState({});

    const fetchReportes = useCallback(async (p = 1) => {
        setLoading(true);
        setError('');
        try {
            const params = { page: p, per_page: 10 };
            if (filtros.fecha_inicio) params.fecha_inicio = filtros.fecha_inicio;
            if (filtros.fecha_fin)    params.fecha_fin    = filtros.fecha_fin;
            const res = await api.get('/reportes-lider', { params });
            setReportes(res.data.data ?? res.data);
            setMeta(res.data.meta ?? null);
            setPage(p);
        } catch (err) {
            setError(err.response?.data?.message ?? 'Error al cargar los reportes.');
        } finally {
            setLoading(false);
        }
    }, [filtros]);

    useEffect(() => {
        if (canView) fetchReportes(1);
    }, [fetchReportes, canView]);

    const handleFiltroChange = (e) => {
        setPreset(null);
        setFiltros(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setPage(1);
    };

    const applyPreset = (key) => {
        const hoyDate = new Date();
        const fmt = (d) => d.toISOString().slice(0, 10);
        let desde = '', hasta = hoy;
        if (key === 'hoy') {
            desde = hoy;
        } else if (key === '7dias') {
            const d = new Date(hoyDate);
            d.setDate(d.getDate() - 6);
            desde = fmt(d);
        } else if (key === 'mes') {
            const d = new Date(hoyDate.getFullYear(), hoyDate.getMonth(), 1);
            desde = fmt(d);
        }
        setPreset(key);
        setFiltros({ fecha_inicio: desde, fecha_fin: hasta });
        setPage(1);
    };

    const resetFiltros = () => {
        setPreset(null);
        setFiltros({ fecha_inicio: '', fecha_fin: '' });
        setPage(1);
    };

    const validateForm = () => {
        const errs = {};
        if (!form.descripcion.trim()) errs.descripcion = 'La descripción es requerida.';
        if (!form.fecha)              errs.fecha       = 'La fecha es requerida.';
        if (!form.lugar.trim())       errs.lugar       = 'El lugar es requerido.';
        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        setSubmitting(true);
        setError('');
        setSuccess('');
        try {
            await api.post('/reportes-lider', form);
            setSuccess('Reporte registrado. Se ha notificado a los miembros de la dependencia.');
            setForm({ descripcion: '', fecha: new Date().toISOString().slice(0, 10), lugar: '' });
            setFormErrors({});
            setShowForm(false);
            fetchReportes(1);
        } catch (err) {
            setError(err.response?.data?.message ?? 'Error al guardar el reporte.');
        } finally {
            setSubmitting(false);
        }
    };

    const cardBg  = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
    const textMain = isDark ? 'text-white' : 'text-gray-900';
    const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

    if (!canView) {
        return (
            <Layout>
                <div className="flex items-center justify-center min-h-64">
                    <p className={`text-sm ${textMuted}`}>No tiene acceso a esta sección.</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h1 className={`text-xl sm:text-2xl font-bold ${textMain}`}>Reportes de incidentes</h1>
                        <p className={`text-sm mt-1 ${textMuted}`}>
                            {isSuperAdmin
                                ? 'Visualización de todos los reportes de incidentes de todas las dependencias.'
                                : isLider
                                    ? 'Registre y consulte los reportes diarios de incidentes de su dependencia.'
                                    : 'Consulte los reportes diarios de incidentes de su dependencia.'}
                        </p>
                    </div>
                    {isLider && (
                        <button
                            onClick={() => { setShowForm(!showForm); setFormErrors({}); setError(''); setSuccess(''); }}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition shrink-0 whitespace-nowrap"
                        >
                            {showForm ? <X size={16} /> : <Plus size={16} />}
                            {showForm ? 'Cancelar' : 'Nuevo reporte'}
                        </button>
                    )}
                </div>

                {/* Alerts */}
                {error && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
                        <X size={16} className="mt-0.5 flex-shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
                {success && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
                        <span>{success}</span>
                    </div>
                )}

                {/* Formulario nuevo reporte */}
                {showForm && isLider && (
                    <div className={`rounded-2xl border p-6 shadow-sm ${cardBg}`}>
                        <h2 className={`text-base font-semibold mb-5 ${textMain}`}>Nuevo Reporte de Actividades</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Fecha <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        value={form.fecha}
                                        onChange={e => setForm(prev => ({ ...prev, fecha: e.target.value }))}
                                        className={inputClass(isDark)}
                                    />
                                    {formErrors.fecha && <p className="text-red-500 text-xs mt-1">{formErrors.fecha}</p>}
                                </div>
                                <div>
                                    <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Lugar <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={form.lugar}
                                        onChange={e => setForm(prev => ({ ...prev, lugar: e.target.value }))}
                                        placeholder="Ej: Oficina principal, Campo Norte..."
                                        className={inputClass(isDark)}
                                    />
                                    {formErrors.lugar && <p className="text-red-500 text-xs mt-1">{formErrors.lugar}</p>}
                                </div>
                            </div>
                            <div>
                                <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Descripción <span className="text-red-500">*</span></label>
                                <textarea
                                    rows={5}
                                    value={form.descripcion}
                                    onChange={e => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
                                    placeholder="Describa detalladamente las actividades realizadas..."
                                    className={`${inputClass(isDark)} resize-none`}
                                />
                                {formErrors.descripcion && <p className="text-red-500 text-xs mt-1">{formErrors.descripcion}</p>}
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowForm(false); setFormErrors({}); }}
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition disabled:opacity-50"
                                >
                                    {submitting && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
                                    {submitting ? 'Guardando...' : 'Guardar reporte'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Filtros */}
                <div className={`rounded-2xl border p-4 shadow-sm ${cardBg}`}>
                    {/* Accesos rápidos */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {[
                            { key: 'hoy',    label: 'Hoy' },
                            { key: '7dias',  label: 'Últimos 7 días' },
                            { key: 'mes',    label: 'Este mes' },
                        ].map(({ key, label }) => (
                            <button
                                key={key}
                                onClick={() => applyPreset(key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${
                                    preset === key
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : isDark
                                            ? 'border-gray-600 text-gray-300 hover:bg-gray-700'
                                            : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                                }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    {/* Rango manual */}
                    <div className="flex flex-wrap items-end gap-3">
                        <div>
                            <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Desde</label>
                            <input
                                type="date"
                                name="fecha_inicio"
                                value={filtros.fecha_inicio}
                                onChange={handleFiltroChange}
                                className={`${inputClass(isDark)} w-auto`}
                            />
                        </div>
                        <div>
                            <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Hasta</label>
                            <input
                                type="date"
                                name="fecha_fin"
                                value={filtros.fecha_fin}
                                onChange={handleFiltroChange}
                                className={`${inputClass(isDark)} w-auto`}
                            />
                        </div>
                        {(filtros.fecha_inicio || filtros.fecha_fin) && (
                            <button
                                onClick={resetFiltros}
                                className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition ${isDark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-100'}`}
                            >
                                <RefreshCw size={13} />
                                Limpiar
                            </button>
                        )}
                    </div>
                </div>

                {/* Lista de reportes */}
                {loading ? (
                    <div className="flex justify-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
                    </div>
                ) : reportes.length === 0 ? (
                    <div className={`flex flex-col items-center justify-center py-20 rounded-2xl border ${cardBg}`}>
                        <FileText size={40} className={`mb-3 ${textMuted}`} />
                        <p className={`text-sm font-medium ${textMain}`}>Sin reportes</p>
                        <p className={`text-xs mt-1 ${textMuted}`}>
                            {isLider ? 'Registre el primer reporte de actividades.' : 'No hay reportes registrados aún.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {reportes.map(r => {
                            const lider = r.contratista?.persona;
                            const parseFecha = (f) => {
                                if (!f) return '—';
                                const [y, m, d] = String(f).split('T')[0].split('-').map(Number);
                                return new Date(y, m - 1, d).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
                            };
                            const fecha = parseFecha(r.fecha);
                            return (
                                <div key={r.id} className={`rounded-2xl border p-5 shadow-sm ${cardBg}`}>
                                    <div className="flex items-start justify-between gap-4 flex-wrap">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-2 rounded-lg ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
                                                <FileText size={16} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`flex items-center gap-1 text-xs ${textMuted}`}>
                                                        <CalendarDays size={12} />
                                                        {fecha}
                                                    </span>
                                                    <span className={`flex items-center gap-1 text-xs ${textMuted}`}>
                                                        <Clock size={12} />
                                                        {new Date(r.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                    </span>
                                                    <span className={`flex items-center gap-1 text-xs ${textMuted}`}>
                                                        <MapPin size={12} />
                                                        {r.lugar}
                                                    </span>
                                                </div>
                                                {lider && (
                                                    <span className={`flex items-center gap-1 text-xs mt-0.5 ${textMuted}`}>
                                                        <User size={12} />
                                                        {lider.nombre} {lider.apellido}
                                                        <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-700'}`}>
                                                            Líder
                                                        </span>
                                                    </span>
                                                )}
                                                {isSuperAdmin && r.dependencia?.nombre && (
                                                    <span className={`flex items-center gap-1 text-xs mt-0.5 ${textMuted}`}>
                                                        <Building2 size={12} />
                                                        {r.dependencia.nombre}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <p className={`mt-3 text-sm leading-relaxed whitespace-pre-wrap ${textMain}`}>{r.descripcion}</p>
                                </div>
                            );
                        })}

                        {/* Paginación */}
                        {meta && meta.last_page > 1 && (
                            <div className="flex items-center justify-between pt-2">
                                <p className={`text-xs ${textMuted}`}>
                                    Página {meta.current_page} de {meta.last_page} — {meta.total} registros
                                </p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => fetchReportes(page - 1)}
                                        disabled={page <= 1}
                                        className={`p-2 rounded-lg border transition disabled:opacity-40 ${isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <ChevronLeft size={16} />
                                    </button>
                                    <button
                                        onClick={() => fetchReportes(page + 1)}
                                        disabled={page >= meta.last_page}
                                        className={`p-2 rounded-lg border transition disabled:opacity-40 ${isDark ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'}`}
                                    >
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}
