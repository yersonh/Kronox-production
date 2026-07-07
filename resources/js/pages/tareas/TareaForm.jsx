// resources/js/pages/tareas/TareaForm.jsx
import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import {
    ArrowLeft, User, Flag, Building2, FileText,
    Calendar, Clock, Link, Save, AlertCircle,
    CheckCircle, XCircle, Briefcase
} from 'lucide-react';
import SearchableSelect from '../../components/SearchableSelect';

export default function TareaForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isDark } = useTheme();
    const esEdicion = !!id;

    const [form, setForm] = useState({
        asunto: '',
        descripcion: '',
        fecha_hora: '',
        observaciones: '',
        link_adjunto: '',
        persona_id: '',
        prioridad_id: '',
        dependencia_id: '',
        sector_id: '',
        estado: 'pendiente',
    });
    const [dependencias, setDependencias] = useState([]);
    const [sectores, setSectores] = useState([]);
    const [sectoresFiltrados, setSectoresFiltrados] = useState([]);
    const [funcionarios, setFuncionarios] = useState([]);
    const [contratistas, setContratistas] = useState([]);
    const [responsablesFiltrados, setResponsablesFiltrados] = useState([]);
    const [prioridades, setPrioridades] = useState([]);
    const [fechaVencimiento, setFechaVencimiento] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { fetchDatos(); }, []);

    // Recalcula responsables al cambiar dependencia, sector, funcionarios o contratistas
    useEffect(() => {
        if (!form.dependencia_id) { setResponsablesFiltrados([]); return; }
        const funcs = funcionarios
            .filter(f => f.dependencia_id == form.dependencia_id && (!form.sector_id || f.sector_id == form.sector_id))
            .map(f => ({
                persona_id: f.persona_id,
                nombre: `${f.persona?.nombres ?? ''} ${f.persona?.apellidos ?? ''}`.trim(),
                tipo: 'funcionario',
            }));
        const conts = contratistas
            .filter(c => c.dependencia_id == form.dependencia_id && (!form.sector_id || c.sector_id == form.sector_id))
            .map(c => ({
                persona_id: c.persona_id,
                nombre: `${c.persona?.nombres ?? ''} ${c.persona?.apellidos ?? ''}`.trim(),
                tipo: 'contratista',
            }));
        setResponsablesFiltrados([...funcs, ...conts]);
    }, [form.dependencia_id, form.sector_id, funcionarios, contratistas]);

    const fetchDatos = async () => {
        try {
            const [deps, secs, funcs, cons, prios] = await Promise.all([
                api.get('/dependencias'),
                api.get('/sectores'),
                api.get('/funcionarios?per_page=500'),
                api.get('/contratistas?per_page=500'),
                api.get('/prioridades'),
            ]);
            setDependencias(deps.data.data ?? deps.data);
            const todosSectores = secs.data.data ?? secs.data;
            setSectores(todosSectores);
            setFuncionarios(funcs.data.data ?? funcs.data);
            setContratistas(cons.data.data ?? cons.data);
            setPrioridades(prios.data.data ?? prios.data);

            if (esEdicion) {
                const res = await api.get(`/tareas/${id}`);
                const t = res.data;
                setForm({
                    asunto: t.asunto,
                    descripcion: t.descripcion,
                    fecha_hora: t.fecha_hora?.slice(0, 16) ?? '',
                    observaciones: t.observaciones || '',
                    link_adjunto: t.link_adjunto || '',
                    persona_id: t.persona_id ? String(t.persona_id) : '',
                    prioridad_id: t.prioridad_id ? String(t.prioridad_id) : '',
                    dependencia_id: t.dependencia_id ? String(t.dependencia_id) : '',
                    sector_id: t.sector_id ? String(t.sector_id) : '',
                    estado: t.estado,
                });
                setFechaVencimiento(t.fecha_vencimiento || '');
                setSectoresFiltrados(todosSectores.filter(s => s.dependencia_id == t.dependencia_id));
            }
        } catch (err) {
            console.error('Error cargando datos:', err);
        }
    };

    const handleDependenciaChange = (dependencia_id) => {
        setForm(prev => ({ ...prev, dependencia_id, sector_id: '', persona_id: '' }));
        setSectoresFiltrados(sectores.filter(s => s.dependencia_id == dependencia_id));
    };

    const handlePrioridadChange = (prioridad_id) => {
        setForm(prev => ({ ...prev, prioridad_id }));
        const prioridad = prioridades.find(p => p.id == prioridad_id);
        if (prioridad && form.fecha_hora) {
            const fecha = new Date(form.fecha_hora);
            fecha.setDate(fecha.getDate() + prioridad.dias_vencimiento);
            setFechaVencimiento(fecha.toISOString().split('T')[0]);
        }
    };

    const handleFechaChange = (fecha_hora) => {
        setForm(prev => ({ ...prev, fecha_hora }));
        if (form.prioridad_id) {
            const prioridad = prioridades.find(p => p.id == form.prioridad_id);
            if (prioridad) {
                const fecha = new Date(fecha_hora);
                fecha.setDate(fecha.getDate() + prioridad.dias_vencimiento);
                setFechaVencimiento(fecha.toISOString().split('T')[0]);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (esEdicion) {
                await api.put(`/tareas/${id}`, form);
            } else {
                await api.post('/tareas', form);
            }
            navigate('/tareas');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    const getEstadoBadge = () => {
        if (!esEdicion) return null;
        const map = {
            pendiente: { bg: isDark ? 'bg-blue-500/20' : 'bg-blue-100', text: isDark ? 'text-blue-400' : 'text-blue-700', icon: <Clock size={12} />, label: 'Pendiente' },
            realizado: { bg: isDark ? 'bg-emerald-500/20' : 'bg-emerald-100', text: isDark ? 'text-emerald-400' : 'text-emerald-700', icon: <CheckCircle size={12} />, label: 'Realizado' },
            cancelado: { bg: isDark ? 'bg-red-500/20' : 'bg-red-100', text: isDark ? 'text-red-400' : 'text-red-700', icon: <XCircle size={12} />, label: 'Cancelado' },
        };
        const e = map[form.estado] ?? map.pendiente;
        return (
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${e.bg} ${e.text}`}>
                {e.icon} {e.label}
            </div>
        );
    };

    const inputCls = `w-full rounded-xl px-4 py-2.5 text-sm transition border focus:outline-none ${
        isDark
            ? 'bg-gray-900 border-gray-700 text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50'
            : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50'
    }`;

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/tareas')}
                            className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-gray-800 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'}`}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <CheckCircle size={24} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                    {esEdicion ? 'Editar Tarea' : 'Nueva Tarea'}
                                </h2>
                            </div>
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {esEdicion ? 'Modifica los detalles de la tarea' : 'Completa los datos para crear una nueva tarea'}
                            </p>
                        </div>
                    </div>
                    {esEdicion && getEstadoBadge()}
                </div>

                {error && (
                    <div className={`p-4 rounded-xl flex items-center gap-2 ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                        <AlertCircle size={18} />
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Columna principal */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Información básica */}
                        <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'}`}>
                            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                <div className="flex items-center gap-2">
                                    <FileText size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Información de la Tarea</h3>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Asunto *</label>
                                    <input type="text" value={form.asunto}
                                        onChange={e => setForm(p => ({ ...p, asunto: e.target.value }))}
                                        className={inputCls} placeholder="Título o asunto de la tarea" required />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Descripción *</label>
                                    <textarea value={form.descripcion}
                                        onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                                        rows={4} className={`${inputCls} resize-none`}
                                        placeholder="Descripción detallada de la tarea" required />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-sm font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            <Calendar size={14} /> Fecha y hora *
                                        </label>
                                        <input type="datetime-local" value={form.fecha_hora}
                                            onChange={e => handleFechaChange(e.target.value)}
                                            className={inputCls} required />
                                    </div>
                                    <div>
                                        <label className={`block text-sm font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            <Clock size={14} /> Fecha de vencimiento
                                        </label>
                                        <input type="date" value={fechaVencimiento} readOnly
                                            className={`w-full rounded-xl px-4 py-2.5 text-sm border cursor-not-allowed ${isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-500'}`} />
                                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                            Se calcula automáticamente según la prioridad
                                        </p>
                                    </div>
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Observaciones</label>
                                    <textarea value={form.observaciones}
                                        onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))}
                                        rows={2} className={`${inputCls} resize-none`} placeholder="Observaciones adicionales" />
                                </div>
                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        <Link size={14} /> Link adjunto
                                    </label>
                                    <input type="text" value={form.link_adjunto}
                                        onChange={e => setForm(p => ({ ...p, link_adjunto: e.target.value }))}
                                        className={inputCls} placeholder="https://..." />
                                </div>
                            </div>
                        </div>

                        {/* Asignación */}
                        <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'}`}>
                            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                <div className="flex items-center gap-2">
                                    <Building2 size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Asignación</h3>
                                </div>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-sm font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            <Building2 size={14} /> Dependencia *
                                        </label>
                                        <select value={form.dependencia_id}
                                            onChange={e => handleDependenciaChange(e.target.value)}
                                            className={inputCls} required>
                                            <option value="">Seleccionar dependencia</option>
                                            {dependencias.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={`block text-sm font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            <Briefcase size={14} /> Sector
                                        </label>
                                        <select value={form.sector_id}
                                            onChange={e => setForm(p => ({ ...p, sector_id: e.target.value, persona_id: '' }))}
                                            className={inputCls} disabled={!form.dependencia_id}>
                                            <option value="">Seleccionar sector</option>
                                            {sectoresFiltrados.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        <User size={14} /> Responsable *
                                    </label>
                                    <SearchableSelect
                                        value={form.persona_id}
                                        onChange={v => setForm(p => ({ ...p, persona_id: v }))}
                                        disabled={!form.dependencia_id}
                                        placeholder={
                                            !form.dependencia_id
                                                ? 'Selecciona una dependencia primero'
                                                : responsablesFiltrados.length === 0
                                                    ? 'Sin personas en esta dependencia/sector'
                                                    : 'Buscar responsable...'
                                        }
                                        options={responsablesFiltrados.map(r => ({
                                            value: r.persona_id,
                                            label: `${r.nombre} ${r.tipo === 'funcionario' ? '(Func.)' : '(Cont.)'}`,
                                        }))}
                                    />
                                </div>

                            </div>
                        </div>
                    </div>

                    {/* Columna lateral - Prioridad */}
                    <div className="space-y-6">
                        <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'}`}>
                            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                <div className="flex items-center gap-2">
                                    <Flag size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Prioridad *</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                {prioridades.length === 0 ? (
                                    <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Cargando prioridades...</p>
                                ) : (
                                    <div className="space-y-2">
                                        {prioridades.map(p => (
                                            <label key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                                                form.prioridad_id == p.id
                                                    ? isDark ? 'border-indigo-500 bg-indigo-500/10' : 'border-indigo-500 bg-indigo-50'
                                                    : isDark ? 'border-gray-700 hover:border-gray-600' : 'border-gray-100 hover:border-gray-200'
                                            }`}>
                                                <input type="radio" name="prioridad" value={p.id}
                                                    checked={form.prioridad_id == p.id}
                                                    onChange={() => handlePrioridadChange(p.id)}
                                                    className="hidden" />
                                                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: p.color }}></span>
                                                <div className="flex-1">
                                                    <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>{p.nombre}</p>
                                                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{p.dias_vencimiento} días para vencer</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <button type="submit" disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 rounded-xl text-sm font-semibold shadow-md transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100">
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    {esEdicion ? 'Actualizar Tarea' : 'Crear Tarea'}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
}
