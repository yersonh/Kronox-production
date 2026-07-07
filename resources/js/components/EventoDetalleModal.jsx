import React, { useEffect, useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import {
    X, Calendar, Clock, MapPin, Building2, User, Users,
    FileText, Camera, ChevronLeft, ChevronRight, Video,
    Briefcase, Globe, Info, ClipboardList, CheckCircle, PlayCircle, Lock, XCircle,
    ExternalLink, CheckSquare, ListTodo, CheckCheck, Download, Paperclip
} from 'lucide-react';
import api from '../api/axios';
import DependenciasCell from './DependenciasCell';

const toLocalDate = (s) => s ? new Date(s.slice(0, 16)) : new Date();

export default function EventoDetalleModal({ evento, onClose, isMyEventView = false }) {
    const { isDark } = useTheme();
    const [fotos, setFotos] = useState([]);
    const [loadingFotos, setLoadingFotos] = useState(false);
    const [compromisos, setCompromisos] = useState([]);
    const [loadingCompromisos, setLoadingCompromisos] = useState(false);
    const [fotoActiva, setFotoActiva] = useState(null);

    useEffect(() => {
        if (evento) {
            fetchFotos();
            fetchCompromisos();
        }
        return () => {
            if (Array.isArray(fotos)) {
                fotos.forEach(f => {
                    if (f.blobUrl) URL.revokeObjectURL(f.blobUrl);
                });
            }
        };
    }, [evento?.id]);

    const fetchFotos = async () => {
        if (!evento?.id) return;
        setLoadingFotos(true);
        try {
            const res = await api.get(`/eventos/${evento.id}/fotos`);
            const data = Array.isArray(res.data) ? res.data : (res.data?.data || []);
            if (!data.length) {
                setFotos([]);
                setLoadingFotos(false);
                return;
            }
            const fotosConUrl = await Promise.all(data.map(async (foto) => {
                try {
                    const r = await api.get(`/eventos/${evento.id}/fotos/${foto.id}`, { responseType: 'blob' });
                    return { ...foto, blobUrl: URL.createObjectURL(r.data) };
                } catch { return null; }
            }));
            setFotos(fotosConUrl.filter(Boolean));
        } catch (err) {
            console.error('Error fetching fotos:', err);
        } finally {
            setLoadingFotos(false);
        }
    };

    const fetchCompromisos = async () => {
        if (!evento?.id) return;
        setLoadingCompromisos(true);
        try {
            const res = await api.get('/reportes/compromisos', { params: { evento_id: evento.id } });
            // El reporte devuelve { compromisos: [...], resumen: {...} }
            const data = res.data?.compromisos ?? (Array.isArray(res.data) ? res.data : (res.data?.data ?? []));
            setCompromisos(data);
        } catch (err) {
            console.error('Error fetching compromisos:', err);
        } finally {
            setLoadingCompromisos(false);
        }
    };

    const verArchivo = async (endpoint) => {
        try {
            const res = await api.get(`/eventos/${evento.id}/${endpoint}`, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (err) {
            console.error('Error al abrir archivo:', err);
            alert('No se pudo cargar el archivo');
        }
    };

    const descargarFoto = (foto) => {
        const a = document.createElement('a');
        a.href = foto.blobUrl;
        a.download = foto.nombre_original || `foto_${foto.id}.jpg`;
        a.click();
    };

    if (!evento) return null;

    const badgeEstado = (estado) => {
        const config = {
            programado: { bg: isDark ? 'bg-blue-500/20' : 'bg-blue-100', text: isDark ? 'text-blue-300' : 'text-blue-700', icon: <Info size={12} />, label: 'Programado' },
            en_curso: { bg: isDark ? 'bg-indigo-500/20' : 'bg-indigo-100', text: isDark ? 'text-indigo-300' : 'text-indigo-700', icon: <PlayCircle size={12} />, label: 'En curso' },
            finalizado: { bg: isDark ? 'bg-emerald-500/20' : 'bg-emerald-100', text: isDark ? 'text-emerald-300' : 'text-emerald-700', icon: <CheckCircle size={12} />, label: 'Finalizado' },
            cerrado: { bg: isDark ? 'bg-gray-500/20' : 'bg-gray-100', text: isDark ? 'text-gray-400' : 'text-gray-600', icon: <Lock size={12} />, label: 'Cerrado' },
            aplazado: { bg: isDark ? 'bg-yellow-500/20' : 'bg-yellow-100', text: isDark ? 'text-yellow-300' : 'text-yellow-700', icon: <Clock size={12} />, label: 'Aplazado' },
            cancelado: { bg: isDark ? 'bg-red-500/20' : 'bg-red-100', text: isDark ? 'text-red-300' : 'text-red-700', icon: <XCircle size={12} />, label: 'Cancelado' },
        };
        const c = config[estado] ?? config.programado;
        return (
            <span className={`${c.bg} ${c.text} px-3 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1.5 shadow-sm`}>
                {c.icon} {c.label}
            </span>
        );
    };

    const InfoRow = ({ icon, label, value, children }) => {
        if (!value && !children) return null;
        return (
            <div className="flex items-start gap-3 group">
                <div className={`p-2 rounded-lg mt-0.5 transition ${isDark ? 'bg-gray-700/50 text-gray-400 group-hover:bg-gray-700' : 'bg-gray-50 text-gray-400 group-hover:bg-gray-100'}`}>
                    {icon}
                </div>
                <div className="min-w-0 flex-1">
                    <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{label}</p>
                    <div className={`text-sm font-medium break-words ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                        {value || children}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl shadow-2xl transition-all transform animate-in fade-in zoom-in duration-200 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'}`}>
                
                {/* Header with Gradient */}
                <div className={`px-8 py-6 flex items-center justify-between relative overflow-hidden flex-shrink-0 ${isDark ? 'bg-gray-900' : 'bg-gradient-to-r from-indigo-600 to-purple-600'}`}>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-white/60 font-mono text-xs tracking-widest">{evento.numero || `EV-${evento.id}`}</span>
                            {badgeEstado(evento.estado)}
                        </div>
                        <h2 className="text-white text-xl font-bold leading-tight line-clamp-2">{evento.tema}</h2>
                    </div>
                    <button onClick={onClose} className="relative z-10 text-white/70 hover:text-white hover:bg-white/10 rounded-2xl w-10 h-10 flex items-center justify-center transition-all transform hover:rotate-90">
                        <X size={24} />
                    </button>
                    
                    {/* Decorative Blobs */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full -ml-12 -mb-12 blur-xl" />
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
                        
                        {/* Information Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <InfoRow icon={<Calendar size={18} />} label="Fecha" value={toLocalDate(evento.fecha_hora).toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
                            <InfoRow icon={<Clock size={18} />} label="Hora" value={toLocalDate(evento.fecha_hora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })} />
                            
                            <InfoRow icon={<User size={18} />} label="Responsable" value={evento.responsable ? `${evento.responsable.nombre} ${evento.responsable.apellido}` : 'No asignado'} />
                            <InfoRow icon={<Building2 size={18} />} label="Dependencias">
                                <DependenciasCell dependencias={evento.dependencias} max={3} />
                            </InfoRow>

                            {evento.sectores?.length > 0 && (
                                <InfoRow icon={<Briefcase size={18} />} label="Sectores">
                                    <DependenciasCell dependencias={evento.sectores} max={3} />
                                </InfoRow>
                            )}

                            {(evento.sala || evento.sitio || evento.direccion) && (
                                <div className="md:col-span-2">
                                    <InfoRow icon={<MapPin size={18} />} label="Ubicación">
                                        <div className="space-y-1">
                                            {evento.sala && <p className="font-bold">{evento.sala.nombre} {evento.sala.ubicacion && <span className="font-normal opacity-70">({evento.sala.ubicacion})</span>}</p>}
                                            {evento.sitio && <p>{evento.sitio}</p>}
                                            {evento.direccion && <p className="text-xs opacity-80">{evento.direccion}</p>}
                                        </div>
                                    </InfoRow>
                                </div>
                            )}

                            {evento.enlace_meet && (
                                <div className="md:col-span-2">
                                    <InfoRow icon={<Video size={18} />} label="Enlace de Reunión">
                                        <a href={evento.enlace_meet} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:underline flex items-center gap-1">
                                            {evento.enlace_meet}
                                        </a>
                                    </InfoRow>
                                </div>
                            )}

                            {(evento.entidad || evento.area) && (
                                <>
                                    <InfoRow icon={<Globe size={18} />} label="Entidad" value={evento.entidad} />
                                    <InfoRow icon={<Users size={18} />} label="Área" value={evento.area} />
                                </>
                            )}
                        </div>

                        {/* Descripción */}
                        {evento.descripcion && (
                            <div className={`p-5 rounded-2xl ${isDark ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
                                <h4 className={`text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <FileText size={14} /> Descripción
                                </h4>
                                <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {evento.descripcion}
                                </p>
                            </div>
                        )}

                        {/* Conclusiones */}
                        {evento.conclusiones && (
                            <div className={`p-5 rounded-2xl border-2 border-dashed ${isDark ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'}`}>
                                <h4 className={`text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2 ${isDark ? 'text-emerald-500/70' : 'text-emerald-600'}`}>
                                    <ClipboardList size={14} /> Conclusiones y Acuerdos
                                </h4>
                                <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-emerald-100/90' : 'text-emerald-900'}`}>
                                    {evento.conclusiones}
                                </p>
                            </div>
                        )}

                        {/* Compromisos Section */}
                        <div className="space-y-4 pt-4 border-t border-dashed dark:border-gray-700 border-gray-200">
                            <h4 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                <ListTodo size={14} className="text-indigo-500" /> Compromisos Adquiridos
                            </h4>
                            {loadingCompromisos ? (
                                <div className="space-y-2">
                                    <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
                                    <div className="h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl animate-pulse" />
                                </div>
                            ) : compromisos.length === 0 ? (
                                <div className={`p-4 rounded-2xl text-center border-2 border-dashed ${isDark ? 'border-gray-800 text-gray-600' : 'border-gray-100 text-gray-400'}`}>
                                    <p className="text-xs">No se registraron tareas compromiso para este evento</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {compromisos.map(c => {
                                        const isVencido = c.vencido || (c.estado === 'pendiente' && c.fecha_limite && new Date(c.fecha_limite) < new Date());
                                        const estadoLabel = c.estado === 'cumplido' || c.estado === 'realizado' ? 'Cumplido' : isVencido ? 'Vencido' : 'Pendiente';
                                        const estadoCls = (c.estado === 'cumplido' || c.estado === 'realizado')
                                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                                            : isVencido 
                                                ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                                                : 'bg-amber-500/20 text-amber-400 border-amber-500/30';

                                        return (
                                            <div key={c.id} className={`p-4 rounded-2xl border transition-all ${isDark ? 'bg-gray-900/40 border-gray-700 hover:border-gray-600' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                                                <div className="flex items-start justify-between gap-3 mb-2">
                                                    <p className={`text-sm font-semibold leading-relaxed ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                                                        {c.descripcion}
                                                    </p>
                                                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${estadoCls}`}>
                                                        {estadoLabel}
                                                    </span>
                                                </div>
                                                <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] ${isDark ? 'text-gray-300' : 'text-gray-500'}`}>
                                                    <div className="flex items-center gap-1.5">
                                                        <User size={12} className="text-indigo-500" />
                                                        <span className="font-semibold">
                                                            {typeof c.persona === 'object' 
                                                                ? `${c.persona?.nombre} ${c.persona?.apellido}`.trim() 
                                                                : (c.persona || 'Sin asignar')}
                                                        </span>
                                                    </div>
                                                    {c.fecha_limite && (
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock size={12} className="text-indigo-500" />
                                                            <span>Límite: {(() => {
                                                                try {
                                                                    const dateStr = c.fecha_limite.includes('T') ? c.fecha_limite : `${c.fecha_limite.split(' ')[0]}T00:00:00`;
                                                                    return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
                                                                } catch (e) {
                                                                    return c.fecha_limite;
                                                                }
                                                            })()}</span>
                                                        </div>
                                                    )}
                                                    {c.dependencia && (
                                                        <div className="flex items-center gap-1.5">
                                                            <Building2 size={12} className="text-indigo-500" />
                                                            <span>{typeof c.dependencia === 'object' ? c.dependencia.nombre : c.dependencia}</span>
                                                        </div>
                                                    )}
                                                    {c.sector && (
                                                        <div className="flex items-center gap-1.5">
                                                            <Briefcase size={12} className="text-indigo-500" />
                                                            <span>{typeof c.sector === 'object' ? c.sector.nombre : c.sector}</span>
                                                        </div>
                                                    )}
                                                        { (c.estado === 'cumplido' || c.estado === 'realizado') && (
                                                            <div className="flex items-center gap-1.5 text-emerald-500">
                                                                <CheckCheck size={12} />
                                                                <span>Completado</span>
                                                            </div>
                                                        )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Documentos del Evento (Solo en Mis Eventos) */}
                        {isMyEventView && (evento.documento_soporte || evento.acta_reunion || evento.lista_asistencia) && (
                            <div className="space-y-4 pt-4 border-t border-dashed dark:border-gray-700 border-gray-200">
                                <h4 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <FileText size={14} className="text-indigo-500" /> Documentos del Evento
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {evento.documento_soporte && (
                                        <button onClick={() => verArchivo('documento-soporte')} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left group ${isDark ? 'bg-gray-900/40 border-gray-700 hover:border-indigo-500/50' : 'bg-gray-50 border-gray-200 hover:border-indigo-300'}`}>
                                            <div className={`p-2 rounded-xl transition-colors ${isDark ? 'bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/30' : 'bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200'}`}>
                                                <Paperclip size={16} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Soporte</p>
                                                <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{evento.documento_soporte.split('/').pop()}</p>
                                            </div>
                                            <Download size={16} className="text-gray-400 group-hover:text-indigo-500 transition-colors" />
                                        </button>
                                    )}
                                    {evento.acta_reunion && (
                                        <button onClick={() => verArchivo('acta-reunion')} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left group ${isDark ? 'bg-gray-900/40 border-gray-700 hover:border-emerald-500/50' : 'bg-gray-50 border-gray-200 hover:border-emerald-300'}`}>
                                            <div className={`p-2 rounded-xl transition-colors ${isDark ? 'bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30' : 'bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200'}`}>
                                                <FileText size={16} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Acta de Reunión</p>
                                                <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{evento.acta_reunion.split('/').pop()}</p>
                                            </div>
                                            <Download size={16} className="text-gray-400 group-hover:text-emerald-500 transition-colors" />
                                        </button>
                                    )}
                                    {evento.lista_asistencia && (
                                        <button onClick={() => verArchivo('lista-asistencia')} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all text-left group ${isDark ? 'bg-gray-900/40 border-gray-700 hover:border-amber-500/50' : 'bg-gray-50 border-gray-200 hover:border-amber-300'}`}>
                                            <div className={`p-2 rounded-xl transition-colors ${isDark ? 'bg-amber-500/20 text-amber-400 group-hover:bg-amber-500/30' : 'bg-amber-100 text-amber-600 group-hover:bg-amber-200'}`}>
                                                <Users size={16} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Asistencia</p>
                                                <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>{evento.lista_asistencia.split('/').pop()}</p>
                                            </div>
                                            <Download size={16} className="text-gray-400 group-hover:text-amber-500 transition-colors" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Evidence Photos */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <Camera size={14} /> Fotos de Evidencia
                                </h4>
                                {fotos.length > 0 && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                        {fotos.length} IMÁGENES
                                    </span>
                                )}
                            </div>

                            {loadingFotos ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-500 border-t-transparent" />
                                </div>
                            ) : fotos.length === 0 ? (
                                <div className={`text-center py-8 rounded-2xl border-2 border-dashed ${isDark ? 'bg-gray-900/30 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                                    <Camera size={24} className="mx-auto mb-2 opacity-20" />
                                    <p className="text-xs opacity-40">No hay fotos de evidencia cargadas</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                    {fotos.map((foto, idx) => (
                                        <div key={foto.id} className="relative aspect-square rounded-xl overflow-hidden group hover:ring-2 hover:ring-indigo-500 transition-all shadow-md">
                                            <button onClick={() => setFotoActiva(idx)} className="absolute inset-0 w-full h-full">
                                                <img src={foto.blobUrl} alt={foto.nombre_original} className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                                                    <Camera size={20} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </button>
                                            <button onClick={e => { e.stopPropagation(); descargarFoto(foto); }} title="Descargar foto" className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <Download size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer / Actions */}
                <div className={`px-8 py-4 border-t flex items-center justify-end flex-shrink-0 ${isDark ? 'bg-gray-900/50 border-gray-700' : 'bg-gray-50 border-gray-100'}`}>
                    <button onClick={onClose} className={`px-6 py-2.5 rounded-2xl text-sm font-bold transition-all transform hover:scale-105 active:scale-95 ${isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}`}>
                        Cerrar Detalle
                    </button>
                </div>
            </div>

            {/* Lightbox for Photos */}
            {fotoActiva !== null && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 animate-in fade-in duration-300" onClick={() => setFotoActiva(null)}>
                    <button onClick={() => descargarFoto(fotos[fotoActiva])} title="Descargar foto" className="absolute top-6 right-20 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all">
                        <Download size={20} />
                    </button>
                    <button onClick={() => setFotoActiva(null)} className="absolute top-6 right-6 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all transform hover:rotate-90">
                        <X size={24} />
                    </button>
                    
                    {fotoActiva > 0 && (
                        <button onClick={e => { e.stopPropagation(); setFotoActiva(i => i - 1); }} className="absolute left-6 p-4 rounded-full bg-white/5 hover:bg-white/15 text-white transition-all transform hover:-translate-x-1">
                            <ChevronLeft size={32} />
                        </button>
                    )}
                    
                    <div className="max-w-[90vw] max-h-[85vh] relative" onClick={e => e.stopPropagation()}>
                        <img src={fotos[fotoActiva].blobUrl} alt={fotos[fotoActiva].nombre_original} className="w-full h-full object-contain rounded-xl shadow-2xl select-none" />
                        <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-white/60 text-xs font-mono uppercase tracking-widest">
                            {fotoActiva + 1} / {fotos.length} — {fotos[fotoActiva].nombre_original}
                        </div>
                    </div>

                    {fotoActiva < fotos.length - 1 && (
                        <button onClick={e => { e.stopPropagation(); setFotoActiva(i => i + 1); }} className="absolute right-6 p-4 rounded-full bg-white/5 hover:bg-white/15 text-white transition-all transform hover:translate-x-1">
                            <ChevronRight size={32} />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
