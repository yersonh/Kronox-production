import React, { useEffect, useRef, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import { useTheme } from '../hooks/useTheme';
import {
    User, Upload, Download, CheckCircle, XCircle, AlertTriangle,
    FileText, Save, Plus, Trash2, Pencil, ChevronDown, X, ZoomIn
} from 'lucide-react';

const DOCUMENTOS_LABELS = {
    'rut':                    'RUT',
    'polizas':                'Pólizas',
    'paz-salvo-parafiscales': 'Paz y Salvo Parafiscales',
    'seguridad-social':       'Seguridad Social',
    'arl':                    'ARL',
    'certificacion-bancaria': 'Certificación Bancaria',
    'estudios-previos':       'Estudios Previos',
    'acta-inicio':            'Acta de Inicio',
    'registro-presupuestal':  'Registro Presupuestal',
    'resolucion-supervisor':  'Resolución Supervisor',
};


export default function Perfil() {
    const { isDark } = useTheme();
    const [perfil, setPerfil] = useState(null);
    const [obligaciones, setObligaciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState({});
    const [saving, setSaving] = useState(false);
    const [contrato, setContrato] = useState({ numero_contrato: '', fecha_inicio: '', fecha_fin: '', objeto_contrato: '' });
    const [editandoContrato, setEditandoContrato] = useState(false);
    const [nuevaOb, setNuevaOb] = useState({ descripcion: '', observaciones: '' });
    const [showFormOb, setShowFormOb] = useState(false);
    const [editandoOb, setEditandoOb] = useState(null);
    const [fotoAmpliada, setFotoAmpliada] = useState(null);
    const fotoRef = useRef();

    // ── Estilos base ──────────────────────────────────────────────────────────
    const bg     = isDark ? 'bg-gray-900' : 'bg-gray-50';
    const card   = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200';
    const text   = isDark ? 'text-gray-100' : 'text-gray-900';
    const sub    = isDark ? 'text-gray-400' : 'text-gray-500';
    const inp    = isDark
        ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-indigo-500'
        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-indigo-500';

    const fetchPerfil = useCallback(async () => {
        try {
            const res = await api.get('/perfil');
            setPerfil(res.data);
            if (res.data.tipo_usuario === 'contratista') {
                setContrato({
                    numero_contrato: res.data.numero_contrato ?? '',
                    fecha_inicio:    res.data.fecha_inicio ? res.data.fecha_inicio.slice(0, 10) : '',
                    fecha_fin:       res.data.fecha_fin    ? res.data.fecha_fin.slice(0, 10)    : '',
                    objeto_contrato: res.data.objeto_contrato ?? '',
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchObligaciones = useCallback(async () => {
        try {
            const res = await api.get('/perfil/obligaciones');
            setObligaciones(res.data);
        } catch {}
    }, []);

    useEffect(() => {
        fetchPerfil();
    }, [fetchPerfil]);

    useEffect(() => {
        if (perfil?.tipo_usuario === 'contratista') fetchObligaciones();
    }, [perfil, fetchObligaciones]);

    // ── Progreso ──────────────────────────────────────────────────────────────
    const calcProgreso = () => {
        if (!perfil) return { cargados: 0, total: 0 };
        if (perfil.tipo_usuario === 'contratista') {
            const docs = perfil.documentos_estado ?? {};
            const cargados = (perfil.tiene_foto ? 1 : 0) +
                (perfil.tiene_minuta ? 1 : 0) +
                Object.values(docs).filter(Boolean).length;
            return { cargados, total: 12 };
        }
        const cargados = (perfil.tiene_foto ? 1 : 0) + (perfil.tiene_minuta ? 1 : 0);
        return { cargados, total: 2 };
    };

    const { cargados, total } = calcProgreso();
    const pct = total > 0 ? Math.round((cargados / total) * 100) : 0;
    const barColor = pct === 100 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
    const completo = pct === 100;

    // ── Upload genérico ───────────────────────────────────────────────────────
    const upload = async (key, formData, endpoint) => {
        setUploading(u => ({ ...u, [key]: true }));
        try {
            await api.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            await fetchPerfil();
        } catch (err) {
            alert(err.response?.data?.message ?? 'Error al subir archivo');
        } finally {
            setUploading(u => ({ ...u, [key]: false }));
        }
    };

    const handleFoto = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('foto', file);
        upload('foto', fd, '/perfil/foto');
        e.target.value = '';
    };

    const handleMinuta = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('archivo', file);
        upload('minuta', fd, '/perfil/minuta');
        e.target.value = '';
    };

    const handleDocumento = (tipo, e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('archivo', file);
        upload(tipo, fd, `/perfil/documentos/${tipo}`);
        e.target.value = '';
    };

    const descargar = async (endpoint, nombre) => {
        try {
            const res = await api.get(endpoint, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url; a.download = nombre; a.click();
            URL.revokeObjectURL(url);
        } catch { alert('No se pudo descargar el archivo'); }
    };

    // ── Guardar datos contrato ────────────────────────────────────────────────
    const guardarContrato = async () => {
        setSaving(true);
        try {
            await api.patch('/perfil/datos-contrato', contrato);
            await fetchPerfil();
            setEditandoContrato(false);
        } catch (err) {
            alert(err.response?.data?.message ?? 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    // ── Obligaciones ──────────────────────────────────────────────────────────
    const crearObligacion = async () => {
        if (!nuevaOb.descripcion.trim()) return;
        try {
            await api.post('/perfil/obligaciones', nuevaOb);
            setNuevaOb({ descripcion: '', observaciones: '' });
            setShowFormOb(false);
            fetchObligaciones();
        } catch (err) { alert(err.response?.data?.message ?? 'Error'); }
    };

    const guardarEdicion = async () => {
        if (!editandoOb) return;
        try {
            await api.put(`/perfil/obligaciones/${editandoOb.id}`, editandoOb);
            setEditandoOb(null);
            fetchObligaciones();
        } catch (err) { alert(err.response?.data?.message ?? 'Error'); }
    };

    const eliminarObligacion = async (id) => {
        if (!confirm('¿Eliminar esta obligación?')) return;
        try {
            await api.delete(`/perfil/obligaciones/${id}`);
            fetchObligaciones();
        } catch {}
    };

    if (loading) {
        return (
            <Layout>
                <div className={`min-h-screen ${bg} flex items-center justify-center`}>
                    <p className={sub}>Cargando perfil…</p>
                </div>
            </Layout>
        );
    }

    if (!perfil) {
        return (
            <Layout>
                <div className={`min-h-screen ${bg} flex items-center justify-center`}>
                    <p className="text-red-500">No se encontró el perfil asociado a este usuario.</p>
                </div>
            </Layout>
        );
    }

    const esContratista = perfil.tipo_usuario === 'contratista';

    return (
        <Layout>
            <div className={`min-h-screen ${bg} p-4 md:p-8`}>
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* ── Header con progreso ─────────────────────────────── */}
                    <div className={`rounded-2xl border p-6 ${card}`}>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h1 className={`text-2xl font-bold ${text}`}>Mi Perfil</h1>
                                <p className={`text-sm ${sub}`}>{perfil.nombre} {perfil.apellido}</p>
                            </div>
                            <div className="text-right">
                                <p className={`text-sm font-semibold ${completo ? 'text-green-500' : 'text-red-400'}`}>
                                    {cargados} / {total} documentos cargados
                                </p>
                                <p className={`text-xs ${sub}`}>{pct}% completo</p>
                            </div>
                        </div>
                        <div className={`w-full h-3 rounded-full ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                            <div
                                className={`h-3 rounded-full transition-all duration-500 ${barColor}`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>

                    {/* ── Banner de urgencia ──────────────────────────────── */}
                    {!completo && (
                        <div className="flex items-start gap-3 rounded-xl border border-orange-300 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700 p-4">
                            <AlertTriangle className="text-orange-500 mt-0.5 shrink-0" size={20} />
                            <p className="text-sm text-orange-800 dark:text-orange-300">
                                Hay documentos pendientes de carga. Por favor súbalos lo antes posible — son necesarios para el correcto registro de su vinculación.
                            </p>
                        </div>
                    )}

                    {/* ── Información personal ────────────────────────────── */}
                    <Section title="Información Personal" card={card} text={text}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            {[
                                ['Nombre', `${perfil.nombre} ${perfil.apellido}`],
                                ['Cédula', perfil.cedula],
                                ['Email', perfil.email],
                                ['Teléfono', perfil.telefono ?? '—'],
                                ['Dependencia', perfil.dependencia ?? '—'],
                                ...(perfil.sector ? [['Sector', perfil.sector]] : []),
                                ...(esContratista ? [] : [['Cargo', perfil.cargo ?? '—']]),
                            ].map(([label, value]) => (
                                <div key={label}>
                                    <p className={`text-xs font-medium uppercase tracking-wide ${sub}`}>{label}</p>
                                    <p className={text}>{value}</p>
                                </div>
                            ))}
                        </div>
                    </Section>

                    {/* ── Foto de perfil ──────────────────────────────────── */}
                    <Section title="Foto de Perfil" card={card} text={text}
                        badge={perfil.tiene_foto ? 'ok' : 'pending'}>
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                {perfil.foto_url ? (
                                    <button
                                        type="button"
                                        onClick={() => setFotoAmpliada(perfil.foto_url)}
                                        className="relative w-24 h-24 rounded-full overflow-hidden border-2 border-indigo-400 group focus:outline-none"
                                    >
                                        <img
                                            src={perfil.foto_url}
                                            alt="Foto"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <ZoomIn size={20} className="text-white" />
                                        </div>
                                    </button>
                                ) : (
                                    <div className={`w-24 h-24 rounded-full overflow-hidden flex items-center justify-center ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                                        <User size={40} className={sub} />
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className={`text-sm ${sub} mb-2`}>
                                    {perfil.tiene_foto ? 'Foto cargada. Puede actualizarla.' : 'No ha cargado foto de perfil aún.'}
                                </p>
                                <input ref={fotoRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
                                <button
                                    onClick={() => fotoRef.current?.click()}
                                    disabled={uploading['foto']}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50"
                                >
                                    <Upload size={15} />
                                    {uploading['foto'] ? 'Subiendo…' : perfil.tiene_foto ? 'Cambiar foto' : 'Subir foto'}
                                </button>
                            </div>
                        </div>
                    </Section>

                    {/* ── Datos del contrato (solo contratistas) ──────────── */}
                    {esContratista && (() => {
                        const tieneDatos = !!(contrato.fecha_inicio || contrato.numero_contrato || contrato.objeto_contrato);
                        return (
                        <Section title="Datos del Contrato" card={card} text={text}>
                            {/* Indicador de pendiente cuando no hay datos */}
                            {!tieneDatos && !editandoContrato && (
                                <div className={`mb-4 flex items-start gap-3 rounded-xl border border-yellow-400 p-4 ${isDark ? 'bg-yellow-900/20' : 'bg-yellow-50'}`}>
                                    <AlertTriangle size={18} className="text-yellow-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className={`text-sm font-semibold ${isDark ? 'text-yellow-300' : 'text-yellow-800'}`}>Datos del contrato pendientes</p>
                                        <p className={`text-xs mt-0.5 ${isDark ? 'text-yellow-400' : 'text-yellow-700'}`}>Por favor ingrese los datos de su contrato para completar su perfil.</p>
                                    </div>
                                </div>
                            )}

                            {/* Modo vista */}
                            {!editandoContrato && tieneDatos && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                    {[
                                        ['N° Contrato', contrato.numero_contrato || '—'],
                                        ['Fecha inicio', contrato.fecha_inicio ? new Date(contrato.fecha_inicio + 'T00:00:00').toLocaleDateString('es-CO', { dateStyle: 'medium' }) : '—'],
                                        ['Fecha fin',    contrato.fecha_fin    ? new Date(contrato.fecha_fin    + 'T00:00:00').toLocaleDateString('es-CO', { dateStyle: 'medium' }) : '—'],
                                    ].map(([label, value]) => (
                                        <div key={label}>
                                            <p className={`text-xs font-medium uppercase tracking-wide ${sub}`}>{label}</p>
                                            <p className={text}>{value}</p>
                                        </div>
                                    ))}
                                    {contrato.objeto_contrato && (
                                        <div className="sm:col-span-2">
                                            <p className={`text-xs font-medium uppercase tracking-wide ${sub}`}>Objeto del contrato</p>
                                            <p className={`${text} text-sm leading-relaxed`}>{contrato.objeto_contrato}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Modo edición */}
                            {editandoContrato && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className={`text-xs font-medium uppercase tracking-wide ${sub} block mb-1`}>N° Contrato</label>
                                        <input
                                            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${inp}`}
                                            placeholder="Número de contrato"
                                            value={contrato.numero_contrato}
                                            onChange={e => setContrato(c => ({ ...c, numero_contrato: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label className={`text-xs font-medium uppercase tracking-wide ${sub} block mb-1`}>Fecha inicio</label>
                                        <input
                                            type="date"
                                            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${inp}`}
                                            value={contrato.fecha_inicio}
                                            onChange={e => setContrato(c => ({ ...c, fecha_inicio: e.target.value }))}
                                        />
                                    </div>
                                    <div>
                                        <label className={`text-xs font-medium uppercase tracking-wide ${sub} block mb-1`}>Fecha fin</label>
                                        <input
                                            type="date"
                                            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${inp}`}
                                            value={contrato.fecha_fin}
                                            onChange={e => setContrato(c => ({ ...c, fecha_fin: e.target.value }))}
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className={`text-xs font-medium uppercase tracking-wide ${sub} block mb-1`}>Objeto del contrato</label>
                                        <textarea
                                            rows={3}
                                            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none ${inp}`}
                                            placeholder="Descripción del objeto del contrato"
                                            value={contrato.objeto_contrato}
                                            onChange={e => setContrato(c => ({ ...c, objeto_contrato: e.target.value }))}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Campos extraídos de la minuta (solo lectura) */}
                            {(perfil.valor_contrato || perfil.duracion_contrato || perfil.fecha_suscripcion) && (
                                <div className={`mt-4 p-3 rounded-lg text-sm ${isDark ? 'bg-gray-700/50' : 'bg-gray-50'} grid grid-cols-1 sm:grid-cols-3 gap-3`}>
                                    {perfil.valor_contrato && (
                                        <div>
                                            <p className={`text-xs ${sub}`}>Valor (extraído de minuta)</p>
                                            <p className={text}>{perfil.valor_contrato}</p>
                                        </div>
                                    )}
                                    {perfil.duracion_contrato && (
                                        <div>
                                            <p className={`text-xs ${sub}`}>Duración (extraída)</p>
                                            <p className={text}>{perfil.duracion_contrato}</p>
                                        </div>
                                    )}
                                    {perfil.fecha_suscripcion && (
                                        <div>
                                            <p className={`text-xs ${sub}`}>Fecha suscripción (extraída)</p>
                                            <p className={text}>{perfil.fecha_suscripcion}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Botones */}
                            <div className="mt-4 flex gap-2">
                                {editandoContrato ? (
                                    <>
                                        <button
                                            onClick={guardarContrato}
                                            disabled={saving}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50"
                                        >
                                            <Save size={15} />
                                            {saving ? 'Guardando…' : 'Guardar datos'}
                                        </button>
                                        <button
                                            onClick={() => setEditandoContrato(false)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                        >
                                            Cancelar
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setEditandoContrato(true)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
                                    >
                                        <Pencil size={15} />
                                        {tieneDatos ? 'Editar datos' : 'Ingresar datos del contrato'}
                                    </button>
                                )}
                            </div>
                        </Section>
                        );
                    })()}

                    {/* ── Minuta / Contrato ───────────────────────────────── */}
                    <Section
                        title={esContratista ? 'Minuta del Contrato' : 'Minuta de Vinculación'}
                        card={card} text={text}
                        badge={perfil.tiene_minuta ? 'ok' : 'pending'}
                    >
                        <DocRow
                            nombre={perfil.nombre_minuta}
                            cargado={perfil.tiene_minuta}
                            subiendo={uploading['minuta']}
                            onSubir={handleMinuta}
                            onDescargar={() => descargar('/perfil/minuta', perfil.nombre_minuta ?? 'minuta.pdf')}
                            isDark={isDark} sub={sub}
                        />
                    </Section>

                    {/* ── Documentos legales (solo contratistas) ──────────── */}
                    {esContratista && (
                        <Section title="Documentos Legales" card={card} text={text}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {Object.entries(DOCUMENTOS_LABELS).map(([tipo, label]) => {
                                    const cargado = !!perfil.documentos_estado?.[tipo.replace(/-/g, '_')];
                                    const esSupervisor = tipo === 'resolucion-supervisor';
                                    return (
                                        <div key={tipo} className={`rounded-xl border p-3 ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-100 bg-gray-50'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`text-sm font-medium ${text}`}>{label}</span>
                                                {cargado
                                                    ? <CheckCircle size={16} className="text-green-500 shrink-0" />
                                                    : <XCircle size={16} className="text-red-400 shrink-0" />
                                                }
                                            </div>
                                            {esSupervisor && cargado && perfil.supervisor_nombre && (
                                                <p className={`text-xs ${sub} mb-2`}>
                                                    {perfil.supervisor_nombre}{perfil.supervisor_cedula ? ` · ${perfil.supervisor_cedula}` : ''}
                                                </p>
                                            )}
                                            <DocRow
                                                cargado={cargado}
                                                subiendo={uploading[tipo]}
                                                onSubir={(e) => handleDocumento(tipo, e)}
                                                onDescargar={() => descargar(`/perfil/documentos/${tipo}`, `${tipo}.pdf`)}
                                                compact
                                                isDark={isDark} sub={sub}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </Section>
                    )}

                    {/* ── Mis Obligaciones (solo contratistas) ────────────── */}
                    {esContratista && (
                        <Section title="Mis Obligaciones" card={card} text={text}>
                            <div className="space-y-3">
                                {obligaciones.map(ob => (
                                    <div key={ob.id} className={`rounded-xl border p-3 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                        {editandoOb?.id === ob.id ? (
                                            <div className="space-y-2">
                                                <textarea
                                                    rows={2}
                                                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none resize-none ${inp}`}
                                                    value={editandoOb.descripcion}
                                                    onChange={e => setEditandoOb(o => ({ ...o, descripcion: e.target.value }))}
                                                />
                                                <div className="flex gap-2">
                                                    <button onClick={guardarEdicion} className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs font-medium">Guardar</button>
                                                    <button onClick={() => setEditandoOb(null)} className={`px-3 py-1 rounded-lg text-xs font-medium ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>Cancelar</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm ${text}`}>{ob.descripcion}</p>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button onClick={() => setEditandoOb({ ...ob })} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}>
                                                        <Pencil size={14} className={sub} />
                                                    </button>
                                                    <button onClick={() => eliminarObligacion(ob.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                                                        <Trash2 size={14} className="text-red-400" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {obligaciones.length === 0 && !showFormOb && (
                                    <p className={`text-sm ${sub} text-center py-4`}>No ha registrado obligaciones aún.</p>
                                )}

                                {showFormOb ? (
                                    <div className={`rounded-xl border p-4 space-y-3 ${isDark ? 'border-indigo-700 bg-indigo-900/10' : 'border-indigo-200 bg-indigo-50'}`}>
                                        <textarea
                                            rows={2}
                                            className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none resize-none ${inp}`}
                                            placeholder="Descripción de la obligación…"
                                            value={nuevaOb.descripcion}
                                            onChange={e => setNuevaOb(o => ({ ...o, descripcion: e.target.value }))}
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={crearObligacion} className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium">Agregar</button>
                                            <button onClick={() => { setShowFormOb(false); setNuevaOb({ descripcion: '', observaciones: '' }); }}
                                                className={`px-4 py-1.5 rounded-lg text-sm font-medium ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowFormOb(true)}
                                        className={`flex items-center gap-2 w-full justify-center py-2 rounded-xl border-2 border-dashed text-sm font-medium transition-colors ${isDark ? 'border-gray-600 text-gray-400 hover:border-indigo-500 hover:text-indigo-400' : 'border-gray-300 text-gray-500 hover:border-indigo-400 hover:text-indigo-600'}`}
                                    >
                                        <Plus size={16} /> Agregar obligación
                                    </button>
                                )}
                            </div>
                        </Section>
                    )}

                </div>
            </div>

            {/* Lightbox foto */}
            {fotoAmpliada && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setFotoAmpliada(null)}>
                    <button onClick={() => setFotoAmpliada(null)} className="fixed top-4 right-4 z-50 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition">
                        <X size={24} />
                    </button>
                    <img src={fotoAmpliada} alt="Foto ampliada" className="max-w-sm w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain" onClick={e => e.stopPropagation()} />
                </div>
            )}
        </Layout>
    );
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function Section({ title, children, card, text, badge }) {
    return (
        <div className={`rounded-2xl border p-6 ${card}`}>
            <div className="flex items-center justify-between mb-4">
                <h2 className={`text-base font-semibold ${text}`}>{title}</h2>
                {badge === 'ok'      && <CheckCircle size={18} className="text-green-500" />}
                {badge === 'pending' && <XCircle size={18} className="text-red-400" />}
            </div>
            {children}
        </div>
    );
}

function DocRow({ nombre, cargado, subiendo, onSubir, onDescargar, compact = false, isDark, sub }) {
    const fileRef = useRef();
    return (
        <div className={`flex items-center gap-2 ${compact ? 'flex-wrap' : ''}`}>
            <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={onSubir} />
            <button
                onClick={() => fileRef.current?.click()}
                disabled={subiendo}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 ${
                    cargado
                        ? isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
            >
                <Upload size={13} />
                {subiendo ? 'Subiendo…' : cargado ? 'Reemplazar' : 'Subir PDF'}
            </button>
            {cargado && (
                <button
                    onClick={onDescargar}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    <Download size={13} />
                    {!compact && nombre ? nombre.substring(0, 30) : 'Descargar'}
                </button>
            )}
        </div>
    );
}
