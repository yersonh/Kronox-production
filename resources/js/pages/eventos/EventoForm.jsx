// resources/js/pages/eventos/EventoForm.jsx
import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import storage from '../../api/storage';
import { useNavigate, useParams } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import {
    ArrowLeft, Save, Calendar, Clock, MapPin, Building2,
    User, Video, FileText, CheckCircle, Users, Plus,
    AlertCircle, Briefcase, Trash2,
    Upload, Download, Paperclip, Lock, CalendarClock
} from 'lucide-react';
import ModalExito from '../../components/ModalExito';
import ModalAplazarEvento from '../../components/ModalAplazarEvento';

export default function EventoForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const { isDark } = useTheme();
    const esEdicion = !!id;

    const user = JSON.parse(storage.get('user') || '{}');
    const puedeVerConcluciones = ['admin', 'digitador', 'super_admin'].includes(user?.rol);

    const [form, setForm] = useState({
        tema: '', fecha_hora: '', fecha_hora_fin: '',
        tipo_evento_id: '', sala_id: '', sitio: '',
        entidad: '', area: '', responsable_id: '',
        dependencias: [], sectores: [], descripcion: '', conclusiones: '',
        enlace_meet: '', es_publica: false, estado: 'programado', invitados: [],
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
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [uploadingActa, setUploadingActa] = useState(false);
    const [uploadingLista, setUploadingLista] = useState(false);
    const [docNombre, setDocNombre] = useState('');
    const [actaNombre, setActaNombre] = useState('');
    const [listaNombre, setListaNombre] = useState('');
    const [docFile, setDocFile] = useState(null);
    const [responsableNombre, setResponsableNombre] = useState('');
    const [mostrarExito, setMostrarExito] = useState(false);
    const [mostrarAplazar, setMostrarAplazar] = useState(false);

    const esReadOnly = esEdicion && ['cerrado', 'cancelado', 'finalizado'].includes(form.estado);
    const soloConcluciones = false;
    const esEnCurso = esEdicion && form.estado === 'en_curso';

    // Sectores disponibles según dependencias seleccionadas
    const sectoresDeDependencias = sectores.filter(s =>
        form.dependencias.includes(Number(s.dependencia_id))
    );

    useEffect(() => {
        fetchDependencias();
        fetchSectores();
        fetchSalas();
        fetchTiposEvento();
        fetchContratistas();
        fetchFuncionarios();
        if (esEdicion) fetchEvento();
    }, []);

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

    const fetchDependencias = async () => {
        const res = await api.get('/dependencias');
        setDependencias(res.data);
    };

    const fetchSectores = async () => {
        const res = await api.get('/sectores');
        setSectores(res.data);
    };

    const fetchSalas = async () => {
        const res = await api.get('/salas');
        setSalas((res.data.data ?? res.data).filter(s => s.activo));
    };

    const fetchTiposEvento = async () => {
        const res = await api.get('/tipos-evento');
        setTiposEvento(res.data.data ?? res.data);
    };

    const fetchFuncionarios = async () => {
        // invitables=1: solo personas con usuario activo (excluye contratos vencidos/suspendidos)
        const res = await api.get('/funcionarios?per_page=500&invitables=1');
        setFuncionarios(res.data.data ?? res.data);
    };

    const fetchContratistas = async () => {
        const res = await api.get('/contratistas?per_page=500&invitables=1');
        setContratistas(res.data.data ?? res.data);
    };

    const fetchEvento = async () => {
        const res = await api.get(`/eventos/${id}`);
        const e = res.data;
        setForm({
            tema: e.tema,
            fecha_hora: e.fecha_hora?.slice(0, 16),
            fecha_hora_fin: e.fecha_hora_fin?.slice(0, 16) || '',
            tipo_evento_id: e.tipo_evento_id || '',
            sala_id: e.sala_id || '',
            sitio: e.sitio || '',
            entidad: e.entidad || '',
            area: e.area || '',
            responsable_id: e.responsable_id ? String(e.responsable_id) : '',
            dependencias: e.dependencias?.map(d => d.id) || [],
            sectores: e.sectores?.map(s => s.id) || [],
            descripcion: e.descripcion || '',
            conclusiones: e.conclusiones || '',
            enlace_meet: e.enlace_meet || '',
            es_publica: e.es_publica || false,
            estado: e.estado,
            invitados: e.invitados?.map(i => i.persona_id) || [],
        });
        const r = e.responsable;
        if (r) setResponsableNombre(`${r.nombre ?? ''} ${r.apellido ?? ''}`.trim());
        setDocNombre(e.documento_soporte ? e.documento_soporte.split('/').pop() : '');
        setActaNombre(e.acta_reunion ? e.acta_reunion.split('/').pop() : '');
        setListaNombre(e.lista_asistencia ? e.lista_asistencia.split('/').pop() : '');
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
            subirArchivoAhora(id, endpoint, archivo, setUploadingDoc, setNombre);
        } else {
            setFile(archivo);
        }
    };

    // Toggle individual de una dependencia
    const toggleDependencia = (depId) => {
        const numId = Number(depId);
        setForm(prev => {
            const nuevas = prev.dependencias.includes(numId)
                ? prev.dependencias.filter(d => d !== numId)
                : [...prev.dependencias, numId];
            return { ...prev, dependencias: nuevas, sectores: [], responsable_id: '', invitados: [] };
        });
        setFiltroTipoInvitado('todos');
    };

    // Toggle individual de un sector
    const toggleSector = (secId) => {
        const numId = Number(secId);
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

    const toggleInvitado = (personaId) => {
        setForm(prev => ({
            ...prev,
            invitados: prev.invitados.includes(personaId)
                ? prev.invitados.filter(i => i !== personaId)
                : [...prev.invitados, personaId],
        }));
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

    const limpiarInvitados = () => {
        setForm(prev => ({ ...prev, invitados: [] }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.dependencias.length) {
            setError('Selecciona al menos una dependencia');
            return;
        }
        setLoading(true);
        setError('');
        try {
            if (esEdicion) {
                const payload = soloConcluciones
                    ? { conclusiones: form.conclusiones }
                    : form;
                await api.put(`/eventos/${id}`, payload);
            } else {
                const res = await api.post('/eventos', form);
                const nuevoId = res.data.id;
                if (docFile) await subirArchivoAhora(nuevoId, 'documento-soporte', docFile, setUploadingDoc, setDocNombre);
                setMostrarExito(true);
                return;
            }
            navigate('/eventos');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelar = async () => {
        if (!confirm('¿Cancelar este evento? No podrá ser editado después.')) return;
        try {
            await api.delete(`/eventos/${id}`);
            navigate('/eventos');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al cancelar');
        }
    };

    const inputCls = (extra = '') =>
        `w-full rounded-xl px-4 py-2.5 text-sm transition border focus:outline-none ${isDark
            ? 'bg-gray-900 border-gray-700 text-white focus:ring-2 focus:ring-indigo-500 disabled:opacity-50'
            : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50'
        } ${extra}`;

    const checkboxItemCls = (activo, colorActivo) =>
        `flex items-center gap-2 px-3 py-2 rounded-xl transition cursor-pointer border ${activo
            ? colorActivo
            : isDark ? 'hover:bg-gray-700/50 border-transparent' : 'hover:bg-gray-100 border-transparent'
        }`;

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => navigate('/eventos')}
                            className={`p-2 rounded-lg transition ${isDark
                                ? 'hover:bg-gray-800 text-gray-400 hover:text-white'
                                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Calendar size={24} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                    {esEdicion ? 'Editar Evento' : 'Nuevo Evento'}
                                </h2>
                            </div>
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                {esEdicion ? 'Modifica los detalles del evento' : 'Completa los datos para crear un nuevo evento'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Banner solo lectura */}
                {esReadOnly && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 ${isDark ? 'bg-gray-700/60 border border-gray-600 text-gray-300' : 'bg-gray-100 border border-gray-200 text-gray-600'
                        }`}>
                        <Lock size={18} className="flex-shrink-0" />
                        <span className="text-sm">
                            Este evento está <strong>{form.estado}</strong> y no puede editarse.
                        </span>
                    </div>
                )}

                {/* Banner solo conclusiones */}
                {soloConcluciones && puedeVerConcluciones && (
                    <div className={`p-4 rounded-xl flex items-center gap-3 ${isDark ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                        }`}>
                        <CheckCircle size={18} className="flex-shrink-0" />
                        <span className="text-sm">
                            El evento está finalizado. Solo puedes editar las <strong>conclusiones</strong> y subir documentos del acta.
                        </span>
                    </div>
                )}

                {/* Documentos para evento finalizado */}
                {soloConcluciones && (
                    <div className={`rounded-2xl p-5 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} shadow-sm`}>
                        <p className={`text-sm font-semibold mb-4 flex items-center gap-2 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                            <Paperclip size={15} /> Documentos del evento
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { label: 'Acta de reunión', nombre: actaNombre, setNombre: setActaNombre, uploading: uploadingActa, setUploading: setUploadingActa, endpoint: 'acta-reunion', accept: '.pdf,.doc,.docx' },
                                { label: 'Lista de asistencia externa', nombre: listaNombre, setNombre: setListaNombre, uploading: uploadingLista, setUploading: setUploadingLista, endpoint: 'lista-asistencia', accept: '.pdf', hint: 'Para entidades externas no registradas' },
                            ].map(f => (
                                <div key={f.endpoint} className={`rounded-xl p-4 border ${isDark ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                    <p className={`text-xs font-medium mb-2 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        <Paperclip size={12} /> {f.label}
                                    </p>
                                    {f.hint && <p className={`text-xs mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{f.hint}</p>}
                                    {f.nombre && (
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-xs truncate flex-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{f.nombre}</span>
                                            <button
                                                type="button"
                                                onClick={() => verArchivo(id, f.endpoint)}
                                                className={`flex items-center gap-1 text-xs font-medium flex-shrink-0 ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
                                            >
                                                <Download size={11} /> Ver
                                            </button>
                                        </div>
                                    )}
                                    <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg text-xs font-medium transition w-full justify-center ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
                                        {f.uploading
                                            ? <><div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent" /> Subiendo...</>
                                            : <><Upload size={12} /> {f.nombre ? 'Reemplazar' : 'Seleccionar archivo'}</>
                                        }
                                        <input type="file" accept={f.accept} className="hidden"
                                            onChange={e => {
                                                const archivo = e.target.files[0];
                                                if (!archivo) return;
                                                f.setNombre(archivo.name);
                                                subirArchivoAhora(id, f.endpoint, archivo, f.setUploading, f.setNombre);
                                            }} />
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {error && (
                    <div className={`p-4 rounded-xl flex items-center gap-2 ${isDark
                        ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                        : 'bg-red-50 border border-red-200 text-red-700'
                        }`}>
                        <AlertCircle size={18} />
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Columna izquierda - Información principal */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className={`rounded-2xl shadow-lg overflow-hidden transition ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'
                            }`}>
                            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                <div className="flex items-center gap-2">
                                    <Calendar size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                        Información del Evento
                                    </h3>
                                </div>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Tema */}
                                    <div className="md:col-span-2">
                                        <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Tema del evento *
                                        </label>
                                        <input
                                            type="text"
                                            value={form.tema}
                                            onChange={e => setForm({ ...form, tema: e.target.value })}
                                            className={inputCls()}
                                            placeholder="Ingrese el tema del evento"
                                            required
                                            disabled={esReadOnly || soloConcluciones || esEnCurso}
                                        />
                                    </div>

                                    {/* Descripción */}
                                    <div className="md:col-span-2">
                                        <label className={`block text-sm font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            <FileText size={14} /> Descripción
                                        </label>
                                        <textarea
                                            value={form.descripcion}
                                            onChange={e => setForm({ ...form, descripcion: e.target.value })}
                                            rows={3}
                                            className={inputCls()}
                                            placeholder="Observaciones adicionales sobre el evento..."
                                            disabled={esReadOnly || soloConcluciones || esEnCurso}
                                        />
                                    </div>

                                    {/* Fecha inicio */}
                                    <div>
                                        <label className={`block text-sm font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            <Clock size={14} /> Fecha y hora inicio *
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={form.fecha_hora}
                                            onChange={e => setForm({ ...form, fecha_hora: e.target.value })}
                                            className={inputCls()}
                                            required
                                            disabled={esReadOnly || soloConcluciones || esEnCurso || (esEdicion && ['programado', 'aplazado'].includes(form.estado))}
                                        />
                                    </div>

                                    {/* Fecha fin */}
                                    <div>
                                        <label className={`block text-sm font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            <Clock size={14} /> Fecha y hora fin
                                        </label>
                                        <input
                                            type="datetime-local"
                                            value={form.fecha_hora_fin}
                                            onChange={e => setForm({ ...form, fecha_hora_fin: e.target.value })}
                                            className={inputCls()}
                                            disabled={esReadOnly || soloConcluciones || esEnCurso || (esEdicion && ['programado', 'aplazado'].includes(form.estado))}
                                        />
                                    </div>

                                    {/* Tipo de evento */}
                                    <div>
                                        <label className={`block text-sm font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            <Calendar size={14} /> Tipo de evento
                                        </label>
                                        <select
                                            value={form.tipo_evento_id}
                                            onChange={e => setForm({ ...form, tipo_evento_id: e.target.value })}
                                            className={inputCls()}
                                            disabled={esReadOnly || soloConcluciones || esEnCurso}
                                        >
                                            <option value="">Seleccionar tipo</option>
                                            {tiposEvento.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                                        </select>
                                    </div>

                                    {/* Sala */}
                                    <div>
                                        <label className={`block text-sm font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            <MapPin size={14} /> Sala
                                        </label>
                                        <select
                                            value={form.sala_id}
                                            onChange={e => setForm({ ...form, sala_id: e.target.value })}
                                            className={inputCls()}
                                            disabled={esReadOnly || soloConcluciones || esEnCurso}
                                        >
                                            <option value="">Seleccionar sala</option>
                                            {salas.map(s => <option key={s.id} value={s.id}>{s.nombre}{s.ubicacion ? ` — ${s.ubicacion}` : ''}</option>)}
                                        </select>
                                    </div>

                                    {/* Sitio externo */}
                                    <div>
                                        <label className={`block text-sm font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            <MapPin size={14} /> Sitio / Lugar externo
                                        </label>
                                        <input
                                            type="text"
                                            value={form.sitio}
                                            onChange={e => setForm({ ...form, sitio: e.target.value })}
                                            className={inputCls()}
                                            placeholder="Dirección o lugar externo"
                                            disabled={esReadOnly || soloConcluciones || esEnCurso}
                                        />
                                    </div>

                                    {/* Dependencias (multi-select checkboxes) */}
                                    <div className="md:col-span-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className={`block text-sm font-medium flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                <Building2 size={14} /> Dependencias *
                                                {form.dependencias.length > 0 && (
                                                    <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-700'}`}>
                                                        {form.dependencias.length} seleccionada{form.dependencias.length !== 1 ? 's' : ''}
                                                    </span>
                                                )}
                                            </label>
                                            {!esReadOnly && !soloConcluciones && !esEnCurso && (
                                                <button type="button" onClick={seleccionarTodasDependencias}
                                                    className={`text-xs font-medium flex items-center gap-1 transition ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-500'}`}>
                                                    <Plus size={11} /> Seleccionar todas
                                                </button>
                                            )}
                                        </div>
                                        <div className={`rounded-xl border p-2 max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-0.5 ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                                            {dependencias.map(d => (
                                                <label key={d.id}
                                                    className={checkboxItemCls(
                                                        form.dependencias.includes(d.id),
                                                        isDark ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200'
                                                    ) + (esReadOnly || soloConcluciones || esEnCurso ? ' opacity-70 !cursor-default' : '')}>
                                                    <input
                                                        type="checkbox"
                                                        checked={form.dependencias.includes(d.id)}
                                                        onChange={() => toggleDependencia(d.id)}
                                                        disabled={esReadOnly || soloConcluciones || esEnCurso}
                                                        className="w-4 h-4 rounded accent-indigo-600 flex-shrink-0"
                                                    />
                                                    <span className={`text-sm truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{d.nombre}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Sectores (solo si hay dependencias seleccionadas con sectores) */}
                                    {sectoresDeDependencias.length > 0 && (
                                        <div className="md:col-span-2">
                                            <div className="flex items-center justify-between mb-2">
                                                <label className={`block text-sm font-medium flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    <Briefcase size={14} /> Sectores
                                                    {form.sectores.length > 0 && (
                                                        <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-semibold ${isDark ? 'bg-violet-500/20 text-violet-400' : 'bg-violet-100 text-violet-700'}`}>
                                                            {form.sectores.length} seleccionado{form.sectores.length !== 1 ? 's' : ''}
                                                        </span>
                                                    )}
                                                </label>
                                                {!esReadOnly && !soloConcluciones && !esEnCurso && (
                                                    <button type="button" onClick={seleccionarTodosSectores}
                                                        className={`text-xs font-medium flex items-center gap-1 transition ${isDark ? 'text-violet-400 hover:text-violet-300' : 'text-violet-600 hover:text-violet-500'}`}>
                                                        <Plus size={11} /> Seleccionar todos
                                                    </button>
                                                )}
                                            </div>
                                            <div className={`rounded-xl border p-2 max-h-36 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-0.5 ${isDark ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-gray-50'}`}>
                                                {sectoresDeDependencias.map(s => (
                                                    <label key={s.id}
                                                        className={checkboxItemCls(
                                                            form.sectores.includes(s.id),
                                                            isDark ? 'bg-violet-500/10 border-violet-500/30' : 'bg-violet-50 border-violet-200'
                                                        ) + (esReadOnly || soloConcluciones || esEnCurso ? ' opacity-70 !cursor-default' : '')}>
                                                        <input
                                                            type="checkbox"
                                                            checked={form.sectores.includes(s.id)}
                                                            onChange={() => toggleSector(s.id)}
                                                            disabled={esReadOnly || soloConcluciones || esEnCurso}
                                                            className="w-4 h-4 rounded accent-violet-600 flex-shrink-0"
                                                        />
                                                        <span className={`text-sm truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{s.nombre}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Responsable */}
                                    <div>
                                        <label className={`block text-sm font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            <User size={14} /> Responsable *
                                        </label>
                                        <select
                                            value={form.responsable_id}
                                            onChange={e => handleResponsableChange(e.target.value)}
                                            disabled={!form.dependencias.length || esReadOnly || soloConcluciones}
                                            required
                                            className={inputCls()}
                                        >
                                            <option value="">
                                                {!form.dependencias.length
                                                    ? 'Selecciona al menos una dependencia primero'
                                                    : responsablesFiltrados.length === 0
                                                        ? 'Sin personas en las dependencias/sectores seleccionados'
                                                        : 'Seleccionar responsable'}
                                            </option>
                                            {responsablesFiltrados.map(r => (
                                                <option key={r.persona_id} value={r.persona_id}>
                                                    {r.nombre} {r.tipo === 'funcionario' ? '(Func.)' : '(Cont.)'}
                                                </option>
                                            ))}
                                            {form.responsable_id && !responsablesFiltrados.some(r => String(r.persona_id) === String(form.responsable_id)) && (
                                                <option value={form.responsable_id}>{responsableNombre || `ID ${form.responsable_id}`} (actual)</option>
                                            )}
                                        </select>
                                    </div>

                                    {/* Entidad */}
                                    <div>
                                        <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Entidad</label>
                                        <input
                                            type="text"
                                            value={form.entidad}
                                            onChange={e => setForm({ ...form, entidad: e.target.value })}
                                            className={inputCls()}
                                            placeholder="Nombre de la entidad"
                                            disabled={esReadOnly || soloConcluciones || esEnCurso}
                                        />
                                    </div>

                                    {/* Área */}
                                    <div>
                                        <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Área</label>
                                        <input
                                            type="text"
                                            value={form.area}
                                            onChange={e => setForm({ ...form, area: e.target.value })}
                                            className={inputCls()}
                                            placeholder="Área del evento"
                                            disabled={esReadOnly || soloConcluciones || esEnCurso}
                                        />
                                    </div>

                                    {/* Enlace Meet */}
                                    <div>
                                        <label className={`block text-sm font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            <Video size={14} /> Enlace Meet / Videollamada
                                        </label>
                                        <input
                                            type="text"
                                            value={form.enlace_meet}
                                            onChange={e => setForm({ ...form, enlace_meet: e.target.value })}
                                            className={inputCls()}
                                            placeholder="https://meet.google.com/..."
                                            disabled={esReadOnly || soloConcluciones || esEnCurso}
                                        />
                                    </div>

                                    {/* Es pública */}
                                    <div className="flex items-center gap-3 pt-2">
                                        <input
                                            type="checkbox"
                                            id="es_publica"
                                            checked={form.es_publica}
                                            onChange={e => setForm({ ...form, es_publica: e.target.checked })}
                                            className="w-4 h-4 rounded accent-indigo-600"
                                            disabled={esReadOnly || soloConcluciones || esEnCurso}
                                        />
                                        <label htmlFor="es_publica" className={`text-sm font-medium cursor-pointer ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                            Evento público
                                        </label>
                                    </div>

                                    {/* Estado */}
                                    {esEdicion && puedeVerConcluciones && !soloConcluciones && !esEnCurso && !esReadOnly && (
                                        <div>
                                            <label className={`block text-sm font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                <CheckCircle size={14} /> Estado
                                            </label>
                                            <select
                                                value={form.estado}
                                                onChange={e => setForm({ ...form, estado: e.target.value })}
                                                className={inputCls()}
                                            >
                                                <option value="programado">⏳ Programado</option>
                                                <option value="cancelado">✗ Cancelado</option>
                                            </select>
                                        </div>
                                    )}


                                    {/* Conclusiones */}
                                    {esEdicion && puedeVerConcluciones && (
                                        <div className="md:col-span-2">
                                            <label className={`block text-sm font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                <FileText size={14} /> Conclusiones
                                            </label>
                                            <textarea
                                                value={form.conclusiones}
                                                onChange={e => setForm({ ...form, conclusiones: e.target.value })}
                                                rows={3}
                                                className={inputCls()}
                                                placeholder="Conclusiones después de realizado el evento..."
                                                disabled={esReadOnly}
                                            />
                                        </div>
                                    )}

                                    {/* Documento soporte */}
                                    <div className="md:col-span-2">
                                        <div className={`rounded-xl p-4 border ${isDark ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                            <p className={`text-sm font-medium mb-3 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                <Paperclip size={14} /> Documento soporte de convocatoria
                                            </p>
                                            {docNombre && (
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`text-xs truncate flex-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{docNombre}</span>
                                                    {esEdicion && (
                                                        <button
                                                            type="button"
                                                            onClick={() => verArchivo(id, 'documento-soporte')}
                                                            className={`flex items-center gap-1 text-xs font-medium transition flex-shrink-0 ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
                                                        >
                                                            <Download size={12} /> Ver
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            {!esReadOnly && (
                                                <label className={`flex items-center gap-2 cursor-pointer px-3 py-2 rounded-lg text-xs font-medium transition w-full justify-center ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
                                                    {uploadingDoc ? (
                                                        <><div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent" /> Subiendo...</>
                                                    ) : (
                                                        <><Upload size={12} /> {docNombre ? 'Reemplazar' : 'Seleccionar archivo'}</>
                                                    )}
                                                    <input
                                                        type="file"
                                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                                        className="hidden"
                                                        onChange={e => seleccionarArchivo(e.target.files[0], 'documento-soporte', setDocFile, setDocNombre)}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Columna derecha - Invitados */}
                    <div className="space-y-6">
                        <div className={`rounded-2xl shadow-lg overflow-hidden transition ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'
                            }`}>
                            <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                        <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Invitados</h3>
                                        {form.invitados.length > 0 && (
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-700'}`}>
                                                {form.invitados.length}
                                            </span>
                                        )}
                                    </div>
                                    {form.invitados.length > 0 && !esReadOnly && !soloConcluciones && (
                                        <button type="button" onClick={limpiarInvitados}
                                            className={`text-xs font-medium transition ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-700'}`}>
                                            Limpiar
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 space-y-3">
                                {!form.dependencias.length ? (
                                    <div className={`text-center py-8 rounded-xl ${isDark ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                                        <Building2 size={32} className={`mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
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
                                        {personasVisibles.length > 0 && !esReadOnly && !soloConcluciones && (
                                            <div className="flex gap-2 flex-wrap">
                                                <button type="button" onClick={seleccionarTodos}
                                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${isDark ? 'bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>
                                                    <Plus size={11} /> Todos de dependencias
                                                </button>
                                                {form.sectores.length > 0 && personasVisibles.some(p => form.sectores.includes(Number(p.sector_id))) && (
                                                    <button type="button" onClick={seleccionarPorSectores}
                                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${isDark ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30' : 'bg-violet-50 text-violet-700 hover:bg-violet-100'}`}>
                                                        <Plus size={11} /> Por sectores
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
                                            <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
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
                        </div>

                        {/* Botones */}
                        <div className="flex gap-3">
                            {esEdicion && ['programado', 'aplazado'].includes(form.estado) && (
                                <button
                                    type="button"
                                    onClick={() => setMostrarAplazar(true)}
                                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold transition ${isDark
                                        ? 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 border border-amber-500/20'
                                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                        }`}
                                >
                                    <CalendarClock size={16} />
                                    Aplazar
                                </button>
                            )}
                            {esEdicion && ['programado', 'aplazado'].includes(form.estado) && (
                                <button
                                    type="button"
                                    onClick={handleCancelar}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition ${isDark
                                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                                        : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                                        }`}
                                >
                                    <Trash2 size={18} />
                                    Cancelar evento
                                </button>
                            )}
                            {!esReadOnly && (
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className={`flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-3 rounded-xl text-sm font-semibold shadow-md transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 ${esEdicion && !esEnCurso && !soloConcluciones ? '' : 'w-full'}`}
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                            Guardando...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={18} />
                                            {esEdicion ? 'Actualizar Evento' : 'Crear Evento'}
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </form>
            </div>

            {mostrarExito && (
                <ModalExito
                    titulo="¡Evento creado!"
                    mensaje="El evento fue registrado correctamente en el sistema."
                    onClose={() => navigate('/eventos')}
                    onAccion={() => navigate('/eventos')}
                    textoAccion="Ver eventos"
                />
            )}

            {mostrarAplazar && esEdicion && (
                <ModalAplazarEvento
                    evento={{ id, tema: form.tema, fecha_hora: form.fecha_hora, fecha_hora_fin: form.fecha_hora_fin }}
                    onClose={() => setMostrarAplazar(false)}
                    onAplazado={() => navigate('/eventos')}
                />
            )}
        </Layout>
    );
}
