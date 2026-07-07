// resources/js/components/EventoModal.jsx
import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import storage from '../api/storage';
import { useTheme } from '../hooks/useTheme';
import {
    MapPin, Video, FileText, X, Calendar, Users, Clock,
    Building2, Briefcase, User, CheckCircle, AlertCircle, Save,
    Upload, Download, Paperclip, Lock, Navigation, Plus, CalendarClock
} from 'lucide-react';
import ModalExito from './ModalExito';
import ModalAplazarEvento from './ModalAplazarEvento';
import MapaPicker from './MapaPicker';
import AlertaDistancia from './AlertaDistancia';
import SearchableSelect from './SearchableSelect';

export default function EventoModal({ fecha, evento, onClose, onGuardado }) {
    const { isDark } = useTheme();
    const esEdicion = !!evento;

    const user = JSON.parse(storage.get('user') || '{}');
    const puedeVerConcluciones = ['admin', 'digitador', 'super_admin'].includes(user?.rol);

    const [form, setForm] = useState({
        tema: '',
        fecha_hora: fecha ? `${fecha}T09:00` : '',
        fecha_hora_fin: fecha ? `${fecha}T10:00` : '',
        tipo_evento_id: '',
        sala_id: '',
        sitio: '',
        entidad: '',
        area: '',
        responsable_id: '',
        dependencias: [],
        sectores: [],
        descripcion: '',
        conclusiones: '',
        enlace_meet: '',
        es_publica: false,
        estado: 'programado',
        invitados: [],
        latitude: null,
        longitude: null,
        direccion: '',
    });
    const [dependencias, setDependencias] = useState([]);
    const [sectores, setSectores] = useState([]);
    const [salas, setSalas] = useState([]);
    const [tiposEvento, setTiposEvento] = useState([]);
    const [funcionarios, setFuncionarios] = useState([]);
    const [responsablesFiltrados, setResponsablesFiltrados] = useState([]);
    const [contratistas, setContratistas] = useState([]);
    const [personasFiltradas, setPersonasFiltradas] = useState([]);
    const [filtroTipoInvitado, setFiltroTipoInvitado] = useState('todos');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [tab, setTab] = useState('info');
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [docNombre, setDocNombre] = useState('');
    const [docFile, setDocFile] = useState(null);
    const [mostrarAplazar, setMostrarAplazar] = useState(false);
    const [mostrarExito, setMostrarExito] = useState(false);
    const [responsableNombre, setResponsableNombre] = useState('');
    const [historialUbicaciones, setHistorialUbicaciones] = useState([]);
    const [tipoCaptura, setTipoCaptura] = useState('manual');

    const esReadOnly = esEdicion && ['cerrado', 'cancelado', 'finalizado'].includes(form.estado);
    const soloConcluciones = false;
    const esEnCurso = esEdicion && form.estado === 'en_curso';

    // Sectores disponibles según dependencias seleccionadas
    const sectoresDeDependencias = sectores.filter(s =>
        form.dependencias.includes(Number(s.dependencia_id))
    );

    useEffect(() => { fetchDatos(); }, []);

    // Filtra responsables según dependencias y sectores seleccionados
    useEffect(() => {
        if (!form.dependencias.length) { setResponsablesFiltrados([]); return; }
        const funcs = funcionarios
            .filter(f =>
                form.dependencias.includes(Number(f.dependencia_id)) &&
                (form.sectores.length === 0 || form.sectores.includes(Number(f.sector_id)))
            )
            .map(f => ({ persona_id: f.persona_id, nombre: `${f.persona?.nombre ?? ''} ${f.persona?.apellido ?? ''}`.trim(), tipo: 'funcionario' }));
        const conts = contratistas
            .filter(c =>
                form.dependencias.includes(Number(c.dependencia_id)) &&
                (form.sectores.length === 0 || form.sectores.includes(Number(c.sector_id)))
            )
            .map(c => ({ persona_id: c.persona_id, nombre: `${c.persona?.nombre ?? ''} ${c.persona?.apellido ?? ''}`.trim(), tipo: 'contratista' }));
        setResponsablesFiltrados([...funcs, ...conts]);
    }, [form.dependencias, form.sectores, funcionarios, contratistas]);

    // Filtra personas disponibles para invitar (todas las dependencias seleccionadas)
    useEffect(() => {
        if (!form.dependencias.length) { setPersonasFiltradas([]); return; }
        const funcs = funcionarios
            .filter(f => form.dependencias.includes(Number(f.dependencia_id)))
            .map(f => ({
                persona_id: f.persona_id,
                nombre: `${f.persona?.nombre ?? ''} ${f.persona?.apellido ?? ''}`.trim(),
                email: f.persona?.email ?? '',
                tipo: 'funcionario',
                sector_id: f.sector_id,
            }));
        const conts = contratistas
            .filter(c => form.dependencias.includes(Number(c.dependencia_id)))
            .map(c => ({
                persona_id: c.persona_id,
                nombre: `${c.persona?.nombre ?? ''} ${c.persona?.apellido ?? ''}`.trim(),
                email: c.persona?.email ?? '',
                tipo: 'contratista',
                sector_id: c.sector_id,
            }));
        setPersonasFiltradas([...funcs, ...conts]);
    }, [form.dependencias, funcionarios, contratistas]);

    const fetchDatos = async () => {
        const [deps, secs, cons, funcs, sls, tipos] = await Promise.all([
            api.get('/dependencias'),
            api.get('/sectores'),
            api.get('/contratistas?per_page=500'),
            api.get('/funcionarios?per_page=500'),
            api.get('/salas'),
            api.get('/tipos-evento'),
        ]);
        setDependencias(deps.data);
        setSectores(secs.data);
        setFuncionarios(funcs.data.data ?? funcs.data);
        setContratistas(cons.data.data ?? cons.data);
        setSalas((sls.data.data ?? sls.data).filter(s => s.activo));
        setTiposEvento(tipos.data.data ?? tipos.data);

        if (esEdicion) {
            setForm({
                tema: evento.tema,
                fecha_hora: evento.fecha_hora?.slice(0, 16),
                fecha_hora_fin: evento.fecha_hora_fin?.slice(0, 16) || '',
                tipo_evento_id: evento.tipo_evento_id || '',
                sala_id: evento.sala_id || '',
                sitio: evento.sitio || '',
                entidad: evento.entidad || '',
                area: evento.area || '',
                responsable_id: evento.responsable_id ? String(evento.responsable_id) : '',
                dependencias: evento.dependencias?.map(d => d.id) || [],
                sectores: evento.sectores?.map(s => s.id) || [],
                descripcion: evento.descripcion || '',
                conclusiones: evento.conclusiones || '',
                enlace_meet: evento.enlace_meet || '',
                es_publica: evento.es_publica || false,
                estado: evento.estado,
                invitados: evento.invitados?.map(i => i.persona_id) || [],
                latitude: evento.latitude ? parseFloat(evento.latitude) : null,
                longitude: evento.longitude ? parseFloat(evento.longitude) : null,
                direccion: evento.direccion || '',
            });
            const r = evento.responsable;
            if (r) setResponsableNombre(`${r.nombre ?? ''} ${r.apellido ?? ''}`.trim());
            setDocNombre(evento.documento_soporte ? evento.documento_soporte.split('/').pop() : '');

            try {
                const histRes = await api.get(`/eventos/${evento.id}/ubicaciones`);
                setHistorialUbicaciones(histRes.data ?? []);
            } catch (e) {
                // Sin permisos para ver historial
            }
        }
    };

    const subirArchivoAhora = async (eventoId, endpoint, archivo, setSub, setNombre) => {
        if (!archivo) return;
        setSub(true);
        try {
            const fd = new FormData();
            fd.append('archivo', archivo);
            await api.post(`/eventos/${eventoId}/${endpoint}`, fd, { headers: { 'Content-Type': undefined } });
            setNombre(archivo.name);
        } catch {
            setError('Error al subir el archivo');
        } finally {
            setSub(false);
        }
    };

    const verArchivo = async (eventoId, endpoint) => {
        try {
            const res = await api.get(`/eventos/${eventoId}/${endpoint}`, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch {
            alert('No se pudo cargar el archivo');
        }
    };

    const seleccionarArchivo = (archivo, endpoint, setFile, setNombre) => {
        if (!archivo) return;
        setNombre(archivo.name);
        if (esEdicion) {
            subirArchivoAhora(evento.id, endpoint, archivo, setUploadingDoc, setNombre);
        } else {
            setFile(archivo);
        }
    };

    // Toggle individual de una dependencia
    const toggleDependencia = (id) => {
        const numId = Number(id);
        setForm(prev => {
            const nuevas = prev.dependencias.includes(numId)
                ? prev.dependencias.filter(d => d !== numId)
                : [...prev.dependencias, numId];
            return { ...prev, dependencias: nuevas, sectores: [], responsable_id: '', invitados: [] };
        });
        setFiltroTipoInvitado('todos');
    };

    // Toggle individual de un sector
    const toggleSector = (id) => {
        const numId = Number(id);
        setForm(prev => ({
            ...prev,
            sectores: prev.sectores.includes(numId)
                ? prev.sectores.filter(s => s !== numId)
                : [...prev.sectores, numId],
            responsable_id: '',
        }));
    };

    // Seleccionar todas las dependencias
    const seleccionarTodasDependencias = () => {
        setForm(prev => ({
            ...prev,
            dependencias: dependencias.map(d => d.id),
            sectores: [],
            responsable_id: '',
            invitados: [],
        }));
        setFiltroTipoInvitado('todos');
    };

    // Seleccionar todos los sectores de las dependencias activas
    const seleccionarTodosSectores = () => {
        setForm(prev => ({
            ...prev,
            sectores: sectoresDeDependencias.map(s => s.id),
        }));
    };

    const handleResponsableChange = (personaId) => {
        setForm(prev => ({ ...prev, responsable_id: personaId }));
    };

    const personasVisibles = personasFiltradas.filter(p =>
        filtroTipoInvitado === 'todos' || p.tipo === filtroTipoInvitado
    );

    const seleccionarTodos = () => {
        setForm(prev => ({ ...prev, invitados: personasVisibles.map(p => p.persona_id) }));
    };

    // Agrega las personas de los sectores seleccionados
    const seleccionarPorSectores = () => {
        if (!form.sectores.length) return;
        const delSectores = personasVisibles.filter(p => form.sectores.includes(Number(p.sector_id)));
        setForm(prev => ({
            ...prev,
            invitados: [...new Set([...prev.invitados, ...delSectores.map(p => p.persona_id)])],
        }));
    };

    const toggleInvitado = (id) => {
        setForm(prev => ({
            ...prev,
            invitados: prev.invitados.includes(id)
                ? prev.invitados.filter(i => i !== id)
                : [...prev.invitados, id],
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.dependencias.length) {
            setError('Selecciona al menos una dependencia');
            return;
        }
        if (!esEdicion && (!form.latitude || !form.longitude)) {
            setError('Debes seleccionar una ubicación en el mapa');
            setTab('ubicacion');
            return;
        }
        if (!esEdicion && form.invitados.length === 0) {
            setError('Agrega al menos un invitado al evento');
            return;
        }
        setLoading(true);
        setError('');
        try {
            if (esEdicion) {
                const payload = soloConcluciones
                    ? { conclusiones: form.conclusiones }
                    : { ...form, tipo_captura: tipoCaptura };
                await api.put(`/eventos/${evento.id}`, payload);
            } else {
                const res = await api.post('/eventos', form);
                const nuevoId = res.data.id;
                if (docFile) await subirArchivoAhora(nuevoId, 'documento-soporte', docFile, setUploadingDoc, setDocNombre);
                setMostrarExito(true);
                return;
            }
            onGuardado();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    const inputCls = `rounded-xl px-3 py-2.5 text-sm transition border focus:outline-none disabled:opacity-50 ${isDark
        ? 'bg-gray-900 border-gray-700 text-white focus:ring-2 focus:ring-indigo-500'
        : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-indigo-500'
        }`;

    const tabs = [
        { key: 'info',      label: 'Información', icon: <Calendar size={14} /> },
        { key: 'ubicacion', label: 'Ubicación',   icon: <MapPin size={14} /> },
        { key: 'invitados', label: `Invitados${form.invitados.length > 0 ? ` (${form.invitados.length})` : ''}`, icon: <Users size={14} /> },
    ];

    const scrollTo = (id) =>
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    const handleContinuarInfo = () => {
        if (!form.tema.trim())         { setError('Ingresa el título del evento');           scrollTo('field-tema');         return; }
        if (!form.fecha_hora)          { setError('Selecciona la fecha y hora de inicio');   scrollTo('field-fecha');        return; }
        if (!form.dependencias.length) { setError('Selecciona al menos una dependencia');    scrollTo('field-dependencias'); return; }
        if (!form.responsable_id)      { setError('Selecciona un responsable');              scrollTo('field-responsable');  return; }
        setError('');
        setTab('ubicacion');
    };

    const handleContinuarUbicacion = () => {
        if (!form.latitude || !form.longitude) { setError('Selecciona una ubicación en el mapa antes de continuar'); scrollTo('field-mapa'); return; }
        setError('');
        setTab('invitados');
    };

    const checkboxItemCls = (activo, colorActivo) => `flex items-center gap-2 px-2 py-1.5 rounded-lg transition cursor-pointer border ${activo
        ? colorActivo
        : isDark ? 'hover:bg-gray-800 border-transparent' : 'hover:bg-white border-transparent'
        }`;

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                    onClick={onClose}
                ></div>

                <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl shadow-2xl transition-all transform ${isDark
                    ? 'bg-gray-800 border border-gray-700'
                    : 'bg-white border border-gray-200'
                    }`}>
                    {/* Header */}
                    <div className={`px-6 py-4 flex items-center justify-between ${isDark
                        ? 'bg-gradient-to-r from-gray-900 to-gray-800 border-b border-gray-700'
                        : 'bg-gradient-to-r from-indigo-600 to-purple-600'
                        }`}>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${isDark ? 'bg-indigo-500/20' : 'bg-white/20'}`}>
                                {esReadOnly
                                    ? <Lock size={20} className="text-white" />
                                    : <Calendar size={20} className="text-white" />
                                }
                            </div>
                            <div>
                                <h2 className="text-white font-semibold text-base tracking-wide">
                                    {esReadOnly
                                        ? `Evento ${form.estado}`
                                        : esEdicion ? 'Editar evento' : 'Nuevo evento'}
                                </h2>
                                <p className="text-white/70 text-xs mt-0.5">
                                    {esReadOnly
                                        ? 'Este evento no puede editarse'
                                        : esEnCurso
                                            ? 'Evento en curso: finaliza para hacer cambios'
                                            : soloConcluciones
                                                ? 'Solo puedes editar las conclusiones'
                                                : esEdicion ? 'Modifica los detalles del evento' : 'Completa los datos para crear un nuevo evento'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/70 hover:text-white hover:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center transition"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className={`flex border-b px-6 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white'}`}>
                        {tabs.map(t => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition ${tab === t.key
                                    ? isDark ? 'border-indigo-500 text-indigo-400' : 'border-indigo-600 text-indigo-600'
                                    : isDark ? 'border-transparent text-gray-500 hover:text-gray-300' : 'border-transparent text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                {t.icon}
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                        <div className="px-6 py-5 space-y-5">
                            {error && (
                                <div className={`p-3 rounded-xl flex items-center gap-2 ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'
                                    }`}>
                                    <AlertCircle size={16} />
                                    <span className="text-sm">{error}</span>
                                </div>
                            )}

                            {tab === 'info' && (
                                <>
                                    {/* Título */}
                                    <div id="field-tema">
                                        <input
                                            type="text"
                                            value={form.tema}
                                            onChange={e => setForm({ ...form, tema: e.target.value })}
                                            placeholder="Título del evento"
                                            className={`w-full border-0 border-b-2 focus:border-indigo-500 outline-none text-xl font-semibold py-2 transition disabled:opacity-50 ${isDark
                                                ? 'bg-transparent border-gray-700 text-white placeholder-gray-500'
                                                : 'bg-transparent border-gray-200 text-gray-800 placeholder-gray-300'
                                                }`}
                                            required
                                            disabled={esReadOnly || soloConcluciones || esEnCurso}
                                        />
                                    </div>

                                    {/* Descripción */}
                                    <div className="flex items-start gap-3">
                                        <FileText size={18} className={`mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                        <textarea
                                            value={form.descripcion}
                                            onChange={e => setForm({ ...form, descripcion: e.target.value })}
                                            placeholder="Descripción del evento"
                                            rows={3}
                                            className={`flex-1 border-0 border-b focus:border-indigo-500 outline-none py-2 text-sm transition resize-none disabled:opacity-50 ${isDark
                                                ? 'bg-transparent border-gray-700 text-white placeholder-gray-500'
                                                : 'bg-transparent border-gray-200 text-gray-700 placeholder-gray-400'
                                                }`}
                                            disabled={esReadOnly || soloConcluciones || esEnCurso}
                                        />
                                    </div>

                                    {/* Fechas */}
                                    <div className="grid grid-cols-2 gap-4" id="field-fecha">
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                <Clock size={12} /> Fecha y hora inicio *
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={form.fecha_hora}
                                                onChange={e => setForm({ ...form, fecha_hora: e.target.value })}
                                                className={`w-full ${inputCls}`}
                                                required
                                                disabled={esReadOnly || soloConcluciones || esEnCurso || (esEdicion && ['programado', 'aplazado'].includes(form.estado))}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                <Clock size={12} /> Fecha y hora fin
                                            </label>
                                            <input
                                                type="datetime-local"
                                                value={form.fecha_hora_fin}
                                                onChange={e => setForm({ ...form, fecha_hora_fin: e.target.value })}
                                                className={`w-full ${inputCls}`}
                                                disabled={esReadOnly || soloConcluciones || esEnCurso || (esEdicion && ['programado', 'aplazado'].includes(form.estado))}
                                            />
                                        </div>
                                    </div>

                                    {/* Tipo de evento */}
                                    <div>
                                        <label className={`block text-xs font-medium mb-1.5 flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            <Calendar size={12} /> Tipo de evento
                                        </label>
                                        <select
                                            value={form.tipo_evento_id}
                                            onChange={e => setForm({ ...form, tipo_evento_id: e.target.value })}
                                            className={`w-full ${inputCls}`}
                                            disabled={esReadOnly || soloConcluciones || esEnCurso}
                                        >
                                            <option value="">Seleccionar tipo</option>
                                            {tiposEvento.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                        </select>
                                    </div>

                                    {/* Sala + Sitio + Meet */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <MapPin size={18} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                                            <select
                                                value={form.sala_id}
                                                onChange={e => setForm({ ...form, sala_id: e.target.value })}
                                                className={`flex-1 border-0 border-b focus:border-indigo-600 outline-none py-2 text-sm transition disabled:opacity-50 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-transparent border-gray-200 text-gray-700'}`}
                                                disabled={esReadOnly || soloConcluciones || esEnCurso}
                                            >
                                                <option value="">Seleccionar sala</option>
                                                {salas.map(s => <option key={s.id} value={s.id}>{s.nombre}{s.ubicacion ? ` — ${s.ubicacion}` : ''}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <MapPin size={18} className="opacity-0" />
                                            <input
                                                type="text"
                                                value={form.sitio}
                                                onChange={e => setForm({ ...form, sitio: e.target.value })}
                                                placeholder="Sitio / lugar externo"
                                                className={`flex-1 border-0 border-b focus:border-indigo-500 outline-none py-2 text-sm transition disabled:opacity-50 ${isDark ? 'bg-transparent border-gray-700 text-white placeholder-gray-500' : 'bg-transparent border-gray-200 text-gray-700 placeholder-gray-400'}`}
                                                disabled={esReadOnly || soloConcluciones || esEnCurso}
                                            />
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Video size={18} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                                            <input
                                                type="text"
                                                value={form.enlace_meet}
                                                onChange={e => setForm({ ...form, enlace_meet: e.target.value })}
                                                placeholder="Enlace de videollamada (Meet, Zoom, Teams)"
                                                className={`flex-1 border-0 border-b focus:border-indigo-500 outline-none py-2 text-sm transition disabled:opacity-50 ${isDark ? 'bg-transparent border-gray-700 text-white placeholder-gray-500' : 'bg-transparent border-gray-200 text-gray-700 placeholder-gray-400'}`}
                                                disabled={esReadOnly || soloConcluciones || esEnCurso}
                                            />
                                        </div>
                                    </div>

                                    {/* Dependencias (multi-select checkboxes) */}
                                    <div id="field-dependencias">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <label className={`text-xs font-medium flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                <Building2 size={12} /> Dependencias *
                                                {form.dependencias.length > 0 && (
                                                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-700'}`}>
                                                        {form.dependencias.length}
                                                    </span>
                                                )}
                                            </label>
                                            {!esReadOnly && !soloConcluciones && !esEnCurso && (
                                                <button type="button" onClick={seleccionarTodasDependencias}
                                                    className={`text-xs font-medium flex items-center gap-0.5 transition ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-500'}`}>
                                                    <Plus size={11} /> Todas
                                                </button>
                                            )}
                                        </div>
                                        <div className={`rounded-xl border p-1.5 max-h-36 overflow-y-auto space-y-0.5 ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                                            {dependencias.map(d => (
                                                <label key={d.id}
                                                    className={checkboxItemCls(
                                                        form.dependencias.includes(d.id),
                                                        isDark ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'
                                                    ) + (esReadOnly || soloConcluciones || esEnCurso ? ' opacity-70' : '')}>
                                                    <input
                                                        type="checkbox"
                                                        checked={form.dependencias.includes(d.id)}
                                                        onChange={() => toggleDependencia(d.id)}
                                                        disabled={esReadOnly || soloConcluciones || esEnCurso}
                                                        className="w-3.5 h-3.5 rounded accent-indigo-600 flex-shrink-0"
                                                    />
                                                    <span className={`text-sm truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{d.nombre}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Sectores (solo si hay dependencias seleccionadas y tienen sectores) */}
                                    {sectoresDeDependencias.length > 0 && (
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className={`text-xs font-medium flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    <Briefcase size={12} /> Sectores
                                                    {form.sectores.length > 0 && (
                                                        <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs font-semibold ${isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-700'}`}>
                                                            {form.sectores.length}
                                                        </span>
                                                    )}
                                                </label>
                                                {!esReadOnly && !soloConcluciones && !esEnCurso && (
                                                    <button type="button" onClick={seleccionarTodosSectores}
                                                        className={`text-xs font-medium flex items-center gap-0.5 transition ${isDark ? 'text-violet-400 hover:text-violet-300' : 'text-violet-600 hover:text-violet-500'}`}>
                                                        <Plus size={11} /> Todos
                                                    </button>
                                                )}
                                            </div>
                                            <div className={`rounded-xl border p-1.5 max-h-32 overflow-y-auto space-y-0.5 ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                                                {sectoresDeDependencias.map(s => (
                                                    <label key={s.id}
                                                        className={checkboxItemCls(
                                                            form.sectores.includes(s.id),
                                                            isDark ? 'bg-violet-500/10 border-violet-500/30' : 'bg-violet-50 border-violet-200'
                                                        ) + (esReadOnly || soloConcluciones || esEnCurso ? ' opacity-70' : '')}>
                                                        <input
                                                            type="checkbox"
                                                            checked={form.sectores.includes(s.id)}
                                                            onChange={() => toggleSector(s.id)}
                                                            disabled={esReadOnly || soloConcluciones || esEnCurso}
                                                            className="w-3.5 h-3.5 rounded accent-violet-600 flex-shrink-0"
                                                        />
                                                        <span className={`text-sm truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{s.nombre}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Responsable */}
                                    <div id="field-responsable">
                                        <label className={`block text-xs font-medium mb-1.5 flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            <User size={12} /> Responsable *
                                        </label>
                                        <SearchableSelect
                                            value={form.responsable_id}
                                            onChange={handleResponsableChange}
                                            disabled={!form.dependencias.length || esReadOnly || soloConcluciones}
                                            placeholder={
                                                !form.dependencias.length
                                                    ? 'Selecciona al menos una dependencia primero'
                                                    : responsablesFiltrados.length === 0
                                                        ? 'Sin personas en las dependencias/sectores seleccionados'
                                                        : 'Buscar responsable...'
                                            }
                                            options={[
                                                ...responsablesFiltrados.map(r => ({
                                                    value: r.persona_id,
                                                    label: `${r.nombre} ${r.tipo === 'funcionario' ? '(Func.)' : '(Cont.)'}`,
                                                })),
                                                ...(form.responsable_id && !responsablesFiltrados.some(r => String(r.persona_id) === String(form.responsable_id))
                                                    ? [{ value: form.responsable_id, label: `${responsableNombre || `ID ${form.responsable_id}`} (actual)` }]
                                                    : []),
                                            ]}
                                        />
                                    </div>

                                    {/* Entidad + Área */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                <Building2 size={12} /> Entidad
                                            </label>
                                            <input
                                                type="text"
                                                value={form.entidad}
                                                onChange={e => setForm({ ...form, entidad: e.target.value })}
                                                className={`w-full ${inputCls}`}
                                                disabled={esReadOnly || soloConcluciones || esEnCurso}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Área</label>
                                            <input
                                                type="text"
                                                value={form.area}
                                                onChange={e => setForm({ ...form, area: e.target.value })}
                                                className={`w-full ${inputCls}`}
                                                placeholder="Área del evento"
                                                disabled={esReadOnly || soloConcluciones || esEnCurso}
                                            />
                                        </div>
                                    </div>

                                    {/* Es pública */}
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id="modal_es_publica"
                                            checked={form.es_publica}
                                            onChange={e => setForm({ ...form, es_publica: e.target.checked })}
                                            className="w-4 h-4 rounded accent-indigo-600"
                                            disabled={esReadOnly || soloConcluciones || esEnCurso}
                                        />
                                        <label htmlFor="modal_es_publica" className={`text-sm font-medium cursor-pointer ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Evento público
                                        </label>
                                    </div>


                                    {/* Estado (solo edición, solo gestores) */}
                                    {esEdicion && puedeVerConcluciones && !soloConcluciones && !esEnCurso && !esReadOnly && (
                                        <div>
                                            <label className={`block text-xs font-medium mb-1.5 flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                <CheckCircle size={12} /> Estado
                                            </label>
                                            <select
                                                value={form.estado}
                                                onChange={e => setForm({ ...form, estado: e.target.value })}
                                                className={`w-full ${inputCls}`}
                                            >
                                                <option value="programado">Programado</option>
                                                <option value="cancelado">Cancelado</option>
                                            </select>
                                        </div>
                                    )}

                                    {/* Documento soporte */}
                                    <div className={`rounded-xl p-3 border ${isDark ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                        <p className={`text-xs font-medium mb-2 flex items-center gap-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            <Paperclip size={12} /> Documento soporte de convocatoria
                                        </p>
                                        {docNombre && (
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className={`text-xs truncate flex-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{docNombre}</span>
                                                {esEdicion && (
                                                    <button
                                                        type="button"
                                                        onClick={() => verArchivo(evento.id, 'documento-soporte')}
                                                        className={`flex items-center gap-1 text-xs font-medium flex-shrink-0 ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
                                                    >
                                                        <Download size={11} /> Ver
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                        {!esReadOnly && (
                                            <label className={`flex items-center justify-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium transition w-full ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
                                                {uploadingDoc
                                                    ? <><div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent" /> Subiendo...</>
                                                    : <><Upload size={11} /> {docNombre ? 'Reemplazar' : 'Seleccionar'}</>
                                                }
                                                <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" className="hidden"
                                                    onChange={e => seleccionarArchivo(e.target.files[0], 'documento-soporte', setDocFile, setDocNombre)} />
                                            </label>
                                        )}
                                    </div>
                                </>
                            )}

                            {tab === 'ubicacion' && (
                                <div className="space-y-5">
                                    <div>
                                        <label className={`block text-xs font-medium mb-3 flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            <MapPin size={14} /> Selecciona la ubicación del evento en el mapa
                                        </label>
                                        <div id="field-mapa" />
                                        <MapaPicker
                                            value={{
                                                lat: form.latitude || null,
                                                lng: form.longitude || null,
                                                direccion: form.direccion
                                            }}
                                            onChange={(coords) => setForm({
                                                ...form,
                                                latitude: coords.lat,
                                                longitude: coords.lng,
                                                direccion: coords.direccion
                                            })}
                                            readOnly={esReadOnly}
                                            historial={historialUbicaciones}
                                        />
                                    </div>

                                    {esEnCurso && (user.persona_id === form.responsable_id || ['admin', 'super_admin'].includes(user.rol)) && (
                                        <div className={`p-4 rounded-xl border-2 border-dashed ${isDark ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                                            <p className={`text-sm font-medium mb-3 flex items-center gap-2 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                                                <Navigation size={16} /> Confirmar ubicación
                                            </p>
                                            <p className={`text-xs mb-3 ${isDark ? 'text-blue-200/70' : 'text-blue-600/70'}`}>
                                                Si estás en el lugar del evento, puedes capturar tu ubicación actual con GPS.
                                            </p>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigator.geolocation.getCurrentPosition(
                                                        (position) => {
                                                            const { latitude, longitude } = position.coords;
                                                            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`)
                                                                .then(res => res.json())
                                                                .then(data => {
                                                                    const direccion = data.address?.road
                                                                        ? `${data.address.road}${data.address.house_number ? ' #' + data.address.house_number : ''}, ${data.address.city || data.address.county || ''}`
                                                                        : data.address?.hamlet || data.address?.village || data.address?.town || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                                                                    setForm({ ...form, latitude, longitude, direccion });
                                                                    setTipoCaptura('gps');
                                                                })
                                                                .catch(() => {
                                                                    setForm({ ...form, latitude, longitude, direccion: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` });
                                                                    setTipoCaptura('gps');
                                                                });
                                                        },
                                                        () => alert('No se pudo acceder a tu ubicación. Verifica los permisos del navegador.')
                                                    );
                                                }}
                                                className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
                                            >
                                                <Navigation size={16} /> Capturar GPS actual
                                            </button>
                                        </div>
                                    )}

                                    {esEnCurso && form.latitude && form.longitude && (user.persona_id === form.responsable_id || ['admin', 'super_admin'].includes(user.rol)) && (
                                        <AlertaDistancia
                                            eventoLat={parseFloat(form.latitude)}
                                            eventoLng={parseFloat(form.longitude)}
                                            umbralMetros={500}
                                        />
                                    )}
                                </div>
                            )}

                            {tab === 'invitados' && (
                                <div className="space-y-3">
                                    {!form.dependencias.length ? (
                                        <div className={`text-center py-12 rounded-xl ${isDark ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                                            <Users size={40} className={`mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                                            <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Selecciona al menos una dependencia primero</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Tabs tipo */}
                                            <div className={`flex gap-1 p-1 rounded-xl ${isDark ? 'bg-gray-900/60' : 'bg-gray-100'}`}>
                                                {[
                                                    { key: 'todos', label: 'Todos', count: personasFiltradas.length },
                                                    { key: 'funcionario', label: 'Funcionarios', count: personasFiltradas.filter(p => p.tipo === 'funcionario').length },
                                                    { key: 'contratista', label: 'Contratistas', count: personasFiltradas.filter(p => p.tipo === 'contratista').length },
                                                ].map(t => (
                                                    <button key={t.key} type="button"
                                                        onClick={() => setFiltroTipoInvitado(t.key)}
                                                        className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition ${filtroTipoInvitado === t.key
                                                            ? isDark ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-700 shadow-sm'
                                                            : isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'
                                                            }`}>
                                                        {t.label} <span className="opacity-60">({t.count})</span>
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Acciones masivas */}
                                            {!esReadOnly && !soloConcluciones && (
                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                    <div className="flex gap-2 flex-wrap">
                                                        {personasVisibles.length > 0 && (
                                                            <button type="button" onClick={seleccionarTodos}
                                                                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${isDark ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>
                                                                + Todos de dependencias
                                                            </button>
                                                        )}
                                                        {form.sectores.length > 0 && personasVisibles.some(p => form.sectores.includes(Number(p.sector_id))) && (
                                                            <button type="button" onClick={seleccionarPorSectores}
                                                                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition ${isDark ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30' : 'bg-violet-50 text-violet-700 hover:bg-violet-100'}`}>
                                                                + Por sectores seleccionados
                                                            </button>
                                                        )}
                                                    </div>
                                                    {form.invitados.length > 0 && (
                                                        <button type="button" onClick={() => setForm(prev => ({ ...prev, invitados: [] }))}
                                                            className={`text-xs font-medium transition ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-700'}`}>
                                                            Limpiar ({form.invitados.length})
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Lista */}
                                            {personasVisibles.length === 0 ? (
                                                <div className={`text-center py-6 rounded-xl ${isDark ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                                                    <Users size={28} className={`mx-auto mb-2 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                                                    <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Sin personas en las dependencias seleccionadas</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-1 max-h-64 overflow-y-auto">
                                                    {personasVisibles.map(p => (
                                                        <label key={p.persona_id}
                                                            className={`flex items-center gap-3 px-3 py-2 rounded-xl transition ${esReadOnly || soloConcluciones ? 'cursor-default' : 'cursor-pointer'
                                                                } ${form.invitados.includes(p.persona_id)
                                                                    ? isDark ? 'bg-indigo-500/10 border border-indigo-500/20' : 'bg-indigo-50 border border-indigo-200'
                                                                    : isDark ? 'hover:bg-gray-700/50 border border-transparent' : 'hover:bg-gray-50 border border-transparent'
                                                                }`}>
                                                            <input type="checkbox"
                                                                checked={form.invitados.includes(p.persona_id)}
                                                                onChange={() => toggleInvitado(p.persona_id)}
                                                                className="w-4 h-4 rounded accent-indigo-600 flex-shrink-0"
                                                                disabled={esReadOnly || soloConcluciones || esEnCurso}
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>{p.nombre}</p>
                                                                <p className={`text-xs truncate ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{p.email}</p>
                                                            </div>
                                                            <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${p.tipo === 'funcionario'
                                                                ? isDark ? 'bg-sky-500/20 text-sky-400' : 'bg-sky-50 text-sky-700'
                                                                : isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-700'
                                                                }`}>
                                                                {p.tipo === 'funcionario' ? 'Func.' : 'Cont.'}
                                                            </span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                        </div>

                        {/* Footer */}
                        <div className={`px-6 py-4 border-t flex items-center justify-between gap-3 ${isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-100 bg-gray-50'}`}>
                            {/* Izquierda: aplazar (edición) o botón Atrás (creación) */}
                            <div>
                                {esEdicion && ['programado', 'aplazado'].includes(form.estado) && (
                                    <button
                                        type="button"
                                        onClick={() => setMostrarAplazar(true)}
                                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition ${isDark
                                            ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/20'
                                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'}`}
                                    >
                                        <CalendarClock size={15} /> Aplazar
                                    </button>
                                )}
                                {!esEdicion && tab !== 'info' && (
                                    <button
                                        type="button"
                                        onClick={() => setTab(tab === 'invitados' ? 'ubicacion' : 'info')}
                                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                                    >
                                        ← Atrás
                                    </button>
                                )}
                            </div>

                            {/* Derecha: cancelar + acción principal */}
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className={`px-5 py-2 text-sm font-medium rounded-xl transition ${isDark ? 'text-gray-400 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                                >
                                    {esReadOnly ? 'Cerrar' : 'Cancelar'}
                                </button>

                                {/* Edición: guardar siempre visible */}
                                {esEdicion && !esReadOnly && (
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex items-center gap-2 px-5 py-2 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold disabled:opacity-50 transition"
                                    >
                                        {loading ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Guardando...</> : <><Save size={16} /> Guardar cambios</>}
                                    </button>
                                )}

                                {/* Creación: flujo secuencial */}
                                {!esEdicion && tab === 'info' && (
                                    <button
                                        type="button"
                                        onClick={handleContinuarInfo}
                                        className="flex items-center gap-2 px-5 py-2 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold transition"
                                    >
                                        Continuar →
                                    </button>
                                )}
                                {!esEdicion && tab === 'ubicacion' && (
                                    <button
                                        type="button"
                                        onClick={handleContinuarUbicacion}
                                        className="flex items-center gap-2 px-5 py-2 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold transition"
                                    >
                                        Continuar →
                                    </button>
                                )}
                                {!esEdicion && tab === 'invitados' && (
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex items-center gap-2 px-5 py-2 text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-semibold disabled:opacity-50 transition"
                                    >
                                        {loading ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Guardando...</> : <><Save size={16} /> Guardar evento</>}
                                    </button>
                                )}
                            </div>
                        </div>

                    </form>
                </div>
            </div>

            {mostrarExito && (
                <ModalExito
                    titulo="¡Evento creado!"
                    mensaje="El evento fue registrado correctamente en el sistema."
                    onClose={onGuardado}
                    onAccion={onGuardado}
                    textoAccion="Aceptar"
                />
            )}

            {mostrarAplazar && (
                <ModalAplazarEvento
                    evento={evento}
                    onClose={() => setMostrarAplazar(false)}
                    onAplazado={() => {
                        setMostrarAplazar(false);
                        onGuardado();
                    }}
                />
            )}
        </>
    );
}
