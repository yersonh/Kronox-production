import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import {
    X, User, Mail, Phone, MessageCircle, CreditCard, Building2, Briefcase,
    FileText, Calendar, Download, FileCheck2, FileX2, CheckCircle2, Clock,
    AlertTriangle, Ban, BookOpen, Scale, Heart, Shield, BadgeCheck, RefreshCw,
    ClipboardList, Circle, AlertCircle, Loader2, ScrollText
} from 'lucide-react';

const DOCS_CONFIG = [
    { key: 'estudios_previos',       endpoint: 'estudios-previos',       label: 'Estudios Previos',         icon: BookOpen },
    { key: 'registro_presupuestal',  endpoint: 'registro-presupuestal',  label: 'Registro Presupuestal',    icon: FileText },
    { key: 'rut',                    endpoint: 'rut',                    label: 'RUT (DIAN)',                icon: FileText },
    { key: 'polizas',                endpoint: 'polizas',                label: 'Pólizas',                  icon: Shield },
    { key: 'arl',                    endpoint: 'arl',                    label: 'ARL',                      icon: Heart },
    { key: 'paz_salvo_parafiscales', endpoint: 'paz-salvo-parafiscales', label: 'Paz y Salvo Parafiscales', icon: CheckCircle2 },
    { key: 'seguridad_social',       endpoint: 'seguridad-social',       label: 'Afil. Seguridad Social',   icon: Heart },
    { key: 'certificacion_bancaria', endpoint: 'certificacion-bancaria', label: 'Certificación Bancaria',   icon: FileText },
    { key: 'resolucion_supervisor',  endpoint: 'resolucion-supervisor',  label: 'Resolución Supervisor',    icon: FileText },
    { key: 'acta_inicio',            endpoint: 'acta-inicio',            label: 'Acta de Inicio',           icon: FileText },
];

const ESTADO_CFG = {
    vigente:    { label: 'Vigente',    cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: <CheckCircle2 size={13} /> },
    por_vencer: { label: 'Por vencer', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse', icon: <Clock size={13} /> },
    vencido:    { label: 'Vencido',    cls: 'bg-red-500/15 text-red-400 border-red-500/30',    icon: <AlertTriangle size={13} /> },
    suspendido: { label: 'Suspendido', cls: 'bg-gray-500/15 text-gray-400 border-gray-500/30', icon: <Ban size={13} /> },
};

const TABS = ['Contrato', 'Datos personales', 'Documentos', 'Obligaciones'];

export default function ContratistaDetalleModal({ contratista: c, isDark, onClose }) {
    const [tab, setTab] = useState(0);
    const [obligaciones, setObligaciones] = useState([]);
    const [loadingObl, setLoadingObl] = useState(false);

    useEffect(() => {
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [onClose]);

    useEffect(() => {
        if (tab === 3) {
            setLoadingObl(true);
            api.get(`/contratistas/${c.id}/obligaciones`)
                .then(r => setObligaciones(r.data))
                .catch(() => setObligaciones([]))
                .finally(() => setLoadingObl(false));
        }
    }, [tab, c.id]);

    const descargar = async (endpoint) => {
        try {
            const path = endpoint === 'minuta'
                ? `/contratistas/${c.id}/minuta`
                : `/contratistas/${c.id}/documentos/${endpoint}`;
            const res = await api.get(path, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 15000);
        } catch {}
    };

    const estado    = c.estado_contrato ?? 'vigente';
    const estadoCfg = ESTADO_CFG[estado] ?? ESTADO_CFG.vigente;
    const dias      = c.fecha_fin ? Math.ceil((new Date(String(c.fecha_fin).substring(0, 10) + 'T12:00:00') - new Date()) / 86400000) : null;

    const docsTotal   = 11;
    const docsCargados = (c.tiene_minuta ? 1 : 0) + Object.values(c.documentos_estado ?? {}).filter(Boolean).length;

    const fmtFecha = (s) => {
        if (!s) return '—';
        const d = new Date(String(s).substring(0, 10) + 'T12:00:00');
        if (isNaN(d)) return '—';
        return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const row = (label, value, icon) => (
        <div className={`flex items-start gap-3 py-3 border-b last:border-0 ${isDark ? 'border-gray-700/50' : 'border-gray-100'}`}>
            <span className={`mt-0.5 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{icon}</span>
            <div className="min-w-0">
                <p className={`text-xs mb-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{label}</p>
                <p className={`text-sm font-medium break-words ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{value || '—'}</p>
            </div>
        </div>
    );

    // Progreso del contrato
    let progreso = 0;
    if (c.fecha_inicio && c.fecha_fin) {
        const inicio = new Date(String(c.fecha_inicio).substring(0, 10) + 'T12:00:00');
        const fin    = new Date(String(c.fecha_fin).substring(0, 10) + 'T12:00:00');
        progreso = Math.min(100, Math.max(0, Math.round(((new Date() - inicio) / (fin - inicio)) * 100)));
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className={`relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>

                {/* ── Header con foto ──────────────────────────────────── */}
                <div className={`relative px-6 pt-6 pb-4 flex items-center gap-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                    <div className="relative flex-shrink-0">
                        <img
                            src={c.persona?.foto_url ?? '/images/imagendefault.png'}
                            alt=""
                            className="w-16 h-16 rounded-2xl object-cover shadow-md border-2 border-white dark:border-gray-600"
                            onError={e => { e.target.src = '/images/imagendefault.png'; }}
                        />
                        {c.es_lider && (
                            <span className="absolute -bottom-1.5 -right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-indigo-600 text-white shadow">
                                Líder
                            </span>
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h2 className={`text-xl font-bold leading-tight truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {c.persona?.nombres} {c.persona?.apellidos}
                        </h2>
                        <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            C.C. {c.persona?.numero_identificacion} · {c.dependencia?.nombre ?? '—'}
                        </p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${estadoCfg.cls}`}>
                                {estadoCfg.icon} {estadoCfg.label}
                                {dias !== null && dias >= 0 && dias <= 30 && ` — ${dias}d`}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                Docs: {docsCargados}/{docsTotal}
                            </span>
                            {c.numero_contrato && (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                    N° {c.numero_contrato}
                                </span>
                            )}
                        </div>
                    </div>

                    <button onClick={onClose} className={`absolute top-4 right-4 p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                        <X size={18} />
                    </button>
                </div>

                {/* ── Tabs ─────────────────────────────────────────────── */}
                <div className={`flex border-b px-6 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                    {TABS.map((t, i) => (
                        <button key={t} onClick={() => setTab(i)}
                            className={`px-3 py-3 text-sm font-medium border-b-2 transition -mb-px ${tab === i
                                ? isDark ? 'border-indigo-400 text-indigo-400' : 'border-indigo-600 text-indigo-600'
                                : isDark ? 'border-transparent text-gray-500 hover:text-gray-300' : 'border-transparent text-gray-400 hover:text-gray-700'
                            }`}>
                            {t}
                            {t === 'Obligaciones' && obligaciones.length > 0 && (
                                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>
                                    {obligaciones.length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Contenido ────────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* Tab 0: Contrato */}
                    {tab === 0 && (
                        <div className="space-y-4">
                            {/* Barra de progreso */}
                            {c.fecha_inicio && c.fecha_fin && (
                                <div className={`rounded-xl p-4 ${isDark ? 'bg-gray-700/40' : 'bg-gray-50'}`}>
                                    <div className="flex justify-between text-xs mb-2">
                                        <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Tiempo transcurrido del contrato</span>
                                        <span className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{progreso}%</span>
                                    </div>
                                    <div className={`w-full rounded-full h-2.5 ${isDark ? 'bg-gray-600' : 'bg-gray-200'}`}>
                                        <div
                                            className={`h-2.5 rounded-full transition-all duration-700 ${estado === 'vencido' ? 'bg-red-500' : estado === 'por_vencer' ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                            style={{ width: `${progreso}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs mt-1.5">
                                        <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>{fmtFecha(c.fecha_inicio)}</span>
                                        <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>{fmtFecha(c.fecha_fin)}</span>
                                    </div>
                                </div>
                            )}

                            {estado === 'suspendido' && c.motivo_suspension && (
                                <div className={`flex items-start gap-2 p-3 rounded-xl ${isDark ? 'bg-gray-500/10 border border-gray-500/20' : 'bg-gray-50 border border-gray-200'}`}>
                                    <Ban size={14} className={`mt-0.5 flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                                    <div>
                                        <p className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Motivo de suspensión</p>
                                        <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{c.motivo_suspension}</p>
                                    </div>
                                </div>
                            )}

                            <div>
                                {row('N° de contrato',     c.numero_contrato,              <FileText size={15} />)}
                                {row('Dependencia',        c.dependencia?.nombre,          <Building2 size={15} />)}
                                {row('Sector',             c.sector?.nombre,               <Briefcase size={15} />)}
                                {row('Fecha inicio',       fmtFecha(c.fecha_inicio),       <Calendar size={15} />)}
                                {row('Fecha fin',          fmtFecha(c.fecha_fin),          <Calendar size={15} />)}
                            </div>

                            {c.objeto_contrato && (
                                <div className={`rounded-xl p-4 ${isDark ? 'bg-gray-700/40' : 'bg-gray-50'}`}>
                                    <p className={`text-xs font-medium mb-2 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        <ScrollText size={13} /> Objeto del contrato
                                    </p>
                                    <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{c.objeto_contrato}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab 1: Datos personales */}
                    {tab === 1 && (
                        <div className="flex gap-6">
                            <div className="flex-shrink-0">
                                <img
                                    src={c.persona?.foto_url ?? '/images/imagendefault.png'}
                                    alt=""
                                    className="w-24 h-24 rounded-2xl object-cover shadow border-2 border-white dark:border-gray-600"
                                    onError={e => { e.target.src = '/images/imagendefault.png'; }}
                                />
                            </div>
                            <div className="flex-1">
                                {row('Nombre completo', `${c.persona?.nombres} ${c.persona?.apellidos}`, <User size={15} />)}
                                {row('Cédula',      c.persona?.numero_identificacion,    <CreditCard size={15} />)}
                                {row('Email',       c.persona?.email,     <Mail size={15} />)}
                                {row('Teléfono',    c.persona?.telefono,  <Phone size={15} />)}
                                {row('WhatsApp',    c.persona?.whatsapp,  <MessageCircle size={15} />)}
                            </div>
                        </div>
                    )}

                    {/* Tab 2: Documentos */}
                    {tab === 2 && (
                        <div className="space-y-2">
                            {/* Minuta */}
                            <DocRow
                                label="Minuta de Contrato"
                                icon={<FileText size={15} />}
                                existe={c.tiene_minuta}
                                isDark={isDark}
                                onDescargar={() => descargar('minuta')}
                            />
                            <div className={`my-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`} />
                            {DOCS_CONFIG.map(({ key, endpoint, label, icon: Icon }) => (
                                <DocRow
                                    key={key}
                                    label={label}
                                    icon={<Icon size={15} />}
                                    existe={c.documentos_estado?.[key] ?? false}
                                    isDark={isDark}
                                    onDescargar={() => descargar(endpoint)}
                                />
                            ))}
                            <p className={`text-xs text-right mt-3 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                {docsCargados} de {docsTotal} documentos cargados
                            </p>
                        </div>
                    )}

                    {/* Tab 3: Obligaciones */}
                    {tab === 3 && (
                        loadingObl ? (
                            <div className="flex justify-center py-12">
                                <Loader2 size={28} className="animate-spin text-indigo-500" />
                            </div>
                        ) : obligaciones.length === 0 ? (
                            <div className={`text-center py-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                <ClipboardList size={40} className="mx-auto mb-3 opacity-30" />
                                <p className="text-sm">Sin obligaciones registradas</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {obligaciones.map(o => (
                                    <div key={o.id} className={`rounded-xl border p-4 ${isDark ? 'bg-gray-700/40 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                        <div className="flex items-start gap-3">
                                            <ClipboardList size={16} className={`mt-0.5 flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                                            <p className={`text-sm flex-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{o.descripcion}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

function DocRow({ label, icon, existe, isDark, onDescargar }) {
    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${isDark ? 'bg-gray-700/30' : 'bg-gray-50'}`}>
            <span className={existe ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-gray-600' : 'text-gray-300')}>
                {icon}
            </span>
            <span className={`flex-1 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</span>
            {existe ? (
                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-xs ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                        <FileCheck2 size={12} /> Cargado
                    </span>
                    <button onClick={onDescargar}
                        className={`p-1.5 rounded-lg transition ${isDark ? 'text-emerald-500 hover:bg-gray-600' : 'text-emerald-600 hover:bg-gray-200'}`}
                        title="Descargar">
                        <Download size={14} />
                    </button>
                </div>
            ) : (
                <span className={`inline-flex items-center gap-1 text-xs ${isDark ? 'text-gray-600' : 'text-gray-300'}`}>
                    <FileX2 size={12} /> Sin cargar
                </span>
            )}
        </div>
    );
}
