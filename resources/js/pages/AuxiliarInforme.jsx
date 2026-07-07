import React, { useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import { useTheme } from '../hooks/useTheme';
import { exportarAuxiliarInforme } from '../utils/pdfExport';
import {
    FileBarChart2, Calendar, Search, Download, ClipboardList,
    CheckSquare, Link2, X, AlertCircle, Clock, CheckCircle2,
    Camera, FileText, Loader2, Info, Upload, FileCheck2, Trash2
} from 'lucide-react';

const ESTADO_COLOR = {
    programado:  'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    en_curso:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    finalizado:  'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
    cerrado:     'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-500',
    aplazado:    'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    cancelado:   'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300',
    pendiente:   'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
    realizado:   'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    cumplido:    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    vencido:     'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300',
    vencida:     'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300',
};

const TIPO_ICON = {
    evento:     <ClipboardList size={14} className="text-indigo-500" />,
    tarea:      <CheckSquare size={14} className="text-teal-500" />,
    compromiso: <Link2 size={14} className="text-amber-500" />,
};

const TIPO_LABEL = { evento: 'Evento', tarea: 'Tarea', compromiso: 'Compromiso' };

function fmtFecha(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AuxiliarInforme() {
    const { isDark } = useTheme();
    const [desde, setDesde] = useState('');
    const [hasta, setHasta] = useState('');
    const [datos, setDatos] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [savingVinculo, setSavingVinculo] = useState({});
    const [generandoPDF, setGenerandoPDF] = useState(false);
    const [showAviso, setShowAviso] = useState(false);

    // Planillas
    const [planillas, setPlanillas] = useState([]);
    const [loadingPlanillas, setLoadingPlanillas] = useState(false);
    const [periodoNuevo, setPeriodoNuevo] = useState(() => {
        const hoy = new Date();
        return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    });
    const [uploadingPlanilla, setUploadingPlanilla] = useState(false);
    const [errorPlanilla, setErrorPlanilla] = useState('');

    const fetchPlanillas = async () => {
        setLoadingPlanillas(true);
        try {
            const res = await api.get('/auxiliar-informe/planillas');
            setPlanillas(res.data);
        } catch {}
        finally { setLoadingPlanillas(false); }
    };

    useState(() => { fetchPlanillas(); }, []);

    const handleSubirPlanilla = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) { setErrorPlanilla('El archivo no debe superar 10 MB'); return; }
        setErrorPlanilla('');
        setUploadingPlanilla(true);
        try {
            const fd = new FormData();
            fd.append('planilla', file);
            fd.append('periodo', periodoNuevo);
            await api.post('/auxiliar-informe/planillas', fd, { headers: { 'Content-Type': undefined } });
            await fetchPlanillas();
        } catch (err) {
            setErrorPlanilla(err.response?.data?.message || 'Error al subir la planilla');
        } finally {
            setUploadingPlanilla(false);
            e.target.value = '';
        }
    };

    const handleDescargarPlanilla = async (id) => {
        const res = await api.get(`/auxiliar-informe/planillas/${id}`, { responseType: 'blob' });
        const url = URL.createObjectURL(res.data);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 15000);
    };

    const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const fmtPeriodo = (p) => { const [y, m] = p.split('-'); return `${MESES[parseInt(m) - 1]} ${y}`; };

    const inputClass = `rounded-xl px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`;

    const buscar = async () => {
        setLoading(true);
        setError('');
        try {
            const params = {};
            if (desde) params.desde = desde;
            if (hasta) params.hasta = hasta;
            const res = await api.get('/auxiliar-informe/mis-datos', { params });
            setDatos(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al cargar datos');
        } finally {
            setLoading(false);
        }
    };

    const vincular = async (tipo, id, obligacionId) => {
        const key = `${tipo}_${id}`;
        setSavingVinculo(prev => ({ ...prev, [key]: true }));
        try {
            await api.post('/auxiliar-informe/vincular', {
                item_type: tipo,
                item_id: id,
                obligacion_id: obligacionId || null,
            });
            setDatos(prev => ({
                ...prev,
                items: prev.items.map(it =>
                    it.tipo === tipo && it.id === id
                        ? { ...it, obligacion_id: obligacionId || null }
                        : it
                ),
            }));
        } catch (err) {
            console.error('Error al vincular:', err);
        } finally {
            setSavingVinculo(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleGenerarPDF = async () => {
        if (!datos) return;
        setGenerandoPDF(true);
        try {
            await exportarAuxiliarInforme(datos, desde, hasta);
        } catch (err) {
            console.error('Error generando PDF:', err);
        } finally {
            setGenerandoPDF(false);
            setShowAviso(false);
        }
    };

    const vinculados = datos?.items?.filter(it => it.obligacion_id) ?? [];
    const byFechaDesc = (a, b) => new Date(b.fecha ?? 0) - new Date(a.fecha ?? 0);
    const grupos = {
        evento:     (datos?.items?.filter(it => it.tipo === 'evento') ?? []).sort(byFechaDesc),
        tarea:      (datos?.items?.filter(it => it.tipo === 'tarea') ?? []).sort(byFechaDesc),
        compromiso: (datos?.items?.filter(it => it.tipo === 'compromiso') ?? []).sort(byFechaDesc),
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <FileBarChart2 size={24} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Auxiliar de Informe</h2>
                    </div>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Vincula tus eventos, tareas y compromisos a las obligaciones de tu contrato para generar el informe de actividades.
                    </p>
                </div>

                {/* Filtro de período */}
                <div className={`rounded-2xl p-4 ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <Calendar size={13} /> Período de actividades
                    </p>
                    <div className="flex flex-wrap items-end gap-3">
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Desde</label>
                            <input type="date" value={desde} onChange={e => setDesde(e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Hasta</label>
                            <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} min={desde} className={inputClass} />
                        </div>
                        <button
                            onClick={buscar}
                            disabled={loading}
                            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white transition disabled:opacity-60">
                            {loading
                                ? <><Loader2 size={15} className="animate-spin" /> Cargando...</>
                                : <><Search size={15} /> Buscar actividades</>}
                        </button>
                        {datos && (
                            <button
                                onClick={() => setShowAviso(true)}
                                disabled={generandoPDF || vinculados.length === 0}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white transition disabled:opacity-50"
                                title={vinculados.length === 0 ? 'Debes vincular al menos una actividad a una obligación' : ''}>
                                {generandoPDF
                                    ? <><Loader2 size={15} className="animate-spin" /> Generando PDF...</>
                                    : <><Download size={15} /> Generar auxiliar informe</>}
                            </button>
                        )}
                    </div>
                </div>

                {/* Planillas */}
                <div className={`rounded-2xl p-4 ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        <FileCheck2 size={13} /> Planillas de pago
                    </p>
                    <div className="flex flex-wrap items-end gap-3 mb-4">
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Período</label>
                            <input
                                type="month"
                                value={periodoNuevo}
                                onChange={e => setPeriodoNuevo(e.target.value)}
                                className={inputClass}
                            />
                        </div>
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Archivo (PDF, máx. 10 MB)</label>
                            <label className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer transition ${uploadingPlanilla ? 'opacity-60 cursor-not-allowed' : ''} bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white`}>
                                {uploadingPlanilla
                                    ? <><Loader2 size={14} className="animate-spin" /> Subiendo...</>
                                    : <><Upload size={14} /> Adjuntar planilla</>}
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    disabled={uploadingPlanilla}
                                    onChange={handleSubirPlanilla}
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>
                    {errorPlanilla && (
                        <p className={`text-xs mb-3 flex items-center gap-1 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                            <AlertCircle size={13} /> {errorPlanilla}
                        </p>
                    )}
                    {loadingPlanillas ? (
                        <div className="flex justify-center py-4">
                            <Loader2 size={18} className="animate-spin text-indigo-500" />
                        </div>
                    ) : planillas.length === 0 ? (
                        <p className={`text-xs text-center py-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>No hay planillas adjuntadas aún.</p>
                    ) : (
                        <div className={`rounded-xl overflow-hidden border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                            {planillas.map((pl, idx) => (
                                <div
                                    key={pl.id}
                                    className={`flex items-center gap-3 px-4 py-3 text-sm transition ${idx < planillas.length - 1 ? (isDark ? 'border-b border-gray-700' : 'border-b border-gray-100') : ''} ${isDark ? 'hover:bg-gray-700/40' : 'hover:bg-gray-50'}`}>
                                    <FileCheck2 size={16} className={isDark ? 'text-violet-400 flex-shrink-0' : 'text-violet-600 flex-shrink-0'} />
                                    <div className="flex-1 min-w-0">
                                        <p className={`font-medium truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>{pl.nombre_original ?? `Planilla_${fmtPeriodo(pl.periodo)}`}</p>
                                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                            {fmtPeriodo(pl.periodo)} · {new Date(pl.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleDescargarPlanilla(pl.id)}
                                        title="Descargar"
                                        className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-indigo-300' : 'hover:bg-gray-100 text-gray-500 hover:text-indigo-600'}`}>
                                        <Download size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {error && (
                    <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                        <AlertCircle size={16} /> {error}
                    </div>
                )}

                {/* Stats */}
                {datos && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'Eventos', value: grupos.evento.length, icon: <ClipboardList size={16} />, color: 'indigo' },
                            { label: 'Tareas', value: grupos.tarea.length, icon: <CheckSquare size={16} />, color: 'teal' },
                            { label: 'Compromisos', value: grupos.compromiso.length, icon: <Link2 size={16} />, color: 'amber' },
                            { label: 'Vinculadas', value: vinculados.length, icon: <CheckCircle2 size={16} />, color: 'emerald' },
                        ].map(({ label, value, icon, color }) => (
                            <div key={label} className={`rounded-xl p-3 border ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                                <div className={`text-${color}-500 mb-1`}>{icon}</div>
                                <p className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>{value}</p>
                                <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{label}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Hint cuando no hay obligaciones */}
                {datos && datos.obligaciones.length === 0 && (
                    <div className={`p-4 rounded-xl flex items-start gap-3 ${isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'}`}>
                        <Info size={16} className={isDark ? 'text-amber-400 mt-0.5' : 'text-amber-600 mt-0.5'} />
                        <p className={`text-sm ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                            Tu contrato no tiene obligaciones registradas. Pídele al administrador que las agregue desde el panel de contratistas antes de generar el informe.
                        </p>
                    </div>
                )}

                {/* Lista de items por tipo */}
                {datos && datos.items.length === 0 && (
                    <div className={`rounded-2xl p-12 text-center border-2 border-dashed ${isDark ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                        <FileBarChart2 size={40} className={`mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                        <p className="font-medium">Sin actividades en el período seleccionado</p>
                        <p className="text-xs mt-1">Ajusta el rango de fechas o asegúrate de tener eventos, tareas o compromisos asignados.</p>
                    </div>
                )}

                {datos && datos.items.length > 0 && (
                    <div className="space-y-6">
                        {[
                            { tipo: 'evento', label: 'Eventos', color: 'indigo' },
                            { tipo: 'tarea', label: 'Tareas', color: 'teal' },
                            { tipo: 'compromiso', label: 'Compromisos', color: 'amber' },
                        ].map(({ tipo, label, color }) => {
                            const lista = grupos[tipo];
                            if (lista.length === 0) return null;
                            return (
                                <div key={tipo} className={`rounded-2xl overflow-hidden shadow-sm ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                                    <div className={`px-5 py-3 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                        <div className="flex items-center gap-2">
                                            {TIPO_ICON[tipo]}
                                            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>{label}</h3>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>{lista.length}</span>
                                        </div>
                                        <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                            {lista.filter(it => it.obligacion_id).length} vinculadas
                                        </span>
                                    </div>
                                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {lista.map(item => (
                                            <ItemRow
                                                key={`${item.tipo}_${item.id}`}
                                                item={item}
                                                obligaciones={datos.obligaciones}
                                                isDark={isDark}
                                                saving={!!savingVinculo[`${item.tipo}_${item.id}`]}
                                                onVincular={(obligId) => vincular(item.tipo, item.id, obligId)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Estado vacío inicial */}
                {!datos && !loading && (
                    <div className={`rounded-2xl p-12 text-center border-2 border-dashed ${isDark ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                        <FileBarChart2 size={48} className={`mx-auto mb-4 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                        <p className="font-medium text-base">Selecciona un período y busca tus actividades</p>
                        <p className="text-xs mt-2">Puedes dejar las fechas vacías para ver todas tus actividades.</p>
                    </div>
                )}
            </div>

            {/* Modal aviso antes de generar */}
            {showAviso && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !generandoPDF && setShowAviso(false)} />
                    <div className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                        <div className={`px-6 py-4 border-b flex items-center gap-3 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <AlertCircle size={20} className="text-amber-500 flex-shrink-0" />
                            <h3 className={`font-semibold text-base ${isDark ? 'text-white' : 'text-gray-800'}`}>Aviso importante</h3>
                        </div>
                        <div className="px-6 py-5">
                            <img src={`${window.location.origin}/images/avisodeinforme.png`} alt="Aviso" className="w-full rounded-lg" />
                        </div>
                        <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <button
                                onClick={() => setShowAviso(false)}
                                disabled={generandoPDF}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                Cancelar
                            </button>
                            <button
                                onClick={handleGenerarPDF}
                                disabled={generandoPDF}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white transition disabled:opacity-50">
                                {generandoPDF
                                    ? <><Loader2 size={14} className="animate-spin" /> Generando...</>
                                    : <><Download size={14} /> Entendido, generar</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}

function ItemRow({ item, obligaciones, isDark, saving, onVincular }) {
    const estadoClass = ESTADO_COLOR[item.estado] ?? 'bg-gray-100 text-gray-500';

    return (
        <div className={`px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-3 transition ${isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}`}>
            {/* Info del item */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    {TIPO_ICON[item.tipo]}
                    {item.numero && (
                        <span className={`text-xs font-mono ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{item.numero}</span>
                    )}
                    <span className={`font-medium text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>{item.titulo}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className={`inline-flex items-center gap-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        <Clock size={11} />
                        {item.fecha ? new Date(item.fecha).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoClass}`}>{item.estado}</span>
                    {item.fotos_count > 0 && (
                        <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            <Camera size={11} /> {item.fotos_count}
                        </span>
                    )}
                    {item.tiene_soporte && (
                        <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                            <FileText size={11} /> soporte
                        </span>
                    )}
                    {item.lugar && (
                        <span className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>{item.lugar}</span>
                    )}
                </div>
            </div>

            {/* Selector de obligación */}
            <div className="flex items-center gap-2 flex-shrink-0">
                {saving ? (
                    <Loader2 size={14} className="animate-spin text-indigo-500" />
                ) : item.obligacion_id ? (
                    <CheckCircle2 size={14} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
                ) : null}
                <select
                    value={item.obligacion_id ?? ''}
                    onChange={e => onVincular(e.target.value ? Number(e.target.value) : null)}
                    disabled={saving || obligaciones.length === 0}
                    className={`rounded-lg px-3 py-1.5 text-xs border focus:outline-none focus:ring-2 focus:ring-indigo-500 transition disabled:opacity-50 max-w-[220px] ${
                        item.obligacion_id
                            ? isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : isDark ? 'bg-gray-900 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'
                    }`}>
                    <option value="">— Sin vincular —</option>
                    {obligaciones.map(ob => (
                        <option key={ob.id} value={ob.id}>
                            {ob.descripcion.length > 50 ? ob.descripcion.substring(0, 50) + '…' : ob.descripcion}
                        </option>
                    ))}
                </select>
                {item.obligacion_id && (
                    <button
                        onClick={() => onVincular(null)}
                        disabled={saving}
                        className={`p-1 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-500 hover:text-red-400' : 'hover:bg-gray-100 text-gray-400 hover:text-red-600'}`}
                        title="Quitar vínculo">
                        <X size={13} />
                    </button>
                )}
            </div>
        </div>
    );
}
