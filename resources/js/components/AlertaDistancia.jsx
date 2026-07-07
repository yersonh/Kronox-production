import { useEffect, useRef, useState } from 'react'
import { Navigation, AlertTriangle, CheckCircle, X } from 'lucide-react'

function distanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export default function AlertaDistancia({ eventoLat, eventoLng, umbralMetros = 500 }) {
  const [activo, setActivo] = useState(false)
  const [distancia, setDistancia] = useState(null)
  const [error, setError] = useState(null)
  const watchIdRef = useRef(null)

  const activar = () => {
    if (!navigator.geolocation) {
      setError('Tu navegador no soporta geolocalización')
      return
    }
    setError(null)
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const d = distanciaMetros(pos.coords.latitude, pos.coords.longitude, eventoLat, eventoLng)
        setDistancia(Math.round(d))
      },
      () => setError('No se pudo acceder a tu ubicación'),
      { enableHighAccuracy: true, maximumAge: 10000 }
    )
    setActivo(true)
  }

  const desactivar = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setActivo(false)
    setDistancia(null)
    setError(null)
  }

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [])

  const fueraDeRango = distancia !== null && distancia > umbralMetros

  return (
    <div className={`rounded-xl border-2 transition-colors ${
      !activo
        ? 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30'
        : fueraDeRango
          ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
          : 'border-green-400 bg-green-50 dark:bg-green-900/20'
    } p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Navigation size={18} className={
            !activo ? 'text-gray-400' : fueraDeRango ? 'text-red-500' : 'text-green-500'
          } />
          <span className={`text-sm font-semibold ${
            !activo ? 'text-gray-600 dark:text-gray-400'
              : fueraDeRango ? 'text-red-700 dark:text-red-300'
                : 'text-green-700 dark:text-green-300'
          }`}>
            Monitoreo de proximidad
          </span>
        </div>
        {activo && (
          <button onClick={desactivar} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X size={16} />
          </button>
        )}
      </div>

      {!activo && (
        <div className="mt-3">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Activa el monitoreo para recibir una alerta si te alejas más de {umbralMetros}m del evento.
          </p>
          <button
            type="button"
            onClick={activar}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition w-full justify-center"
          >
            <Navigation size={16} /> Activar monitoreo GPS
          </button>
        </div>
      )}

      {activo && distancia === null && !error && (
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
          <div className="animate-spin rounded-full h-3 w-3 border-2 border-indigo-500 border-t-transparent" />
          Obteniendo tu ubicación...
        </div>
      )}

      {activo && distancia !== null && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2">
            {fueraDeRango
              ? <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
              : <CheckCircle size={16} className="text-green-500 flex-shrink-0" />
            }
            <span className={`text-sm font-medium ${fueraDeRango ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
              {fueraDeRango
                ? `Estás a ${distancia}m del evento — fuera del rango (${umbralMetros}m)`
                : `Dentro del rango — ${distancia}m del evento`
              }
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${fueraDeRango ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(100, (distancia / umbralMetros) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
