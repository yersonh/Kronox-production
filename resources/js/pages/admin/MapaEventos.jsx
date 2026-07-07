import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../api/axios'
import MapaVisualizador from '../../components/MapaVisualizador'
import { useTheme } from '../../hooks/useTheme'
import { Filter, X, ArrowLeft } from 'lucide-react'

const estadoLabels = {
  programado: 'Programado',
  en_curso: 'En curso',
  finalizado: 'Finalizado',
  cerrado: 'Cerrado',
  aplazado: 'Aplazado',
  cancelado: 'Cancelado'
}

const estadoColors = {
  programado: '#3B82F6',
  en_curso: '#10B981',
  finalizado: '#9CA3AF',
  cerrado: '#1F2937',
  aplazado: '#F97316',
  cancelado: '#EF4444',
}

export default function MapaEventos() {
  const { isDark } = useTheme()
  const navigate = useNavigate()
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [dependencias, setDependencias] = useState([])
  const [sectores, setSectores] = useState([])
  const [showFilters, setShowFilters] = useState(false)

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState([])
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [filtroDependencia, setFiltroDependencia] = useState('')
  const [filtroSector, setFiltroSector] = useState('')

  useEffect(() => {
    fetchEventos()
    fetchDependencias()
  }, [])

  useEffect(() => {
    if (filtroDependencia) {
      api.get(`/sectores?dependencia_id=${filtroDependencia}`)
        .then(res => {
          const items = res.data.data ?? res.data
          setSectores(Array.isArray(items) ? items : [])
        })
        .catch(err => console.error('Error cargando sectores:', err))
    } else {
      setSectores([])
    }
    setFiltroSector('')
  }, [filtroDependencia])

  const fetchEventos = async () => {
    try {
      setLoading(true)
      const res = await api.get('/eventos?per_page=500')
      const items = res.data.data ?? res.data
      setEventos(Array.isArray(items) ? items : [])
    } catch (err) {
      console.error('Error cargando eventos:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchDependencias = async () => {
    try {
      const res = await api.get('/dependencias?per_page=500')
      const items = res.data.data ?? res.data
      setDependencias(Array.isArray(items) ? items : [])
    } catch (err) {
      console.error('Error cargando dependencias:', err)
    }
  }

  const eventosFiltrados = eventos.filter(e => {
    if (filtroEstado.length > 0 && !filtroEstado.includes(e.estado)) return false
    if (fechaInicio && new Date(e.fecha_hora) < new Date(fechaInicio)) return false
    if (fechaFin && new Date(e.fecha_hora) > new Date(fechaFin)) return false
    if (filtroDependencia && !e.dependencias?.some(d => d.id === parseInt(filtroDependencia))) return false
    if (filtroSector && !e.sectores?.some(s => s.id === parseInt(filtroSector))) return false
    return true
  })

  const toggleFiltroEstado = (estado) => {
    setFiltroEstado(prev =>
      prev.includes(estado)
        ? prev.filter(e => e !== estado)
        : [...prev, estado]
    )
  }

  const handleExport = async () => {
    try {
      const res = await api.get('/eventos/export/geojson', { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/geo+json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `eventos_${new Date().toISOString().slice(0, 10)}.geojson`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Error al exportar GeoJSON')
    }
  }

  const handleExportKml = () => {
    const conUbicacion = eventosFiltrados.filter(e => e.latitude && e.longitude)
    if (conUbicacion.length === 0) {
      alert('No hay eventos con ubicación para exportar.')
      return
    }

    const estilos = Object.entries(estadoColors).map(([estado, color]) => {
      const hex = color.replace('#', 'ff')
      return `
  <Style id="${estado}">
    <IconStyle>
      <color>${hex.slice(6)}${hex.slice(4, 6)}${hex.slice(2, 4)}${hex.slice(0, 2)}</color>
      <scale>1.1</scale>
      <Icon><href>http://maps.google.com/mapfiles/kml/paddle/wht-blank.png</href></Icon>
    </IconStyle>
    <LabelStyle><scale>0.8</scale></LabelStyle>
  </Style>`
    }).join('')

    const placemarks = conUbicacion.map(e => {
      const fecha = new Date(e.fecha_hora).toLocaleString('es-CO')
      const responsable = e.responsable
        ? `${e.responsable.nombre} ${e.responsable.apellido}`
        : 'No asignado'
      const descripcion = [
        `<b>Estado:</b> ${estadoLabels[e.estado]}`,
        `<b>Fecha:</b> ${fecha}`,
        `<b>Responsable:</b> ${responsable}`,
        e.direccion ? `<b>Dirección:</b> ${e.direccion}` : null,
        e.dependencias?.length ? `<b>Dependencias:</b> ${e.dependencias.map(d => d.nombre).join(', ')}` : null,
        e.sectores?.length ? `<b>Sectores:</b> ${e.sectores.map(s => s.nombre).join(', ')}` : null,
      ].filter(Boolean).join('<br/>')

      const tema = e.tema.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

      return `
  <Placemark>
    <name>${tema}</name>
    <description><![CDATA[${descripcion}]]></description>
    <styleUrl>#${e.estado}</styleUrl>
    <Point>
      <coordinates>${e.longitude},${e.latitude},0</coordinates>
    </Point>
  </Placemark>`
    }).join('')

    const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>Eventos Kronox - ${new Date().toLocaleDateString('es-CO')}</name>
  <description>Exportado desde Kronox - Alcaldía de Monterrey</description>
${estilos}
${placemarks}
</Document>
</kml>`

    const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `eventos_${new Date().toISOString().slice(0, 10)}.kml`
    a.click()
    URL.revokeObjectURL(url)
  }

  const limpiarFiltros = () => {
    setFiltroEstado([])
    setFechaInicio('')
    setFechaFin('')
    setFiltroDependencia('')
    setFiltroSector('')
  }

  const tieneFilActivos = filtroEstado.length > 0 || fechaInicio || fechaFin || filtroDependencia || filtroSector

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Cargando mapa de eventos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Panel de Filtros */}
      <div className={`border-b sticky top-0 z-10 ${isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'}`}>
        {/* Header de filtros */}
        <div className="px-6 py-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition font-medium text-sm ${isDark
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
              title="Volver"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Volver</span>
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition font-medium text-sm ${isDark
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
              }`}
            >
              <Filter size={16} />
              {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
            </button>
          </div>
          <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>
            {eventosFiltrados.length} de {eventos.length} eventos
          </div>
          {tieneFilActivos && (
            <button
              onClick={limpiarFiltros}
              className={`flex items-center gap-2 text-sm font-medium transition ${isDark ? 'text-red-400 hover:text-red-300' : 'text-red-500 hover:text-red-700'}`}
            >
              <X size={14} /> Limpiar filtros
            </button>
          )}
        </div>

        {/* Contenido de filtros */}
        {showFilters && (
          <div className={`border-t px-6 py-4 space-y-4 ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>

            {/* Estados */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                Estado del evento
              </label>
              <div className="flex flex-wrap gap-2">
                {['programado', 'en_curso', 'finalizado', 'cerrado', 'aplazado', 'cancelado'].map(estado => (
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

            {/* Fechas y Ubicación en grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Fecha inicio */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Desde
                </label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={e => setFechaInicio(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border transition text-sm ${isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              {/* Fecha fin */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Hasta
                </label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={e => setFechaFin(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border transition text-sm ${isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                  }`}
                />
              </div>

              {/* Dependencia */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Dependencia
                </label>
                <select
                  value={filtroDependencia}
                  onChange={(e) => setFiltroDependencia(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border transition text-sm ${isDark
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">Todas</option>
                  {dependencias.map(dep => (
                    <option key={dep.id} value={dep.id}>
                      {dep.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sector */}
              <div>
                <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Sector
                </label>
                <select
                  value={filtroSector}
                  onChange={(e) => setFiltroSector(e.target.value)}
                  disabled={!filtroDependencia}
                  className={`w-full px-3 py-2 rounded-lg border transition text-sm ${
                    !filtroDependencia
                      ? isDark
                        ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                      : isDark
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">Todos</option>
                  {sectores.map(sector => (
                    <option key={sector.id} value={sector.id}>
                      {sector.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mapa */}
      <div className="flex-1 overflow-hidden">
        <MapaVisualizador
          eventos={eventosFiltrados}
          titulo="Mapa de Eventos"
          mostrarExport
          mostrarFiltros={false}
          onExport={handleExport}
          onExportKml={handleExportKml}
        />
      </div>
    </div>
  )
}
