import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useTheme } from '../hooks/useTheme';
import {
    X, ListTodo, Flag, User, Building2, Clock,
    FileText, Download, Camera, ChevronLeft,
    ChevronRight, CheckCircle, AlertTriangle,
    Calendar, Paperclip, ClipboardList, AlertCircle, CheckCheck
} from 'lucide-react';

export default function TareaDetalleModal({ item, tipo = 'tarea', onClose, onCumplir }) {
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(false);
    const [fotos, setFotos] = useState([]);
    const [loadingFotos, setLoadingFotos] = useState(false);
    const [fotoActiva, setFotoActiva] = useState(null);

    // Identificamos el item (puede ser tarea o compromiso)
    const isTarea = tipo === 'tarea';
    const id = item.id;
    const asunto = isTarea ? item.asunto : item.descripcion;
    const numero = isTarea ? (item.numero || `T-${item.id}`) : (item.numero || `C-${item.id}`);

    useEffect(() => {
        if (id) {
            fetchFotos();
        }
    }, [id, tipo]);

    const fetchFotos = async () => {
        setLoadingFotos(true);
        try {
            const endpoint = isTarea ? `/tareas/${id}/fotos` : `/compromisos/${id}/fotos`;
            const res = await api.get(endpoint);
            const fotosData = res.data;

            if (fotosData.length > 0) {
                const fotosConUrl = await Promise.all(fotosData.map(async (foto) => {
                    try {
                        const fotoEndpoint = isTarea 
                            ? `/tareas/${id}/fotos/${foto.id}` 
                            : `/compromisos/${id}/fotos/${foto.id}`;
                        const r = await api.get(fotoEndpoint, { responseType: 'blob' });
                        return { ...foto, blobUrl: URL.createObjectURL(r.data) };
                    } catch (e) {
                        return null;
                    }
                }));
                setFotos(fotosConUrl.filter(Boolean));
            }
        } catch (err) {
            console.error('Error fetching fotos:', err);
        } finally {
            setLoadingFotos(false);
        }
    };

    const verArchivo = async () => {
        try {
            const endpoint = isTarea ? `/tareas/${id}/soporte` : `/compromisos/${id}/soporte`;
            const res = await api.get(endpoint, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch {
            alert('No se pudo abrir el archivo de soporte');
        }
    };

    const descargarFoto = (foto) => {
        const a = document.createElement('a');
        a.href = foto.blobUrl;
        a.download = foto.nombre_original || `foto_${foto.id}.jpg`;
        a.click();
    };

    const cerrarModal = () => {
        fotos.forEach(f => URL.revokeObjectURL(f.blobUrl));
        onClose();
    };

    const hoy = new Date().toISOString().split('T')[0];
    const vencida = item.estado === 'vencida' ||
        (item.estado === 'pendiente' && (isTarea ? item.fecha_vencimiento : item.fecha_limite) < hoy);

    const cumplidoTarde = isTarea
        ? (item.estado === 'realizado' && item.cerrado_at && item.fecha_vencimiento &&
           new Date(item.cerrado_at) > new Date(String(item.fecha_vencimiento).slice(0, 10) + 'T23:59:59'))
        : (item.estado === 'cumplido' && item.cumplido_at && item.fecha_limite &&
           new Date(item.cumplido_at) > new Date(String(item.fecha_limite).slice(0, 10) + 'T23:59:59'));

    const getStatusInfo = () => {
        if (item.estado === 'vencida' || (vencida && item.estado === 'pendiente'))
            return { label: 'Vencida', gradient: 'from-red-600 to-rose-600', cls: isDark ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-red-100 text-red-700 border-red-200' };

        const estado = item.estado;
        if (estado === 'realizado' || estado === 'cumplido')
            return { label: cumplidoTarde ? 'Completado (fuera de tiempo)' : 'Completado', gradient: cumplidoTarde ? 'from-orange-500 to-amber-600' : 'from-emerald-600 to-teal-600', cls: cumplidoTarde ? (isDark ? 'bg-orange-500/20 text-orange-300 border-orange-500/30' : 'bg-orange-100 text-orange-700 border-orange-200') : (isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-700 border-emerald-200') };

        if (estado === 'cancelado')
            return { label: 'Cancelado', gradient: 'from-gray-500 to-gray-600', cls: isDark ? 'bg-gray-500/20 text-gray-400 border-gray-500/30' : 'bg-gray-100 text-gray-600 border-gray-200' };

        return {
            label: 'Pendiente',
            gradient: 'from-amber-500 to-yellow-500',
            cls: isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-100 text-amber-700 border-amber-200',
        };
    };

    const statusInfo = getStatusInfo();

    const formatDate = (dateStr) => {
        if (!dateStr) return 'No definida';
        try {
            // Limpiar si viene con hora
            const onlyDate = dateStr.split(' ')[0].split('T')[0];
            const date = new Date(onlyDate + 'T00:00:00');
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
        } catch (e) {
            return dateStr;
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={cerrarModal}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />
            
            <div className={`relative w-full max-w-xl max-h-[92vh] flex flex-col rounded-[2rem] shadow-2xl overflow-hidden transform transition-all ${isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white'}`}
                onClick={e => e.stopPropagation()}>

                {/* Banner decorativo superior */}
                <div className={`h-2 w-full flex-shrink-0 bg-gradient-to-r ${statusInfo.gradient}`} />

                <div className="overflow-y-auto flex-1 p-6 sm:p-8">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 mb-6">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                                <div className={`p-2 rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                                    {isTarea ? <ListTodo size={20} className="text-indigo-500" /> : <ClipboardList size={20} className="text-emerald-500" />}
                                </div>
                                <span className={`text-xs font-mono font-bold tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    {numero}
                                </span>
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight border ${statusInfo.cls}`}>
                                    {statusInfo.label}
                                </span>
                            </div>
                            <h3 className={`text-xl sm:text-2xl font-black leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {asunto}
                            </h3>
                        </div>
                        <button onClick={cerrarModal} className={`p-2 rounded-xl transition-all active:scale-95 ${isDark ? 'hover:bg-gray-800 text-gray-500 hover:text-white' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-700'}`}>
                            <X size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Columna Izquierda: Información Principal */}
                        <div className="space-y-6">
                            {/* Descripción */}
                            {(item.descripcion || item.observaciones) && (
                                <div className="space-y-2">
                                    <h4 className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Descripción y Notas</h4>
                                    <div className={`text-sm leading-relaxed p-4 rounded-2xl ${isDark ? 'bg-gray-800/50 text-gray-300' : 'bg-gray-50 text-gray-700'}`}>
                                        {isTarea ? item.descripcion : item.descripcion}
                                        {item.observaciones && (
                                            <div className={`mt-3 pt-3 border-t border-dashed ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                                <p className="italic">{item.observaciones}</p>
                                            </div>
                                        )}
                                        {item.conclusiones && (
                                            <div className={`mt-3 pt-3 border-t border-dashed ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                                                <p className="font-semibold text-emerald-500 mb-1">CONCLUSIONES:</p>
                                                <p>{item.conclusiones}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Meta Info Grid */}
                            <div className="grid grid-cols-1 gap-4">
                                <div className={`flex items-center gap-3 p-3 rounded-2xl border ${isDark ? 'bg-gray-800/30 border-gray-800' : 'bg-white border-gray-100'}`}>
                                    <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                                        <User size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Responsable</p>
                                        <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                            {item.persona ? `${item.persona.nombres} ${item.persona.apellidos}` : 'No asignado'}
                                        </p>
                                    </div>
                                </div>

                                <div className={`flex items-center gap-3 p-3 rounded-2xl border ${isDark ? 'bg-gray-800/30 border-gray-800' : 'bg-white border-gray-100'}`}>
                                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                                        <Building2 size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Dependencia</p>
                                        <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                            {item.dependencia?.nombre || 
                                             item.persona?.funcionario?.dependencia?.nombre || 
                                             item.persona?.contratista?.dependencia?.nombre || 
                                             (isTarea ? '' : item.evento?.tema) || 
                                             'No especificada'}
                                        </p>
                                    </div>
                                </div>

                                <div className={`flex items-center gap-3 p-3 rounded-2xl border ${isDark ? 'bg-gray-800/30 border-gray-800' : 'bg-white border-gray-100'}`}>
                                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                                        <Calendar size={16} />
                                    </div>
                                    <div className="min-w-0">
                                        <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                            {isTarea ? 'Vencimiento' : 'Fecha Límite'}
                                        </p>
                                        <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                            {formatDate(isTarea ? item.fecha_vencimiento : item.fecha_limite)}
                                        </p>
                                    </div>
                                </div>

                                {/* Fecha de cierre */}
                                {(isTarea ? item.cerrado_at : item.cumplido_at) && (
                                    <div className={`flex items-center gap-3 p-3 rounded-2xl border ${
                                        cumplidoTarde
                                            ? isDark ? 'bg-orange-500/10 border-orange-500/20' : 'bg-orange-50 border-orange-200'
                                            : isDark ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-200'
                                    }`}>
                                        <div className={`p-2 rounded-lg ${cumplidoTarde ? 'bg-orange-500/20 text-orange-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
                                            <CheckCircle size={16} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`text-[10px] font-bold uppercase tracking-wider ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                                Fecha de cierre
                                            </p>
                                            <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                                                {(() => {
                                                    const dt = isTarea ? item.cerrado_at : item.cumplido_at;
                                                    if (!dt) return 'No disponible';
                                                    try {
                                                        const d = new Date(dt);
                                                        return d.toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                                                    } catch { return dt; }
                                                })()}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Columna Derecha: Archivos y Evidencias */}
                        <div className="space-y-6">
                            {/* Prioridad (Solo Tareas) */}
                            {isTarea && item.prioridad && (
                                <div className="space-y-2">
                                    <h4 className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Prioridad</h4>
                                    <div className="flex items-center gap-3 p-3 rounded-2xl border" style={{ borderColor: item.prioridad.color + '44', backgroundColor: item.prioridad.color + '11' }}>
                                        <Flag size={16} style={{ color: item.prioridad.color }} />
                                        <span className="text-sm font-bold uppercase tracking-tight" style={{ color: item.prioridad.color }}>{item.prioridad.nombre}</span>
                                    </div>
                                </div>
                            )}

                            {/* Soporte de Cumplimiento */}
                            {(item.soporte_cumplimiento || (isTarea ? item.estado === 'realizado' : item.estado === 'cumplido')) && (
                                <div className="space-y-3">
                                    <h4 className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Soporte</h4>
                                    <button 
                                        onClick={verArchivo}
                                        className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-all group ${isDark ? 'bg-indigo-500/10 border-indigo-500/20 hover:border-indigo-500/50' : 'bg-indigo-50 border-indigo-100 hover:border-indigo-300'}`}
                                    >
                                        <div className="p-2 rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/30">
                                            <Paperclip size={18} />
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <p className={`text-xs font-bold ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>Documento de Soporte</p>
                                            <p className={`text-[10px] truncate ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Clic para ver o descargar</p>
                                        </div>
                                        <Download size={18} className="text-indigo-500 group-hover:scale-110 transition-transform" />
                                    </button>
                                </div>
                            )}

                            {/* Fotos de Evidencia */}
                            <div className="space-y-3">
                                <h4 className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Evidencias Fotográficas</h4>
                                {loadingFotos ? (
                                    <div className="grid grid-cols-3 gap-2 animate-pulse">
                                        {[1, 2, 3].map(i => <div key={i} className={`aspect-square rounded-xl ${isDark ? 'bg-gray-800' : 'bg-gray-100'}`} />)}
                                    </div>
                                ) : fotos.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        {fotos.map((foto, idx) => (
                                            <div key={foto.id} className="relative aspect-square rounded-xl overflow-hidden group hover:ring-2 hover:ring-indigo-500 transition-all">
                                                <button onClick={() => setFotoActiva(idx)} className="absolute inset-0 w-full h-full">
                                                    <img src={foto.blobUrl} className="w-full h-full object-cover transition duration-500 group-hover:scale-110" />
                                                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Camera size={20} className="text-white" />
                                                    </div>
                                                </button>
                                                <button onClick={e => { e.stopPropagation(); descargarFoto(foto); }} title="Descargar foto" className="absolute top-1 right-1 p-1 rounded-lg bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                    <Download size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={`flex flex-col items-center justify-center py-8 rounded-2xl border-2 border-dashed ${isDark ? 'border-gray-800 bg-gray-800/20' : 'border-gray-100 bg-gray-50'}`}>
                                        <Camera size={24} className="text-gray-400 mb-2" />
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center px-4">Sin fotos de evidencia cargadas</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Acción: marcar como cumplida (solo si pendiente/vencida y el padre lo permite) */}
                {onCumplir && ['pendiente', 'vencida'].includes(item.estado) && (
                    <div className="mt-6 pt-4 border-t border-dashed" style={{ borderColor: isDark ? '#374151' : '#e5e7eb' }}>
                        <button
                            onClick={() => { cerrarModal(); onCumplir(); }}
                            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white transition shadow-lg shadow-emerald-500/20"
                        >
                            <CheckCheck size={18} />
                            {tipo === 'tarea' ? 'Marcar como realizada' : 'Marcar como cumplido'}
                        </button>
                    </div>
                )}
            </div>

            {/* Lightbox */}
            {fotoActiva !== null && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.95)' }} onClick={() => setFotoActiva(null)}>
                    <button onClick={() => descargarFoto(fotos[fotoActiva])} title="Descargar foto" className="absolute top-6 right-20 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all">
                        <Download size={20} />
                    </button>
                    <button className="absolute top-6 right-6 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all">
                        <X size={24} />
                    </button>
                    
                    {fotoActiva > 0 && (
                        <button onClick={e => { e.stopPropagation(); setFotoActiva(i => i - 1); }}
                            className="absolute left-4 p-3 rounded-full bg-white/5 text-white hover:bg-white/15 transition-all">
                            <ChevronLeft size={32} />
                        </button>
                    )}

                    <img src={fotos[fotoActiva].blobUrl} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl select-none" 
                        onClick={e => e.stopPropagation()} />

                    {fotoActiva < fotos.length - 1 && (
                        <button onClick={e => { e.stopPropagation(); setFotoActiva(i => i + 1); }}
                            className="absolute right-4 p-3 rounded-full bg-white/5 text-white hover:bg-white/15 transition-all">
                            <ChevronRight size={32} />
                        </button>
                    )}

                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 text-white text-xs font-bold tracking-widest uppercase">
                        {fotoActiva + 1} / {fotos.length}
                    </div>
                </div>
            )}
        </div>
    );
}
