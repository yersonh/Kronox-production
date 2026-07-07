import { useState } from 'react'
import { Marker, Popup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import L from 'leaflet'
import { useTheme } from '../hooks/useTheme'
import { MapPin, Filter, X, Download } from 'lucide-react'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css'
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css'
import MapaBase, { COLOMBIA_CENTER, DEFAULT_ZOOM } from './MapaBase'

const estadoColors = {
    programado: '#3B82F6',
    en_curso:   '#10B981',
    finalizado: '#9CA3AF',
    cerrado:    '#1F2937',
    aplazado:   '#F97316',
    cancelado:  '#EF4444',
}

const estadoLabels = {
    programado: 'Programado',
    en_curso:   'En curso',
    finalizado: 'Finalizado',
    cerrado:    'Cerrado',
    aplazado:   'Aplazado',
    cancelado:  'Cancelado',
}

function markerIcon(estado) {
    return L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color:${estadoColors[estado] || '#3B82F6'};border:2px solid white;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,.3);">📍</div>`,
        iconSize:    [40, 40],
        iconAnchor:  [20, 40],
        popupAnchor: [0, -40],
    })
}

export default function MapaVisualizador({
    eventos,
    titulo        = 'Mapa de Eventos',
    mostrarExport = true,
    mostrarFiltros = true,
    onExport,
    onExportKml,
}) {
    const { isDark } = useTheme()
    const [filtroEstado, setFiltroEstado] = useState([])
    const [fechaInicio,  setFechaInicio]  = useState('')
    const [fechaFin,     setFechaFin]     = useState('')
    const [showFilters,  setShowFilters]  = useState(mostrarFiltros)

    const eventosConUbicacion = eventos
        .filter(e => e.latitude && e.longitude)
        .map(e => ({ ...e, latitude: parseFloat(e.latitude), longitude: parseFloat(e.longitude) }))

    const eventosFiltrados = eventosConUbicacion.filter(e => {
        if (filtroEstado.length > 0 && !filtroEstado.includes(e.estado)) return false
        if (fechaInicio && new Date(e.fecha_hora) < new Date(fechaInicio))  return false
        if (fechaFin    && new Date(e.fecha_hora) > new Date(fechaFin))     return false
        return true
    })

    const toggleFiltroEstado = (estado) =>
        setFiltroEstado(prev =>
            prev.includes(estado) ? prev.filter(e => e !== estado) : [...prev, estado]
        )

    return (
        <div className={`h-full flex flex-col ${isDark ? 'bg-gray-900' : 'bg-white'}`}>
            {/* Header */}
            <div className={`border-b px-6 py-4 flex items-center justify-between ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900">
                        <MapPin size={20} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                    </div>
                    <div>
                        <h1 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{titulo}</h1>
                        <p className={`text-sm ${isDark ? 'text-white' : 'text-gray-600'}`}>
                            {eventosFiltrados.length} de {eventosConUbicacion.length} eventos con ubicación
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {mostrarExport && (
                        <>
                            <button
                                onClick={() => onExport?.()}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition text-sm font-medium ${isDark ? 'text-green-400 hover:bg-gray-700 border border-green-600' : 'text-green-700 hover:bg-green-50 border border-green-300'}`}
                            >
                                <Download size={16} /> GeoJSON
                            </button>
                            <button
                                onClick={() => onExportKml?.()}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition text-sm font-medium ${isDark ? 'text-blue-400 hover:bg-gray-700 border border-blue-600' : 'text-blue-700 hover:bg-blue-50 border border-blue-300'}`}
                            >
                                <Download size={16} /> KML
                            </button>
                        </>
                    )}
                    {mostrarFiltros && (
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                        >
                            <Filter size={18} />
                            {showFilters ? 'Ocultar' : 'Mostrar'} filtros
                        </button>
                    )}
                </div>
            </div>

            {/* Filtros */}
            {mostrarFiltros && showFilters && (
                <div className={`border-b px-6 py-4 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                    <div className="space-y-4">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Estado del evento
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {Object.keys(estadoLabels).map(estado => (
                                    <button
                                        key={estado}
                                        onClick={() => toggleFiltroEstado(estado)}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                                            filtroEstado.includes(estado)
                                                ? isDark ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700'
                                                : isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                    >
                                        {estadoLabels[estado]}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            {[
                                { label: 'Desde', value: fechaInicio, set: setFechaInicio },
                                { label: 'Hasta', value: fechaFin,    set: setFechaFin },
                            ].map(({ label, value, set }) => (
                                <div key={label}>
                                    <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</label>
                                    <input
                                        type="date"
                                        value={value}
                                        onChange={e => set(e.target.value)}
                                        className={`w-full px-3 py-2 rounded-lg border transition ${isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
                                    />
                                </div>
                            ))}
                        </div>
                        {(filtroEstado.length > 0 || fechaInicio || fechaFin) && (
                            <button
                                onClick={() => { setFiltroEstado([]); setFechaInicio(''); setFechaFin('') }}
                                className={`flex items-center gap-2 text-sm font-medium transition ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-700'}`}
                            >
                                <X size={14} /> Limpiar filtros
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Mapa */}
            <div className="flex-1 overflow-hidden relative">
                {eventosFiltrados.length === 0 ? (
                    <div className={`flex items-center justify-center h-full ${isDark ? 'bg-gray-800' : 'bg-gray-50'}`}>
                        <div className="text-center">
                            <MapPin size={48} className={`mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                            <p className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                                {eventosConUbicacion.length === 0
                                    ? 'No hay eventos con ubicación registrada'
                                    : 'No hay eventos que coincidan con los filtros'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <MapaBase center={COLOMBIA_CENTER} zoom={DEFAULT_ZOOM}>
                        <MarkerClusterGroup chunkedLoading>
                            {eventosFiltrados.map(evento => (
                                <Marker
                                    key={evento.id}
                                    position={[evento.latitude, evento.longitude]}
                                    icon={markerIcon(evento.estado)}
                                >
                                    <Popup className="custom-popup">
                                        <div className="space-y-2 min-w-64">
                                            <h3 className="font-semibold text-sm text-gray-900">{evento.tema}</h3>
                                            <span className="inline-block text-xs px-3 py-1.5 rounded-lg font-medium text-white" style={{ backgroundColor: estadoColors[evento.estado] }}>
                                                {estadoLabels[evento.estado]}
                                            </span>
                                            <div className="text-xs space-y-1 text-gray-600">
                                                <div><strong>Fecha:</strong> {new Date(evento.fecha_hora).toLocaleString('es-CO')}</div>
                                                {evento.responsable && (
                                                    <div><strong>Responsable:</strong> {evento.responsable.nombre} {evento.responsable.apellido}</div>
                                                )}
                                                {evento.direccion && <div><strong>Dirección:</strong> {evento.direccion}</div>}
                                                <div className="text-gray-500">{evento.latitude.toFixed(6)}, {evento.longitude.toFixed(6)}</div>
                                            </div>
                                        </div>
                                    </Popup>
                                </Marker>
                            ))}
                        </MarkerClusterGroup>
                    </MapaBase>
                )}
            </div>
        </div>
    )
}
