// resources/js/pages/admin/MapaCalor.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.heat';
import Layout from '../../components/Layout';
import MapaBase, { COLOMBIA_CENTER, DEFAULT_ZOOM } from '../../components/MapaBase';
import api from '../../api/axios';
import { useTheme } from '../../hooks/useTheme';
import { MapPin, RefreshCw, Flame, Building2, Filter, X } from 'lucide-react';

// Capa de calor real (leaflet.heat): mezcla la densidad de puntos en una superficie continua
function CapaCalor({ puntos, max }) {
    const map = useMap();
    useEffect(() => {
        if (!puntos.length) return undefined;
        const heat = L.heatLayer(
            puntos.map((p) => [p.lat, p.lng, p.intensidad ?? 1]),
            {
                radius: 45,
                blur: 35,
                maxZoom: 17,
                // mínimo de 3 para que puntos aislados no aparezcan en rojo máximo
                max: Math.max(3, max || 1),
                minOpacity: 0.4,
                gradient: { 0.1: '#3b82f6', 0.3: '#22c55e', 0.5: '#fbbf24', 0.75: '#f97316', 1.0: '#dc2626' },
            }
        ).addTo(map);
        return () => map.removeLayer(heat);
    }, [puntos, max, map]);
    return null;
}

// Agrupa puntos cercanos para los marcadores clicables (no para el calor)
// precision=3 → ~111 m; precision=4 → ~11 m
function agruparPuntos(puntos, precision = 3) {
    const grupos = new Map();
    for (const p of puntos) {
        const key = `${p.lat.toFixed(precision)},${p.lng.toFixed(precision)}`;
        if (!grupos.has(key)) grupos.set(key, { lat: p.lat, lng: p.lng, peso: 0, eventos: [] });
        const g = grupos.get(key);
        g.peso += 1;
        g.eventos.push(p);
    }
    return [...grupos.values()];
}

// Ajusta el encuadre del mapa a los puntos visibles
function AjustarVista({ puntos }) {
    const map = useMap();
    useEffect(() => {
        if (puntos.length === 0) return;
        const bounds = L.latLngBounds(puntos.map((p) => [p.lat, p.lng]));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }, [puntos, map]);
    return null;
}

export default function MapaCalor() {
    const { isDark } = useTheme();
    const [puntos, setPuntos] = useState([]);
    const [loading, setLoading] = useState(true);

    // Catálogos para filtros
    const [dependencias, setDependencias] = useState([]);
    const [sectores, setSectores] = useState([]);

    // Filtros
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');
    const [depFiltro, setDepFiltro] = useState('');
    const [sectorFiltro, setSectorFiltro] = useState('');

    useEffect(() => { cargar(); }, []);

    const cargar = async () => {
        setLoading(true);
        try {
            const [mapaRes, depRes, secRes] = await Promise.all([
                api.get('/estadisticas/mapa-calor'),
                api.get('/dependencias', { params: { per_page: 500 } }),
                api.get('/sectores', { params: { per_page: 500 } }),
            ]);
            setPuntos(mapaRes.data.puntos ?? []);
            setDependencias(depRes.data.data ?? depRes.data);
            setSectores(secRes.data.data ?? secRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Sectores disponibles según la dependencia elegida
    const sectoresDisponibles = useMemo(() => (
        depFiltro ? sectores.filter((s) => String(s.dependencia_id) === String(depFiltro)) : sectores
    ), [sectores, depFiltro]);

    const hayFiltros = desde || hasta || depFiltro || sectorFiltro;

    const limpiarFiltros = () => {
        setDesde(''); setHasta(''); setDepFiltro(''); setSectorFiltro('');
    };

    // Aplica los filtros sobre los puntos individuales
    const puntosFiltrados = useMemo(() => puntos.filter((p) => {
        const fecha = p.fecha ? String(p.fecha).slice(0, 10) : null;
        if (desde && (!fecha || fecha < desde)) return false;
        if (hasta && (!fecha || fecha > hasta)) return false;
        if (depFiltro) {
            const ids = (p.dependencia_ids ?? []).map(Number);
            if (!ids.includes(Number(depFiltro))) return false;
        }
        if (sectorFiltro) {
            const ids = (p.sector_ids ?? []).map(Number);
            if (!ids.includes(Number(sectorFiltro))) return false;
        }
        return true;
    }), [puntos, desde, hasta, depFiltro, sectorFiltro]);

    const grupos = useMemo(() => agruparPuntos(puntosFiltrados), [puntosFiltrados]);
    const maxPeso = useMemo(() => Math.max(1, ...grupos.map((g) => g.peso)), [grupos]);

    // Para el heatmap: cada grupo aporta intensidad = nº de eventos en ese punto
    const puntosCalor = useMemo(() => grupos.map((g) => ({ lat: g.lat, lng: g.lng, intensidad: g.peso })), [grupos]);

    // Top lugares recalculado sobre lo filtrado
    const topSitios = useMemo(() => {
        const conteo = new Map();
        for (const p of puntosFiltrados) {
            const s = (p.sitio ?? '').trim();
            if (!s) continue;
            conteo.set(s, (conteo.get(s) ?? 0) + 1);
        }
        return [...conteo.entries()].map(([sitio, total]) => ({ sitio, total }))
            .sort((a, b) => b.total - a.total).slice(0, 10);
    }, [puntosFiltrados]);

    const cardBase = isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200 shadow-sm';
    const inputCls = `px-3 py-2 rounded-lg text-sm border outline-none transition w-full ${
        isDark ? 'bg-gray-700 border-gray-600 text-white focus:border-indigo-500' : 'bg-white border-gray-200 text-gray-800 focus:border-indigo-400'
    }`;
    const labelCls = `block text-[11px] font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`;

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            Mapa de Calor de Actividades
                        </h1>
                        <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Concentración geográfica de los eventos: dónde se realiza más actividad
                        </p>
                    </div>
                    <button
                        onClick={cargar}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition self-start"
                    >
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                        Actualizar
                    </button>
                </div>

                {/* Filtros */}
                <div className={`p-4 rounded-xl ${cardBase}`}>
                    <div className="flex items-center gap-2 mb-3">
                        <Filter size={15} className="text-indigo-500" />
                        <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Filtros</h2>
                        {hayFiltros && (
                            <button onClick={limpiarFiltros}
                                className="flex items-center gap-1 ml-auto text-xs font-medium text-red-500 hover:text-red-400 transition">
                                <X size={13} /> Mostrar todos
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                            <label className={labelCls}>Desde</label>
                            <input type="date" value={desde} max={hasta || undefined}
                                onChange={(e) => setDesde(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Hasta</label>
                            <input type="date" value={hasta} min={desde || undefined}
                                onChange={(e) => setHasta(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                            <label className={labelCls}>Dependencia</label>
                            <select value={depFiltro}
                                onChange={(e) => { setDepFiltro(e.target.value); setSectorFiltro(''); }} className={inputCls}>
                                <option value="">Todas</option>
                                {dependencias.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelCls}>Sector</label>
                            <select value={sectorFiltro} onChange={(e) => setSectorFiltro(e.target.value)} className={inputCls}>
                                <option value="">Todos</option>
                                {sectoresDisponibles.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Mapa */}
                    <div className={`lg:col-span-2 rounded-xl overflow-hidden ${cardBase}`} style={{ height: '600px' }}>
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-500 border-t-transparent" />
                            </div>
                        ) : grupos.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-6">
                                <MapPin size={40} className={isDark ? 'text-gray-600' : 'text-gray-300'} />
                                <p className={`mt-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {puntos.length === 0
                                        ? 'No hay eventos con ubicación registrada'
                                        : 'Ningún evento coincide con los filtros'}
                                </p>
                            </div>
                        ) : (
                            <MapaBase center={COLOMBIA_CENTER} zoom={DEFAULT_ZOOM}>
                                <AjustarVista puntos={grupos} />
                                <CapaCalor
                                    key={`${desde}-${hasta}-${depFiltro}-${sectorFiltro}`}
                                    puntos={puntosCalor}
                                    max={maxPeso}
                                />
                                {/* Marcadores invisibles pero clicables — el heatmap ya muestra la densidad */}
                                {grupos.map((g, i) => (
                                    <CircleMarker
                                        key={i}
                                        center={[g.lat, g.lng]}
                                        radius={18}
                                        pathOptions={{ color: 'transparent', weight: 0, fillColor: 'transparent', fillOpacity: 0 }}
                                    >
                                        <Popup>
                                            <div className="space-y-1.5 min-w-52">
                                                <div className="flex items-center gap-1.5 font-semibold text-sm text-gray-900">
                                                    <Flame size={14} className="text-red-500" />
                                                    {g.peso} {g.peso === 1 ? 'evento' : 'eventos'} en este punto
                                                </div>
                                                {g.eventos[0]?.direccion && (
                                                    <p className="text-xs text-gray-600">{g.eventos[0].direccion}</p>
                                                )}
                                                <ul className="text-xs text-gray-600 space-y-1 max-h-44 overflow-y-auto pt-1 border-t border-gray-100">
                                                    {g.eventos.map((e) => (
                                                        <li key={e.id} className="leading-snug flex items-start gap-1">
                                                            <span className="shrink-0">•</span>
                                                            <span>
                                                                {e.tema}
                                                                <span className={`ml-1 text-[10px] font-medium px-1 rounded ${
                                                                    e.estado === 'finalizado' ? 'bg-green-100 text-green-700'
                                                                    : e.estado === 'cerrado'  ? 'bg-gray-100 text-gray-600'
                                                                    : e.estado === 'en_curso' ? 'bg-blue-100 text-blue-700'
                                                                    : e.estado === 'aplazado' ? 'bg-amber-100 text-amber-700'
                                                                    : e.estado === 'cancelado'? 'bg-red-100 text-red-700'
                                                                    : 'bg-purple-100 text-purple-700'
                                                                }`}>
                                                                    {e.estado.replace('_', ' ')}
                                                                </span>
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </Popup>
                                    </CircleMarker>
                                ))}
                            </MapaBase>
                        )}
                    </div>

                    {/* Panel lateral */}
                    <div className="space-y-6">
                        {/* Resumen + leyenda */}
                        <div className={`p-5 rounded-xl ${cardBase}`}>
                            <h2 className={`text-sm font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-800'}`}>Resumen</h2>
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700/40' : 'bg-gray-50'}`}>
                                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{puntosFiltrados.length}</p>
                                    <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>eventos {hayFiltros ? 'filtrados' : 'ubicados'}</p>
                                </div>
                                <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-700/40' : 'bg-gray-50'}`}>
                                    <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{grupos.length}</p>
                                    <p className={`text-[11px] ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>puntos distintos</p>
                                </div>
                            </div>
                            <p className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Intensidad</p>
                            <div className="h-3 rounded-full" style={{ background: 'linear-gradient(to right, #3b82f6, #22c55e, #fbbf24, #f97316, #dc2626)' }} />
                            <div className={`flex justify-between text-[10px] mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                <span>Menos actividad</span>
                                <span>Más actividad</span>
                            </div>
                        </div>

                        {/* Top lugares */}
                        <div className={`p-5 rounded-xl ${cardBase}`}>
                            <div className="flex items-center gap-2 mb-3">
                                <Building2 size={16} className="text-indigo-500" />
                                <h2 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Lugares más frecuentes</h2>
                            </div>
                            {topSitios.length === 0 ? (
                                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Sin lugares nombrados registrados</p>
                            ) : (
                                <ul className="space-y-2">
                                    {topSitios.map((s, i) => {
                                        const max = topSitios[0].total;
                                        return (
                                            <li key={i}>
                                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                                    <span className={`text-xs truncate ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{s.sitio}</span>
                                                    <span className={`text-xs font-bold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{s.total}</span>
                                                </div>
                                                <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                                                    <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(s.total / max) * 100}%` }} />
                                                </div>
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
