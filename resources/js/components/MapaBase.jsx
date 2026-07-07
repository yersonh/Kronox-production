import { useState } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Satellite, Map } from 'lucide-react'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

export const MAPTILER_KEY    = import.meta.env.VITE_MAPTILER_KEY

const CAPAS = {
    normal: {
        url:         'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        label:       'Satélite',
        icon:        'satellite',
    },
    satelite: {
        url:         `https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`,
        attribution: '&copy; <a href="https://www.maptiler.com/">MapTiler</a>',
        label:       'Mapa',
        icon:        'map',
    },
}

export const COLOMBIA_CENTER = [4.5, -74.0]
export const DEFAULT_ZOOM    = 6

export default function MapaBase({ center = COLOMBIA_CENTER, zoom = DEFAULT_ZOOM, style, children }) {
    const [capa, setCapa] = useState('normal')
    const actual          = CAPAS[capa]
    const siguiente       = capa === 'normal' ? 'satelite' : 'normal'

    const containerStyle = style ?? { width: '100%', height: '100%' }

    return (
        <div className="relative" style={containerStyle}>
            <MapContainer center={center} zoom={zoom} style={{ width: '100%', height: '100%' }}>
                <TileLayer key={capa} url={actual.url} attribution={actual.attribution} />
                {children}
            </MapContainer>

            {/* Botón flotante para cambiar capa */}
            <button
                type="button"
                onClick={() => setCapa(siguiente)}
                title={`Cambiar a vista ${CAPAS[siguiente].label}`}
                className="absolute bottom-6 right-3 z-[1000] flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-lg border transition-all bg-white text-gray-700 hover:bg-gray-50 border-gray-200"
            >
                {capa === 'normal'
                    ? <Satellite size={15} className="text-indigo-600" />
                    : <Map       size={15} className="text-indigo-600" />
                }
                {CAPAS[siguiente].label}
            </button>
        </div>
    )
}
