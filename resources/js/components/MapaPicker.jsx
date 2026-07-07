import { useEffect, useState, useRef } from 'react'
import { Marker, Popup, useMapEvent, useMap } from 'react-leaflet'
import { MapPin, Navigation, Clock, User, Search, Loader } from 'lucide-react'
import MapaBase, { COLOMBIA_CENTER, MAPTILER_KEY } from './MapaBase'

function MapClickHandler({ onChange }) {
    useMapEvent('click', (e) => {
        const { lat, lng } = e.latlng
        onChange({ lat, lng })
    })
    return null
}

function MapMover({ target }) {
    const map = useMap()
    useEffect(() => {
        if (target?.lat && target?.lng) map.flyTo([target.lat, target.lng], 15)
    }, [target, map])
    return null
}

async function geocodificarInverso(lat, lng) {
    try {
        const res  = await fetch(`https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${MAPTILER_KEY}&language=es`)
        const data = await res.json()
        return data.features?.[0]?.place_name ?? `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    } catch {
        return `${lat.toFixed(6)}, ${lng.toFixed(6)}`
    }
}

export default function MapaPicker({ value, onChange, readOnly = false, historial = [] }) {
    const [coords,      setCoords]      = useState(value?.lat && value?.lng ? value : { lat: COLOMBIA_CENTER[0], lng: COLOMBIA_CENTER[1], direccion: '' })
    const [loading,     setLoading]     = useState(false)
    const [busqueda,    setBusqueda]    = useState('')
    const [resultados,  setResultados]  = useState([])
    const [buscando,    setBuscando]    = useState(false)
    const [targetVuelo, setTargetVuelo] = useState(null)
    const debounceRef = useRef(null)

    useEffect(() => { if (value) setCoords(value) }, [value])

    const handleMapClick = async ({ lat, lng }) => {
        setCoords({ lat, lng })
        const direccion = await geocodificarInverso(lat, lng)
        onChange({ lat, lng, direccion })
    }

    const buscarDireccion = (query) => {
        clearTimeout(debounceRef.current)
        setBusqueda(query)
        if (query.length < 3) { setResultados([]); return }
        debounceRef.current = setTimeout(async () => {
            setBuscando(true)
            try {
                const res  = await fetch(`https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${MAPTILER_KEY}&language=es&country=co&limit=5`)
                const data = await res.json()
                setResultados(data.features ?? [])
            } catch {
                setResultados([])
            } finally {
                setBuscando(false)
            }
        }, 400)
    }

    const seleccionarResultado = (r) => {
        const [lng, lat] = r.center
        setTargetVuelo({ lat, lng })
        handleMapClick({ lat, lng })
        setBusqueda('')
        setResultados([])
    }

    const handleCurrentLocation = () => {
        setLoading(true)
        navigator.geolocation.getCurrentPosition(
            ({ coords: { latitude, longitude } }) => {
                handleMapClick({ lat: latitude, lng: longitude })
                setLoading(false)
            },
            () => {
                alert('No se pudo acceder a la ubicación. Asegúrate de permitir el acceso en tu navegador.')
                setLoading(false)
            }
        )
    }

    const center = coords.lat && coords.lng ? [coords.lat, coords.lng] : COLOMBIA_CENTER

    return (
        <div className="space-y-4">
            {/* Buscador */}
            <div className="relative">
                <div className="flex gap-2 items-center border rounded-lg px-3 py-2 dark:border-gray-600 border-gray-300 dark:bg-gray-900 bg-white">
                    <Search size={16} className="text-gray-400" />
                    <input
                        type="text"
                        value={busqueda}
                        onChange={e => buscarDireccion(e.target.value)}
                        placeholder="Buscar dirección en Colombia..."
                        disabled={readOnly}
                        className="flex-1 outline-none dark:bg-gray-900 text-sm placeholder-gray-400 dark:placeholder-gray-500 dark:text-white"
                    />
                    {buscando && <Loader size={14} className="animate-spin text-indigo-500" />}
                </div>
                {resultados.length > 0 && (
                    <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border dark:border-gray-700 border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {resultados.map((r, i) => (
                            <button
                                key={i}
                                type="button"
                                onClick={() => seleccionarResultado(r)}
                                className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 border-b dark:border-gray-700 border-gray-100 last:border-b-0 dark:text-gray-200"
                            >
                                <div className="font-medium truncate">{r.text}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {r.place_name}
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Botón GPS */}
            <button
                type="button"
                onClick={handleCurrentLocation}
                disabled={readOnly || loading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <MapPin size={18} />
                {loading ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}
            </button>

            {/* Mapa */}
            <div className="rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                <MapaBase center={center} zoom={coords.lat !== COLOMBIA_CENTER[0] ? 15 : 6} style={{ height: '400px', width: '100%' }}>
                    {coords.lat && coords.lng && (
                        <Marker position={[coords.lat, coords.lng]}>
                            <Popup>
                                {coords.direccion || `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`}
                            </Popup>
                        </Marker>
                    )}
                    <MapMover target={targetVuelo} />
                    {!readOnly && <MapClickHandler onChange={handleMapClick} />}
                </MapaBase>
            </div>

            {/* Coordenadas actuales */}
            {coords.lat && coords.lng && (
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm">
                    <div className="font-semibold mb-1">Coordenadas:</div>
                    <div className="font-mono text-xs">{coords.lat.toFixed(8)}, {coords.lng.toFixed(8)}</div>
                    {coords.direccion && (
                        <>
                            <div className="font-semibold mt-2 mb-1">Dirección:</div>
                            <div className="text-xs break-words">{coords.direccion}</div>
                        </>
                    )}
                </div>
            )}

            {/* Historial de ubicaciones */}
            {historial.length > 0 && (
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        <Clock size={12} /> Historial de ubicaciones
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                        {historial.map((h, i) => (
                            <div key={h.id ?? i} className="flex gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-xs">
                                <div className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${h.tipo === 'gps' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-600'}`}>
                                    {h.tipo === 'gps' ? <Navigation size={12} /> : <MapPin size={12} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                            <User size={10} /> {h.user?.name ?? 'Usuario'}
                                        </span>
                                        <span className="text-gray-400 flex-shrink-0">
                                            {new Date(h.created_at).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                                        </span>
                                    </div>
                                    <div className="text-gray-500 dark:text-gray-400 truncate mt-0.5">
                                        {h.direccion || `${parseFloat(h.latitude).toFixed(5)}, ${parseFloat(h.longitude).toFixed(5)}`}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
