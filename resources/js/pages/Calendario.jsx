// resources/js/pages/Calendario.jsx
import React, { useRef, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import CalendarioWidget from '../components/CalendarioWidget';
import EventoModal from '../components/EventoModal';
import TareaDetalleModal from '../components/TareaDetalleModal';
import ModalAvisoFecha from '../components/ModalAvisoFecha';
import { useTheme } from '../hooks/useTheme';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, Filter, Plus, ChevronDown, Clock, CheckCircle, XCircle, ListTodo, AlertCircle } from 'lucide-react';

export default function Calendario() {
    const { isDark } = useTheme();
    const [searchParams] = useSearchParams();
    const fechaInicial = searchParams.get('fecha') || undefined;
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filtroTipo, setFiltroTipo] = useState('todos');
    const [filtroEstado, setFiltroEstado] = useState('todos');
    const [modalAbierto, setModalAbierto] = useState(false);
    const [fechaSeleccionada, setFechaSeleccionada] = useState(null);
    const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
    const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const [showAvisoFecha, setShowAvisoFecha] = useState(false);

    const dateRangeRef = useRef(null);

    const fetchEvents = async (startStr, endStr) => {
        setLoading(true);
        try {
            const [eventosRes, tareasRes] = await Promise.all([
                api.get('/eventos', { params: { fecha_inicio: startStr, fecha_fin: endStr, per_page: 500 } }),
                api.get('/tareas'),
            ]);

            const eventosArr = eventosRes.data.data ?? eventosRes.data;
            const tareasArr = tareasRes.data.data ?? tareasRes.data;

            const eventosCalendar = eventosArr.map(e => ({
                id: `evento-${e.id}`,
                title: e.tema,
                start: e.fecha_hora?.slice(0, 16),
                backgroundColor: colorEstado(e.estado),
                borderColor: 'transparent',
                textColor: '#fff',
                extendedProps: { tipo: 'evento', data: e },
            }));

            const tareasCalendar = tareasArr.map(t => ({
                id: `tarea-${t.id}`,
                title: t.asunto,
                start: t.fecha_hora?.slice(0, 16),
                extendedProps: { tipo: 'tarea', data: t },
            }));

            setEvents([...eventosCalendar, ...tareasCalendar]);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDatesSet = (info) => {
        dateRangeRef.current = { startStr: info.startStr, endStr: info.endStr };
        fetchEvents(info.startStr, info.endStr);
    };

    const colorEstado = (estado) => {
        switch (estado) {
            case 'programado':  return '#3B82F6';
            case 'en_curso':    return '#6366F1';
            case 'finalizado':  return '#10B981';
            case 'cerrado':     return '#6B7280';
            case 'aplazado':    return '#F59E0B';
            case 'cancelado':   return '#EF4444';
            default:            return '#3B82F6';
        }
    };

    const handleDateClick = (info) => {
        const hoyStr = new Date().toLocaleDateString('en-CA');
        if (info.dateStr < hoyStr) {
            setShowAvisoFecha(true);
            return;
        }

        setFechaSeleccionada(info.dateStr);
        setEventoSeleccionado(null);
        setModalAbierto(true);
    };

    const handleEventClick = (info) => {
        const { tipo, data } = info.event.extendedProps;
        if (tipo === 'evento') {
            setEventoSeleccionado(data);
            setFechaSeleccionada(null);
            setModalAbierto(true);
        } else if (tipo === 'tarea') {
            setTareaSeleccionada({ tipo: 'tarea', item: data });
        }
    };

    const handleModalClose = () => {
        setModalAbierto(false);
        setEventoSeleccionado(null);
        setFechaSeleccionada(null);
    };

    const handleEventoGuardado = () => {
        handleModalClose();
        if (dateRangeRef.current) {
            fetchEvents(dateRangeRef.current.startStr, dateRangeRef.current.endStr);
        }
    };

    const eventosFiltrados = events.filter(e => {
        const tipoOk = filtroTipo === 'todos' || e.extendedProps.tipo === filtroTipo;
        const estadoOk = filtroEstado === 'todos' || e.extendedProps.data?.estado === filtroEstado;
        return tipoOk && estadoOk;
    });

    const leyendaItems = [
        { color: 'bg-blue-500',   label: 'Programado', icon: <Clock size={12} /> },
        { color: 'bg-indigo-500', label: 'En curso',   icon: <CheckCircle size={12} /> },
        { color: 'bg-emerald-500',label: 'Finalizado', icon: <CheckCircle size={12} /> },
        { color: 'bg-gray-400',   label: 'Cerrado',    icon: <XCircle size={12} /> },
        { color: 'bg-amber-500',  label: 'Aplazado',   icon: <Clock size={12} /> },
        { color: 'bg-red-500',    label: 'Cancelado',  icon: <XCircle size={12} /> },
        { color: 'bg-amber-400',  label: 'Tarea',      icon: <ListTodo size={12} /> },
    ];

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <CalendarDays size={24} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                Calendario
                            </h2>
                        </div>
                        <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Gestiona tus eventos y tareas de manera visual
                        </p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setMostrarFiltros(!mostrarFiltros)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${
                                isDark 
                                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700' 
                                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                            }`}
                        >
                            <Filter size={16} />
                            Filtros
                            <ChevronDown size={14} className={`transform transition-transform ${mostrarFiltros ? 'rotate-180' : ''}`} />
                        </button>
                        <button
                            onClick={() => { 
                                setFechaSeleccionada(new Date().toLocaleDateString('en-CA')); 
                                setModalAbierto(true); 
                            }}
                            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-md transition-all transform hover:scale-[1.02]"
                        >
                            <Plus size={16} /> Nuevo evento
                        </button>
                    </div>
                </div>

                {/* Panel de filtros */}
                {mostrarFiltros && (
                    <div className={`rounded-2xl p-4 transition-all ${
                        isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200 shadow-sm'
                    }`}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={`block text-xs font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    <CalendarDays size={12} />
                                    Tipo de contenido
                                </label>
                                <select 
                                    value={filtroTipo} 
                                    onChange={e => setFiltroTipo(e.target.value)}
                                    className={`w-full rounded-xl px-3 py-2 text-sm transition ${
                                        isDark 
                                            ? 'bg-gray-900 border-gray-700 text-white focus:ring-2 focus:ring-indigo-500' 
                                            : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-indigo-500'
                                    }`}
                                >
                                    <option value="todos">Todos los tipos</option>
                                    <option value="evento">Eventos</option>
                                    <option value="tarea">Tareas</option>
                                </select>
                            </div>
                            <div>
                                <label className={`block text-xs font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                    <AlertCircle size={12} />
                                    Estado
                                </label>
                                <select 
                                    value={filtroEstado} 
                                    onChange={e => setFiltroEstado(e.target.value)}
                                    className={`w-full rounded-xl px-3 py-2 text-sm transition ${
                                        isDark 
                                            ? 'bg-gray-900 border-gray-700 text-white focus:ring-2 focus:ring-indigo-500' 
                                            : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-indigo-500'
                                    }`}
                                >
                                    <option value="todos">Todos los estados</option>
                                    <option value="programado">Programado</option>
                                    <option value="en_curso">En curso</option>
                                    <option value="finalizado">Finalizado</option>
                                    <option value="cerrado">Cerrado</option>
                                    <option value="aplazado">Aplazado</option>
                                    <option value="cancelado">Cancelado</option>
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Leyenda */}
                <div className="flex flex-wrap gap-2">
                    {leyendaItems.map(item => (
                        <div key={item.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition ${
                            isDark 
                                ? 'bg-gray-800/50 border border-gray-700' 
                                : 'bg-white border border-gray-200 shadow-sm'
                        }`}>
                            <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                            <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>{item.label}</span>
                        </div>
                    ))}
                </div>

                {/* Calendario */}
                <CalendarioWidget
                    events={eventosFiltrados}
                    onDateClick={handleDateClick}
                    onEventClick={handleEventClick}
                    onDatesSet={handleDatesSet}
                    loading={loading}
                    initialDate={fechaInicial}
                />
            </div>

            {modalAbierto && (
                <EventoModal
                    fecha={fechaSeleccionada}
                    evento={eventoSeleccionado}
                    onClose={handleModalClose}
                    onGuardado={handleEventoGuardado}
                />
            )}

            {tareaSeleccionada && (
                <TareaDetalleModal
                    item={tareaSeleccionada.item}
                    tipo={tareaSeleccionada.tipo}
                    onClose={() => setTareaSeleccionada(null)}
                />
            )}

            <ModalAvisoFecha 
                isOpen={showAvisoFecha} 
                onClose={() => setShowAvisoFecha(false)} 
            />
        </Layout>
    );
}