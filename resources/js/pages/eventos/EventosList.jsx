// resources/js/pages/eventos/EventosList.jsx
import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import ModalFinalizar from '../../components/ModalFinalizar';
import ModalExito from '../../components/ModalExito';
import DependenciasCell from '../../components/DependenciasCell';
import EventoDetalleModal from '../../components/EventoDetalleModal';
import api from '../../api/axios';
import storage from '../../api/storage';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';
import { useDebounce } from '../../hooks/useDebounce';
import {
    Plus, Search, Calendar, Clock, Building2, User, Edit, Trash2,
    Filter, X, Circle, CheckCircle, XCircle, Eye, FileText, Users,
    Flag, PlayCircle, Lock, Camera, ChevronLeft, ChevronRight, Download
} from 'lucide-react';

const toLocalDate = (s) => s ? new Date(s.slice(0, 16)) : new Date();

export default function EventosList() {
    const navigate = useNavigate();
    const { isDark } = useTheme();
    const user = JSON.parse(storage.get('user') || '{}');

    const [eventos, setEventos] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
    const [loading, setLoading] = useState(true);
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [busqueda, setBusqueda] = useState('');
    const debouncedBusqueda = useDebounce(busqueda);
    const [eventoAsistencia, setEventoAsistencia] = useState(null);
    const [eventoFinalizar, setEventoFinalizar] = useState(null);
    const [mostrarExitoFinalizar, setMostrarExitoFinalizar] = useState(false);
    const [eventoFotos, setEventoFotos] = useState(null);
    const [fotoActiva, setFotoActiva] = useState(null);
    const [eventoSeleccionado, setEventoSeleccionado] = useState(null);

    useEffect(() => { fetchEventos(1); }, [debouncedBusqueda, filtroEstado]);

    const fetchEventos = async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', page);
            params.append('per_page', pagination.per_page);
            if (filtroEstado !== 'todos') params.append('estado', filtroEstado);
            if (debouncedBusqueda) params.append('search', debouncedBusqueda);
            const res = await api.get(`/eventos?${params.toString()}`);
            setEventos(res.data.data);
            setPagination(prev => ({ ...prev, current_page: res.data.current_page, last_page: res.data.last_page, total: res.data.total }));
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const goToPage = (page) => {
        if (page >= 1 && page <= pagination.last_page) fetchEventos(page);
    };

    const handleCancelar = async (id) => {
        if (!confirm('¿Cancelar este evento?')) return;
        try {
            await api.delete(`/eventos/${id}`);
            fetchEventos();
        } catch (err) {
            console.error(err);
        }
    };

    const verArchivo = async (eventoId, tipo) => {
        try {
            const res = await api.get(`/eventos/${eventoId}/${tipo}`, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch {
            alert('No se pudo abrir el archivo');
        }
    };

    const verFotos = async (evento) => {
        setEventoFotos({ eventoId: evento.id, tema: evento.tema, fotos: [], loading: true });
        try {
            const res = await api.get(`/eventos/${evento.id}/fotos`);
            const fotos = res.data;
            if (!fotos.length) { setEventoFotos(p => ({ ...p, loading: false })); return; }
            const fotosConUrl = await Promise.all(fotos.map(async (foto) => {
                try {
                    const r = await api.get(`/eventos/${evento.id}/fotos/${foto.id}`, { responseType: 'blob' });
                    return { ...foto, blobUrl: URL.createObjectURL(r.data) };
                } catch { return null; }
            }));
            setEventoFotos(p => ({ ...p, fotos: fotosConUrl.filter(Boolean), loading: false }));
        } catch {
            setEventoFotos(p => ({ ...p, loading: false }));
        }
    };

    const cerrarFotos = () => {
        eventoFotos?.fotos.forEach(f => URL.revokeObjectURL(f.blobUrl));
        setEventoFotos(null);
        setFotoActiva(null);
    };

    const descargarFoto = (foto, e) => {
        e?.stopPropagation();
        const a = document.createElement('a');
        a.href = foto.blobUrl;
        a.download = foto.nombre_original || `foto_${foto.id}.jpg`;
        a.click();
    };

    // Polling para actualizar asistencia en tiempo real
    useEffect(() => {
        if (!eventoAsistencia) return;
        const interval = setInterval(async () => {
            try {
                const res = await api.get(`/eventos/${eventoAsistencia.id}`);
                setEventoAsistencia(res.data);
            } catch (err) {
                console.error('Error actualizando asistencia:', err);
            }
        }, 3000); // Actualizar cada 3 segundos
        return () => clearInterval(interval);
    }, [eventoAsistencia?.id]);

    useEffect(() => {
        if (fotoActiva === null || !eventoFotos?.fotos.length) return;
        const total = eventoFotos.fotos.length;
        const handler = (e) => {
            if (e.key === 'ArrowLeft')  setFotoActiva(i => Math.max(0, i - 1));
            if (e.key === 'ArrowRight') setFotoActiva(i => Math.min(total - 1, i + 1));
            if (e.key === 'Escape')     setFotoActiva(null);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [fotoActiva, eventoFotos]);

    const puedeFinalizarEvento = (evento) => {
        if (!['en_curso', 'cerrado'].includes(evento.estado)) return false;
        if (['admin', 'super_admin', 'digitador'].includes(user?.rol)) return true;
        return user?.persona_id && Number(user.persona_id) === Number(evento.responsable_id);
    };

    const irAlCalendario = (evento) =>
        navigate(`/calendario?fecha=${evento.fecha_hora?.slice(0, 10)}`);

    const puedeEditar = (evento) => !['cerrado', 'cancelado', 'finalizado'].includes(evento.estado);
    const puedeCancelar = (evento) => !['cerrado', 'cancelado', 'finalizado', 'en_curso'].includes(evento.estado)
        && ['admin', 'super_admin', 'digitador'].includes(user?.rol);


    const badgeEstado = (estado) => {
        const config = {
            programado: {
                bg: isDark ? 'bg-blue-500/20' : 'bg-blue-100',
                text: isDark ? 'text-blue-300' : 'text-blue-700',
                icon: <Circle size={10} className="fill-current" />,
                label: 'Programado',
            },
            en_curso: {
                bg: isDark ? 'bg-indigo-500/20' : 'bg-indigo-100',
                text: isDark ? 'text-indigo-300' : 'text-indigo-700',
                icon: <PlayCircle size={10} />,
                label: 'En curso',
            },
            finalizado: {
                bg: isDark ? 'bg-emerald-500/20' : 'bg-emerald-100',
                text: isDark ? 'text-emerald-300' : 'text-emerald-700',
                icon: <CheckCircle size={10} />,
                label: 'Finalizado',
            },
            cerrado: {
                bg: isDark ? 'bg-gray-500/20' : 'bg-gray-100',
                text: isDark ? 'text-gray-400' : 'text-gray-600',
                icon: <Lock size={10} />,
                label: 'Cerrado',
            },
            aplazado: {
                bg: isDark ? 'bg-yellow-500/20' : 'bg-yellow-100',
                text: isDark ? 'text-yellow-300' : 'text-yellow-700',
                icon: <Clock size={10} />,
                label: 'Aplazado',
            },
            cancelado: {
                bg: isDark ? 'bg-red-500/20' : 'bg-red-100',
                text: isDark ? 'text-red-300' : 'text-red-700',
                icon: <XCircle size={10} />,
                label: 'Cancelado',
            },
        };
        const c = config[estado] ?? config.programado;
        return (
            <span className={`${c.bg} ${c.text} px-2.5 py-1 rounded-full text-xs font-medium inline-flex items-center gap-1.5`}>
                {c.icon}
                {c.label}
            </span>
        );
    };

    const estados = [
        { value: 'todos',      label: 'Todos',      icon: <Filter size={14} /> },
        { value: 'programado', label: 'Programado',  icon: <Circle size={14} /> },
        { value: 'en_curso',   label: 'En curso',    icon: <PlayCircle size={14} /> },
        { value: 'finalizado', label: 'Finalizado',  icon: <CheckCircle size={14} /> },
        { value: 'cerrado',    label: 'Cerrado',     icon: <Lock size={14} /> },
        { value: 'aplazado',   label: 'Aplazado',    icon: <Clock size={14} /> },
        { value: 'cancelado',  label: 'Cancelado',   icon: <XCircle size={14} /> },
    ];

    const AsistenciaContadores = ({ evento }) => {
        const invitados = evento.invitados ?? [];
        if (invitados.length === 0) return <span className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>—</span>;
        const conf = invitados.filter(i => i.confirmacion === 'confirmado').length;
        const rech = invitados.filter(i => i.confirmacion === 'rechazado').length;
        const pend = invitados.filter(i => i.confirmacion === 'pendiente' || !i.confirmacion).length;
        return (
            <button onClick={() => setEventoAsistencia(evento)} className="flex items-center gap-1.5 group" title="Ver detalle de asistencia">
                {conf > 0 && (
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold ${isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700'}`}>
                        <CheckCircle size={10} /> {conf}
                    </span>
                )}
                {rech > 0 && (
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold ${isDark ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-700'}`}>
                        <XCircle size={10} /> {rech}
                    </span>
                )}
                {pend > 0 && (
                    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-semibold ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                        <Circle size={10} /> {pend}
                    </span>
                )}
            </button>
        );
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Calendar size={24} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Eventos</h2>
                        </div>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Gestiona todos los eventos programados</p>
                    </div>
                    {['digitador', 'admin', 'super_admin'].includes(user?.rol) && (
                        <button
                            onClick={() => navigate('/eventos/nuevo')}
                            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-md transition-all transform hover:scale-[1.02]"
                        >
                            <Plus size={18} /> Nuevo Evento
                        </button>
                    )}
                </div>

                {/* Filtros y búsqueda */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 relative">
                        <Search size={18} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                        <input
                            type="text"
                            placeholder="Buscar por tema o responsable..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                            className={`w-full pl-10 pr-10 py-2.5 rounded-xl text-sm transition border focus:outline-none ${isDark ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500'}`}
                        />
                        {busqueda && (
                            <button onClick={() => setBusqueda('')} className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
                                <X size={16} />
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {estados.map(estado => (
                            <button
                                key={estado.value}
                                onClick={() => setFiltroEstado(estado.value)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                                    filtroEstado === estado.value
                                        ? isDark ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-indigo-600 text-white shadow-sm'
                                        : isDark ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                }`}
                            >
                                {estado.icon} {estado.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tabla */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent"></div>
                    </div>
                ) : (
                    <div className={`rounded-2xl shadow-lg overflow-hidden transition ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'}`}>
                        {/* Desktop */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className={isDark ? 'bg-gray-900/50 border-b border-gray-700' : 'bg-gray-50 border-b border-gray-200'}>
                                    <tr>
                                        {['No.', 'Tema', 'Fecha/Hora', 'Dependencia', 'Responsable', 'Estado', 'Asistencia', 'Acciones'].map(h => (
                                            <th key={h} className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {eventos.map((e) => (
                                        <tr key={e.id} className={`border-b transition ${isDark ? 'border-gray-700 hover:bg-gray-700/50' : 'border-gray-100 hover:bg-gray-50'}`}>
                                            <td className={`px-4 py-3 font-mono text-xs whitespace-nowrap ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{e.numero || `EV-${e.id}`}</td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => setEventoSeleccionado(e)}
                                                    className={`font-medium text-left hover:underline transition ${isDark ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-700 hover:text-indigo-900'}`}
                                                    title="Ver detalle del evento"
                                                >
                                                    {e.tema}
                                                </button>
                                            </td>
                                            <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                <div>{toLocalDate(e.fecha_hora).toLocaleDateString('es-CO')}</div>
                                                <div className="text-xs opacity-75">{toLocalDate(e.fecha_hora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>
                                            <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                <DependenciasCell dependencias={e.dependencias} max={2} />
                                            </td>
                                            <td className={`px-4 py-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{e.responsable ? `${e.responsable.nombre ?? ''} ${e.responsable.apellido ?? ''}`.trim() : '-'}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex flex-col gap-1">
                                                    {badgeEstado(e.estado)}
                                                    {e.en_destiempo && (
                                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${isDark ? 'bg-orange-500/20 text-orange-300' : 'bg-orange-100 text-orange-700'}`}>
                                                            Destiempo
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3"><AsistenciaContadores evento={e} /></td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-1.5">
                                                    {/* Finalizar / Registrar en destiempo */}
                                                    {puedeFinalizarEvento(e) && (
                                                        <button
                                                            onClick={() => setEventoFinalizar(e)}
                                                            className={`p-1.5 rounded-lg transition ${e.estado === 'cerrado' ? (isDark ? 'hover:bg-orange-900/30 text-orange-400 hover:text-orange-300' : 'hover:bg-orange-50 text-orange-500 hover:text-orange-600') : (isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-emerald-400' : 'hover:bg-gray-100 text-gray-500 hover:text-emerald-600')}`}
                                                            title={e.estado === 'cerrado' ? 'Registrar evidencias en destiempo' : 'Finalizar evento'}
                                                        >
                                                            <Flag size={16} />
                                                        </button>
                                                    )}
                                                    {/* Editar */}
                                                    {puedeEditar(e) && (
                                                        <button
                                                            onClick={() => navigate(`/eventos/${e.id}/editar`)}
                                                            className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-indigo-400' : 'hover:bg-gray-100 text-gray-500 hover:text-indigo-600'}`}
                                                            title="Editar"
                                                        >
                                                            <Edit size={16} />
                                                        </button>
                                                    )}
                                                    {e.documento_soporte && (
                                                        <button onClick={() => verArchivo(e.id, 'documento-soporte')} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-blue-400' : 'hover:bg-gray-100 text-gray-500 hover:text-blue-600'}`} title="Ver documento soporte">
                                                            <Eye size={16} />
                                                        </button>
                                                    )}
                                                    {e.acta_reunion && (
                                                        <button onClick={() => verArchivo(e.id, 'acta-reunion')} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-emerald-400' : 'hover:bg-gray-100 text-gray-500 hover:text-emerald-600'}`} title="Ver acta de reunión">
                                                            <FileText size={16} />
                                                        </button>
                                                    )}
                                                    {e.lista_asistencia && (
                                                        <button onClick={() => verArchivo(e.id, 'lista-asistencia')} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-purple-400' : 'hover:bg-gray-100 text-gray-500 hover:text-purple-600'}`} title="Ver lista de asistencia">
                                                            <Users size={16} />
                                                        </button>
                                                    )}
                                                    {['finalizado', 'cerrado'].includes(e.estado) && (
                                                        <button onClick={() => verFotos(e)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-amber-400' : 'hover:bg-gray-100 text-gray-500 hover:text-amber-600'}`} title="Ver fotos de evidencia">
                                                            <Camera size={16} />
                                                        </button>
                                                    )}
                                                    {/* Cancelar */}
                                                    {puedeCancelar(e) && (
                                                        <button onClick={() => handleCancelar(e.id)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-red-400' : 'hover:bg-gray-100 text-gray-500 hover:text-red-600'}`} title="Cancelar evento">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {eventos.length === 0 && (
                                        <tr>
                                            <td colSpan="8" className={`px-4 py-12 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                <Calendar size={48} className={`mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                                                <p>No hay eventos registrados</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
                            {eventos.map((e) => (
                                <div key={e.id} className={`p-4 ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <button
                                                onClick={() => setEventoSeleccionado(e)}
                                                className={`font-semibold text-left hover:underline transition ${isDark ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-700 hover:text-indigo-900'}`}
                                                title="Ver detalle del evento"
                                            >
                                                {e.tema}
                                            </button>
                                            <p className={`text-xs font-mono mt-0.5 whitespace-nowrap ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{e.numero || `EV-${e.id}`}</p>
                                        </div>
                                        {badgeEstado(e.estado)}
                                    </div>
                                    <div className="space-y-1.5 mt-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Clock size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                                            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>{toLocalDate(e.fecha_hora).toLocaleDateString('es-CO')} - {toLocalDate(e.fecha_hora).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <Building2 size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                                            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>
                                                <DependenciasCell dependencias={e.dependencias} max={1} />
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <User size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} />
                                            <span className={isDark ? 'text-gray-400' : 'text-gray-600'}>{e.responsable ? `${e.responsable.nombre ?? ''} ${e.responsable.apellido ?? ''}`.trim() : '-'}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-3 mt-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                                        {puedeFinalizarEvento(e) && (
                                            <button onClick={() => setEventoFinalizar(e)} className={`flex items-center gap-1 text-sm font-medium transition ${e.estado === 'cerrado' ? (isDark ? 'text-orange-400 hover:text-orange-300' : 'text-orange-600 hover:text-orange-700') : (isDark ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700')}`}>
                                                <Flag size={14} /> {e.estado === 'cerrado' ? 'Registrar en destiempo' : 'Finalizar'}
                                            </button>
                                        )}
                                        {puedeEditar(e) && (
                                            <button onClick={() => navigate(`/eventos/${e.id}/editar`)} className={`flex items-center gap-1 text-sm font-medium transition ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}>
                                                <Edit size={14} /> Editar
                                            </button>
                                        )}
                                        {e.documento_soporte && (
                                            <button onClick={() => verArchivo(e.id, 'documento-soporte')} className={`flex items-center gap-1 text-sm font-medium transition ${isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'}`}>
                                                <Eye size={14} /> Doc. soporte
                                            </button>
                                        )}
                                        {e.acta_reunion && (
                                            <button onClick={() => verArchivo(e.id, 'acta-reunion')} className={`flex items-center gap-1 text-sm font-medium transition ${isDark ? 'text-emerald-400 hover:text-emerald-300' : 'text-emerald-600 hover:text-emerald-700'}`}>
                                                <FileText size={14} /> Acta reunión
                                            </button>
                                        )}
                                        {e.lista_asistencia && (
                                            <button onClick={() => verArchivo(e.id, 'lista-asistencia')} className={`flex items-center gap-1 text-sm font-medium transition ${isDark ? 'text-purple-400 hover:text-purple-300' : 'text-purple-600 hover:text-purple-700'}`}>
                                                <Users size={14} /> Lista asistencia
                                            </button>
                                        )}
                                        {['finalizado', 'cerrado'].includes(e.estado) && (
                                            <button onClick={() => verFotos(e)} className={`flex items-center gap-1 text-sm font-medium transition ${isDark ? 'text-amber-400 hover:text-amber-300' : 'text-amber-600 hover:text-amber-700'}`}>
                                                <Camera size={14} /> Fotos
                                            </button>
                                        )}
                                        {puedeCancelar(e) && (
                                            <button onClick={() => handleCancelar(e.id)} className={`flex items-center gap-1 text-sm font-medium transition ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}>
                                                <Trash2 size={14} /> Cancelar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {eventos.length === 0 && (
                                <div className={`p-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <Calendar size={48} className={`mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                                    <p>No hay eventos registrados</p>
                                </div>
                            )}
                        </div>

                        {pagination.last_page > 1 && (
                            <div className={`px-6 py-4 border-t flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                <button onClick={() => goToPage(pagination.current_page - 1)} disabled={pagination.current_page === 1}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50'}`}>
                                    <ChevronLeft size={16} /> Anterior
                                </button>
                                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Página {pagination.current_page} de {pagination.last_page} · {pagination.total} eventos
                                </span>
                                <button onClick={() => goToPage(pagination.current_page + 1)} disabled={pagination.current_page === pagination.last_page}
                                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50'}`}>
                                    Siguiente <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal asistencia */}
            {eventoAsistencia && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
                        <div className={`px-6 py-4 border-b flex items-start justify-between gap-3 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                    <Users size={16} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                    <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>Asistencia al evento</h3>
                                </div>
                                <p className={`text-xs truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{eventoAsistencia.tema}</p>
                            </div>
                            <button onClick={() => setEventoAsistencia(null)} className={`text-xl leading-none px-2 py-1 rounded-lg flex-shrink-0 ${isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'}`}>×</button>
                        </div>
                        {(() => {
                            const invitados = eventoAsistencia.invitados ?? [];
                            const conf = invitados.filter(i => i.confirmacion === 'confirmado');
                            const rech = invitados.filter(i => i.confirmacion === 'rechazado');
                            const pend = invitados.filter(i => !i.confirmacion || i.confirmacion === 'pendiente');
                            if (invitados.length === 0) return (
                                <div className={`px-6 py-10 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <Users size={32} className="mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Este evento no tiene invitados</p>
                                </div>
                            );
                            const Seccion = ({ titulo, lista, bgBadge, textBadge, icono }) => lista.length === 0 ? null : (
                                <div>
                                    <div className={`flex items-center gap-2 px-6 py-2 ${isDark ? 'bg-gray-900/40' : 'bg-gray-50'}`}>
                                        {icono}
                                        <span className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{titulo}</span>
                                        <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${bgBadge} ${textBadge}`}>{lista.length}</span>
                                    </div>
                                    <ul className="divide-y divide-dashed">
                                        {lista.map(inv => (
                                            <li key={inv.id} className={`px-6 py-2.5 flex items-center gap-3 ${isDark ? 'divide-gray-700/50' : 'divide-gray-100'}`}>
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                                    {(inv.persona?.nombres?.[0] ?? '?').toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{inv.persona?.nombres} {inv.persona?.apellidos}</p>
                                                    {inv.confirmado_at && (
                                                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{toLocalDate(inv.confirmado_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            );
                            return (
                                <div className="max-h-96 overflow-y-auto">
                                    <Seccion titulo="Confirmaron asistencia" lista={conf} bgBadge={isDark ? 'bg-emerald-900/40' : 'bg-emerald-100'} textBadge={isDark ? 'text-emerald-400' : 'text-emerald-700'} icono={<CheckCircle size={13} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />} />
                                    <Seccion titulo="Rechazaron" lista={rech} bgBadge={isDark ? 'bg-red-900/40' : 'bg-red-100'} textBadge={isDark ? 'text-red-400' : 'text-red-700'} icono={<XCircle size={13} className={isDark ? 'text-red-400' : 'text-red-600'} />} />
                                    <Seccion titulo="Sin respuesta" lista={pend} bgBadge={isDark ? 'bg-gray-700' : 'bg-gray-100'} textBadge={isDark ? 'text-gray-400' : 'text-gray-500'} icono={<Circle size={13} className={isDark ? 'text-gray-500' : 'text-gray-400'} />} />
                                </div>
                            );
                        })()}
                        <div className={`px-6 py-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <button onClick={() => setEventoAsistencia(null)} className={`w-full py-2 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal fotos de evidencia */}
            {eventoFotos && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <div className={`w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
                        <div className={`px-6 py-4 border-b flex items-center justify-between flex-shrink-0 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${isDark ? 'bg-amber-500/20' : 'bg-amber-100'}`}>
                                    <Camera size={18} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
                                </div>
                                <div>
                                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>Fotos de evidencia</h3>
                                    <p className={`text-xs truncate max-w-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{eventoFotos.tema}</p>
                                </div>
                            </div>
                            <button onClick={cerrarFotos} className={`p-1.5 rounded-lg transition ${isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'}`}>
                                <X size={18} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            {eventoFotos.loading ? (
                                <div className="flex items-center justify-center py-16">
                                    <div className="animate-spin rounded-full h-8 w-8 border-4 border-amber-500 border-t-transparent" />
                                </div>
                            ) : eventoFotos.fotos.length === 0 ? (
                                <div className={`text-center py-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <Camera size={40} className="mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">Este evento no tiene fotos de evidencia</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {eventoFotos.fotos.map((foto, idx) => (
                                        <div key={foto.id} className="relative aspect-square rounded-xl overflow-hidden group">
                                            <button type="button" onClick={() => setFotoActiva(idx)} className="absolute inset-0 w-full h-full" title={foto.nombre_original}>
                                                <img src={foto.blobUrl} alt={foto.nombre_original} className="w-full h-full object-cover transition group-hover:scale-105" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition" />
                                            </button>
                                            <button type="button" onClick={e => descargarFoto(foto, e)} title="Descargar foto"
                                                className="absolute top-1.5 right-1.5 p-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <Download size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox fotos */}
            {eventoFotos && fotoActiva !== null && (() => {
                const fotos = eventoFotos.fotos;
                const foto = fotos[fotoActiva];
                return (
                    <div
                        className="fixed inset-0 flex items-center justify-center"
                        style={{ zIndex: 60, backgroundColor: 'rgba(0,0,0,0.93)' }}
                        onClick={() => setFotoActiva(null)}
                    >
                        {/* Flecha izquierda */}
                        {fotoActiva > 0 && (
                            <button
                                onClick={e => { e.stopPropagation(); setFotoActiva(i => i - 1); }}
                                className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition"
                            >
                                <ChevronLeft size={28} />
                            </button>
                        )}

                        {/* Imagen */}
                        <img
                            src={foto.blobUrl}
                            alt={foto.nombre_original}
                            className="max-w-[88vw] max-h-[88vh] object-contain rounded-xl shadow-2xl select-none"
                            onClick={e => e.stopPropagation()}
                        />

                        {/* Flecha derecha */}
                        {fotoActiva < fotos.length - 1 && (
                            <button
                                onClick={e => { e.stopPropagation(); setFotoActiva(i => i + 1); }}
                                className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition"
                            >
                                <ChevronRight size={28} />
                            </button>
                        )}

                        {/* Descargar */}
                        <button
                            onClick={e => { e.stopPropagation(); descargarFoto(foto); }}
                            title="Descargar foto"
                            className="absolute top-4 right-16 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition"
                        >
                            <Download size={20} />
                        </button>

                        {/* Cerrar */}
                        <button
                            onClick={() => setFotoActiva(null)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition"
                        >
                            <X size={20} />
                        </button>

                        {/* Contador */}
                        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-white/60 text-sm font-medium">
                            {fotoActiva + 1} / {fotos.length}
                        </div>
                    </div>
                );
            })()}

            {/* Modal finalizar */}
            {eventoFinalizar && (
                <ModalFinalizar
                    evento={eventoFinalizar}
                    onClose={() => setEventoFinalizar(null)}
                    onFinalizado={() => { setEventoFinalizar(null); fetchEventos(); setMostrarExitoFinalizar(true); }}
                />
            )}

            {mostrarExitoFinalizar && (
                <ModalExito
                    titulo="¡Evento finalizado!"
                    mensaje="El evento fue finalizado correctamente. Los documentos y evidencias quedaron registrados."
                    onClose={() => setMostrarExitoFinalizar(false)}
                />
            )}

            {eventoSeleccionado && (
                <EventoDetalleModal
                    evento={eventoSeleccionado}
                    onClose={() => setEventoSeleccionado(null)}
                />
            )}
        </Layout>
    );
}
