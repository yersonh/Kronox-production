import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../hooks/useTheme';
import api from '../api/axios';
import { Flag, X, CheckCircle, XCircle, AlertCircle, Plus, Trash2, ClipboardList, Upload, Download, Paperclip, Camera, Image, Sparkles, Maximize2 } from 'lucide-react';

// Duración estimada (ms) para que la barra avance de forma continua mientras Gemini procesa el documento.
// La barra se acerca asintóticamente al 95% y solo llega a 100% cuando la respuesta real llega.
const DURACION_ESTIMADA_RESUMEN_MS = 9000;

export default function ModalFinalizar({ evento, onClose, onFinalizado }) {
    const { isDark } = useTheme();
    const [conclusiones, setConclusiones] = useState('');
    // Solo mostrar confirmados; los pendientes/rechazados se envían automáticamente como no asistieron
    const [asistencias, setAsistencias] = useState(
        (evento.invitados ?? [])
            .filter(inv => inv.confirmacion === 'confirmado')
            .map(inv => ({
                persona_id: inv.persona_id,
                nombre: inv.persona ? `${inv.persona.nombres} ${inv.persona.apellidos}`.trim() : `Persona ${inv.persona_id}`,
                asistio: inv.asistio ?? false,
            }))
    );
    const [compromisos, setCompromisos] = useState([]);
    const [nuevoCompromiso, setNuevoCompromiso] = useState({ persona_id: '', descripcion: '', fecha_limite: '' });
    const [actaFile, setActaFile] = useState(null);
    const [actaNombre, setActaNombre] = useState(evento.acta_reunion ? evento.acta_reunion.split('/').pop() : '');
    const [listaFile, setListaFile] = useState(null);
    const [listaNombre, setListaNombre] = useState(evento.lista_asistencia ? evento.lista_asistencia.split('/').pop() : '');
    const [fotos, setFotos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Resumen del acta generado por IA (Gemini)
    const [resumenActa, setResumenActa] = useState(evento.resumen_acta ?? '');
    const [generandoResumen, setGenerandoResumen] = useState(false);
    const [progresoResumen, setProgresoResumen] = useState(0);
    const [errorResumen, setErrorResumen] = useState('');
    const [resumenExpandido, setResumenExpandido] = useState(false);
    const progresoIntervalRef = useRef(null);

    useEffect(() => () => clearInterval(progresoIntervalRef.current), []);

    const handleActaFileChange = async (e) => {
        const f = e.target.files[0];
        e.target.value = '';
        if (!f) return;

        setActaNombre(f.name);
        setErrorResumen('');
        setResumenActa('');
        setGenerandoResumen(true);
        setProgresoResumen(0);

        const inicio = Date.now();
        progresoIntervalRef.current = setInterval(() => {
            const t = Date.now() - inicio;
            // Se acerca asintóticamente al 95% mientras esperamos la respuesta real de la IA
            const pct = 95 * (1 - Math.exp(-t / DURACION_ESTIMADA_RESUMEN_MS));
            setProgresoResumen(pct);
        }, 100);

        try {
            const fd = new FormData();
            fd.append('archivo', f);
            const res = await api.post(`/eventos/${evento.id}/acta-reunion`, fd, { headers: { 'Content-Type': undefined } });

            clearInterval(progresoIntervalRef.current);
            setProgresoResumen(100);

            if (res.data.resumen_acta) {
                setResumenActa(res.data.resumen_acta);
            } else {
                setErrorResumen('No se pudo generar el resumen automático. Puedes redactarlo manualmente.');
            }
            // El archivo ya quedó guardado en el evento; no debe volver a subirse al finalizar.
            setActaFile(null);
        } catch (err) {
            clearInterval(progresoIntervalRef.current);
            setProgresoResumen(0);
            setErrorResumen(err.response?.data?.message || 'Error al subir el acta de reunión.');
            setActaFile(null);
            setActaNombre(evento.acta_reunion ? evento.acta_reunion.split('/').pop() : '');
        } finally {
            setTimeout(() => setGenerandoResumen(false), 400);
        }
    };

    const toggleAsistencia = (persona_id) => {
        setAsistencias(prev =>
            prev.map(a => a.persona_id === persona_id ? { ...a, asistio: !a.asistio } : a)
        );
    };

    const agregarCompromiso = () => {
        const { persona_id, descripcion, fecha_limite } = nuevoCompromiso;
        if (!persona_id || !descripcion.trim() || !fecha_limite) return;
        const persona = asistencias.find(a => String(a.persona_id) === String(persona_id));
        setCompromisos(prev => [...prev, {
            persona_id: Number(persona_id),
            nombre: persona?.nombres ?? `ID ${persona_id}`,
            descripcion: descripcion.trim(),
            fecha_limite,
        }]);
        setNuevoCompromiso({ persona_id: '', descripcion: '', fecha_limite: '' });
    };

    const quitarCompromiso = (idx) => {
        setCompromisos(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!conclusiones.trim()) { setError('Las conclusiones son obligatorias'); return; }
        setLoading(true);
        setError('');

        try {
            // Paso 1: Subir archivos primero (evento aún en_curso → se puede reintentar si algo falla)
            const multipartHeaders = { headers: { 'Content-Type': undefined } };
            if (actaFile) {
                const fd = new FormData();
                fd.append('archivo', actaFile);
                await api.post(`/eventos/${evento.id}/acta-reunion`, fd, multipartHeaders);
            }
            if (listaFile) {
                const fd = new FormData();
                fd.append('archivo', listaFile);
                await api.post(`/eventos/${evento.id}/lista-asistencia`, fd, multipartHeaders);
            }
            if (fotos.length > 0) {
                const fd = new FormData();
                fotos.forEach(f => fd.append('fotos[]', f));
                await api.post(`/eventos/${evento.id}/fotos`, fd, multipartHeaders);
            }

            // Paso 2: Finalizar (último paso — si llega aquí, todos los archivos subieron)
            const asistenciasCompletas = [
                ...asistencias.map(({ persona_id, asistio }) => ({ persona_id, asistio })),
                ...(evento.invitados ?? [])
                    .filter(inv => inv.confirmacion !== 'confirmado')
                    .map(inv => ({ persona_id: inv.persona_id, asistio: false }))
            ];
            await api.post(`/eventos/${evento.id}/finalizar`, {
                conclusiones,
                resumen_acta: resumenActa || null,
                asistencias: asistenciasCompletas,
                compromisos: compromisos.map(({ persona_id, descripcion, fecha_limite }) => ({ persona_id, descripcion, fecha_limite })),
            });

            onFinalizado();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al finalizar el evento');
        } finally {
            setLoading(false);
        }
    };

    const asistieron = asistencias.filter(a => a.asistio).length;
    const inputCls = `rounded-xl px-3 py-2 text-sm border focus:outline-none transition ${isDark ? 'bg-gray-900 border-gray-700 text-white focus:ring-2 focus:ring-emerald-500 placeholder-gray-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-emerald-500'}`;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
            <div className={`w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
                {/* Header */}
                <div className={`px-6 py-4 border-b flex items-center justify-between gap-3 flex-shrink-0 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-100 bg-white'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                            <Flag size={18} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
                        </div>
                        <div>
                            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Finalizar evento</h3>
                            <p className={`text-xs truncate max-w-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{evento.tema}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-1.5 rounded-lg transition ${isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'}`}>
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden flex-1">
                    <div className="overflow-y-auto flex-1 p-6 space-y-6">

                        {error && (
                            <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}

                        {/* Conclusiones */}
                        <div>
                            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Conclusiones <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={conclusiones}
                                onChange={e => setConclusiones(e.target.value)}
                                rows={4}
                                placeholder="Describe las conclusiones, decisiones y acuerdos del evento..."
                                className={`w-full rounded-xl px-4 py-2.5 text-sm border focus:outline-none resize-none transition ${isDark ? 'bg-gray-900 border-gray-700 text-white focus:ring-2 focus:ring-emerald-500' : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-emerald-500'}`}
                            />
                        </div>

                        {/* Asistencia */}
                        {(evento.invitados ?? []).length > 0 && (
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        Registro de asistencia
                                    </label>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {asistieron} / {asistencias.length} confirmados
                                    </span>
                                </div>
                                {asistencias.length === 0 ? (
                                    <div className={`p-3 rounded-xl text-sm text-center ${isDark ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                        Sin confirmaciones de asistencia
                                    </div>
                                ) : (
                                    <>
                                        {(evento.invitados ?? []).length > asistencias.length && (
                                            <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                Los {(evento.invitados ?? []).length - asistencias.length} invitados que no confirmaron se registrarán como ausentes.
                                            </p>
                                        )}
                                        <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                            <div className="max-h-44 overflow-y-auto divide-y">
                                                {asistencias.map(a => (
                                                    <label
                                                        key={a.persona_id}
                                                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition ${
                                                            a.asistio
                                                                ? isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'
                                                                : isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'
                                                        } ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={a.asistio}
                                                            onChange={() => toggleAsistencia(a.persona_id)}
                                                            className="w-4 h-4 rounded accent-emerald-600 flex-shrink-0"
                                                        />
                                                        <span className={`text-sm flex-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                                            {a.nombre}
                                                        </span>
                                                        {a.asistio
                                                            ? <CheckCircle size={15} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
                                                            : <XCircle size={15} className={isDark ? 'text-gray-600' : 'text-gray-300'} />
                                                        }
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Archivos del acta */}
                        <div>
                            <p className={`text-sm font-medium mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Documentos del evento
                            </p>
                            <div className="grid grid-cols-1 gap-3">
                                {/* Acta de reunión */}
                                <div className={`rounded-xl p-3 border ${isDark ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                    <p className={`text-xs font-medium mb-2 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        <Paperclip size={12} /> Acta de reunión
                                        <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>Opcional</span>
                                    </p>
                                    {actaNombre && (
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-xs truncate flex-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{actaNombre}</span>
                                            {evento.acta_reunion && !actaFile && (
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        const res = await api.get(`/eventos/${evento.id}/acta-reunion`, { responseType: 'blob' });
                                                        const url = URL.createObjectURL(res.data);
                                                        window.open(url, '_blank');
                                                        setTimeout(() => URL.revokeObjectURL(url), 60000);
                                                    }}
                                                    className={`flex items-center gap-1 text-xs font-medium flex-shrink-0 ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
                                                >
                                                    <Download size={11} /> Ver
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <label className={`flex items-center justify-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium transition w-full ${generandoResumen ? 'opacity-50 pointer-events-none' : ''} ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
                                        <Upload size={11} /> {actaNombre ? 'Reemplazar' : 'Seleccionar archivo'}
                                        <input type="file" accept=".pdf" className="hidden" disabled={generandoResumen}
                                            onChange={handleActaFileChange} />
                                    </label>

                                    {/* Barra de progreso: generación del resumen con IA */}
                                    {generandoResumen && (
                                        <div className="mt-3">
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <Sparkles size={12} className={isDark ? 'text-indigo-400 animate-pulse' : 'text-indigo-600 animate-pulse'} />
                                                <span className={`text-xs font-medium ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                                                    Generando resumen con IA...
                                                </span>
                                            </div>
                                            <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                                <div
                                                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-150 ease-linear"
                                                    style={{ width: `${progresoResumen}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {errorResumen && !generandoResumen && (
                                        <p className={`mt-2 text-xs flex items-center gap-1 ${isDark ? 'text-amber-400' : 'text-amber-600'}`}>
                                            <AlertCircle size={11} /> {errorResumen}
                                        </p>
                                    )}

                                    {/* Resumen generado por IA */}
                                    {!generandoResumen && (actaNombre || evento.acta_reunion) && (
                                        <div className="mt-3">
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label className={`text-xs font-medium flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                                    <Sparkles size={12} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                                    Resumen del acta (generado por IA)
                                                </label>
                                                {resumenActa && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setResumenExpandido(true)}
                                                        className={`flex items-center gap-1 text-xs font-medium transition ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
                                                    >
                                                        <Maximize2 size={11} /> Ampliar
                                                    </button>
                                                )}
                                            </div>
                                            <textarea
                                                value={resumenActa}
                                                onChange={e => setResumenActa(e.target.value)}
                                                rows={4}
                                                placeholder="El resumen generado por la IA aparecerá aquí. Puedes editarlo si lo necesitas."
                                                className={`w-full rounded-xl px-3 py-2 text-xs border focus:outline-none resize-none transition ${isDark ? 'bg-gray-900 border-gray-700 text-gray-200 focus:ring-2 focus:ring-indigo-500' : 'bg-white border-gray-200 text-gray-800 focus:ring-2 focus:ring-indigo-500'}`}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Lista de asistencia externa */}
                                <div className={`rounded-xl p-3 border ${isDark ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                    <p className={`text-xs font-medium mb-1 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        <Paperclip size={12} /> Lista de asistencia externa
                                        <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'}`}>Opcional</span>
                                    </p>
                                    <p className={`text-xs mb-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        Para entidades o personas externas no registradas en el sistema
                                    </p>
                                    {listaNombre && (
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`text-xs truncate flex-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{listaNombre}</span>
                                            {evento.lista_asistencia && !listaFile && (
                                                <button
                                                    type="button"
                                                    onClick={async () => {
                                                        const res = await api.get(`/eventos/${evento.id}/lista-asistencia`, { responseType: 'blob' });
                                                        const url = URL.createObjectURL(res.data);
                                                        window.open(url, '_blank');
                                                        setTimeout(() => URL.revokeObjectURL(url), 60000);
                                                    }}
                                                    className={`flex items-center gap-1 text-xs font-medium flex-shrink-0 ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
                                                >
                                                    <Download size={11} /> Ver
                                                </button>
                                            )}
                                        </div>
                                    )}
                                    <label className={`flex items-center justify-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg text-xs font-medium transition w-full ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
                                        <Upload size={11} /> {listaNombre ? 'Reemplazar' : 'Seleccionar PDF'}
                                        <input type="file" accept=".pdf" className="hidden"
                                            onChange={e => { const f = e.target.files[0]; if (f) { setListaFile(f); setListaNombre(f.name); } }} />
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Compromisos */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <ClipboardList size={15} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                <label className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Compromisos pactados
                                </label>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-700'}`}>
                                    Opcional
                                </span>
                            </div>

                            {/* Formulario nuevo compromiso */}
                            <div className={`rounded-xl border p-4 space-y-3 ${isDark ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'}`}>
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        value={nuevoCompromiso.persona_id}
                                        onChange={e => setNuevoCompromiso(p => ({ ...p, persona_id: e.target.value }))}
                                        className={`col-span-1 ${inputCls}`}
                                    >
                                        <option value="">¿Quién se compromete?</option>
                                        {asistencias.map(a => (
                                            <option key={a.persona_id} value={a.persona_id}>{a.nombre}</option>
                                        ))}
                                    </select>
                                    <input
                                        type="date"
                                        value={nuevoCompromiso.fecha_limite}
                                        min={evento.fecha_hora?.slice(0, 10)}
                                        onChange={e => setNuevoCompromiso(p => ({ ...p, fecha_limite: e.target.value }))}
                                        className={`col-span-1 ${inputCls}`}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={nuevoCompromiso.descripcion}
                                        onChange={e => setNuevoCompromiso(p => ({ ...p, descripcion: e.target.value }))}
                                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), agregarCompromiso())}
                                        placeholder="Describe el compromiso adquirido..."
                                        className={`flex-1 ${inputCls}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={agregarCompromiso}
                                        disabled={!nuevoCompromiso.persona_id || !nuevoCompromiso.descripcion.trim() || !nuevoCompromiso.fecha_limite}
                                        className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-40 transition flex items-center gap-1"
                                    >
                                        <Plus size={16} /> Agregar
                                    </button>
                                </div>
                            </div>

                            {/* Lista de compromisos agregados */}
                            {compromisos.length > 0 && (
                                <div className="mt-3 space-y-2">
                                    {compromisos.map((c, idx) => (
                                        <div
                                            key={idx}
                                            className={`flex items-start gap-3 px-4 py-3 rounded-xl border ${isDark ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-indigo-50 border-indigo-100'}`}
                                        >
                                            <ClipboardList size={14} className={`mt-0.5 flex-shrink-0 ${isDark ? 'text-indigo-400' : 'text-indigo-500'}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-sm font-medium truncate ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>{c.nombre}</p>
                                                <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{c.descripcion}</p>
                                                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    Fecha límite: {new Date(c.fecha_limite + 'T00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => quitarCompromiso(idx)}
                                                className={`p-1 rounded-lg transition flex-shrink-0 ${isDark ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/10' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'}`}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Fotos de evidencia */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Camera size={15} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Fotos de evidencia
                                </p>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-700'}`}>
                                    Opcional
                                </span>
                            </div>

                            {/* Miniaturas de fotos seleccionadas */}
                            {fotos.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {fotos.map((f, idx) => (
                                        <div key={idx} className="relative group">
                                            <img
                                                src={URL.createObjectURL(f)}
                                                alt={f.name}
                                                className="w-16 h-16 object-cover rounded-xl border-2 border-transparent group-hover:border-red-400 transition"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setFotos(prev => prev.filter((_, i) => i !== idx))}
                                                className="absolute -top-1.5 -right-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <label className={`flex items-center justify-center gap-2 cursor-pointer px-4 py-3 rounded-xl text-sm font-medium transition border-2 border-dashed ${isDark ? 'border-gray-600 text-gray-400 hover:border-indigo-500 hover:text-indigo-400' : 'border-gray-200 text-gray-500 hover:border-indigo-400 hover:text-indigo-600'}`}>
                                <Image size={16} />
                                {fotos.length > 0 ? `${fotos.length} foto${fotos.length > 1 ? 's' : ''} seleccionada${fotos.length > 1 ? 's' : ''} — agregar más` : 'Seleccionar fotos (JPG, PNG)'}
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    multiple
                                    className="hidden"
                                    onChange={e => {
                                        const nuevas = Array.from(e.target.files);
                                        setFotos(prev => [...prev, ...nuevas].slice(0, 20));
                                        e.target.value = '';
                                    }}
                                />
                            </label>
                            {fotos.length > 0 && (
                                <p className={`text-xs mt-1.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    Pasa el cursor sobre una foto y toca × para quitarla
                                </p>
                            )}
                        </div>

                    </div>

                    {/* Footer */}
                    <div className={`px-6 py-4 border-t flex gap-3 flex-shrink-0 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || generandoResumen || !conclusiones.trim()}
                            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Finalizando...</>
                            ) : (
                                <><Flag size={16} /> Confirmar finalización{compromisos.length > 0 ? ` · ${compromisos.length} compromiso${compromisos.length > 1 ? 's' : ''}` : ''}</>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            {/* Modal: resumen del acta ampliado */}
            {resumenExpandido && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
                    <div className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
                        <div className={`px-6 py-4 border-b flex items-center justify-between gap-3 flex-shrink-0 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <div className="flex items-center gap-2.5">
                                <div className={`p-2 rounded-xl ${isDark ? 'bg-indigo-500/20' : 'bg-indigo-100'}`}>
                                    <Sparkles size={16} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                </div>
                                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Resumen del acta (IA)</h3>
                            </div>
                            <button onClick={() => setResumenExpandido(false)} className={`p-1.5 rounded-lg transition ${isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'}`}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <textarea
                                value={resumenActa}
                                onChange={e => setResumenActa(e.target.value)}
                                rows={14}
                                className={`w-full h-full rounded-xl px-4 py-3 text-sm leading-relaxed border focus:outline-none resize-none transition ${isDark ? 'bg-gray-900 border-gray-700 text-gray-200 focus:ring-2 focus:ring-indigo-500' : 'bg-gray-50 border-gray-200 text-gray-800 focus:ring-2 focus:ring-indigo-500'}`}
                            />
                        </div>
                        <div className={`px-6 py-4 border-t flex justify-end flex-shrink-0 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <button
                                onClick={() => setResumenExpandido(false)}
                                className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
