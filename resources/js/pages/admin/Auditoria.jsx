// resources/js/pages/admin/Auditoria.jsx
import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { useTheme } from '../../hooks/useTheme';
import { AlertTriangle, Clock, RefreshCw, Search, X, Building2, FileDown, FileSpreadsheet, Filter } from 'lucide-react';

const ANIO_ACTUAL = new Date().getFullYear();
const MES_ACTUAL  = new Date().getMonth() + 1;

function pad(n) { return String(n).padStart(2, '0'); }
function lastDay(y, m) { return new Date(y, m, 0).getDate(); }

function buildParams(tipo, anio, mes, semestre) {
    if (tipo === 'todo') return {};
    if (tipo === 'mes') return {
        desde: `${anio}-${pad(mes)}-01`,
        hasta: `${anio}-${pad(mes)}-${lastDay(anio, mes)}`,
    };
    if (tipo === 'año') {
        if (semestre === 1) return { desde: `${anio}-01-01`, hasta: `${anio}-06-30` };
        if (semestre === 2) return { desde: `${anio}-07-01`, hasta: `${anio}-12-31` };
        return { desde: `${anio}-01-01`, hasta: `${anio}-12-31` };
    }
    return {};
}

function periodoLabel(tipo, anio, mes, semestre) {
    if (tipo === 'todo') return 'Todo el tiempo';
    if (tipo === 'mes') return new Date(anio, mes - 1, 1).toLocaleString('es-CO', { month: 'long', year: 'numeric' });
    if (tipo === 'año') {
        if (semestre === 1) return `1er semestre ${anio}`;
        if (semestre === 2) return `2do semestre ${anio}`;
        return `Año ${anio}`;
    }
    return '';
}
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fetchEntidadPublica } from '../../utils/pdfExport';

function diasBadge(dias) {
    if (dias >= 7) return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
    if (dias >= 3) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
    return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300';
}

function ModalDependencias({ dependencias, onClose, isDark }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className={`relative w-full max-w-sm rounded-2xl shadow-2xl ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                        <Building2 size={16} className="text-indigo-500" />
                        <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            Dependencias involucradas
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                        <X size={18} />
                    </button>
                </div>
                <ul className="px-5 py-4 space-y-2 max-h-72 overflow-y-auto">
                    {dependencias.map((dep) => (
                        <li key={dep} className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                            {dep}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

function CeldaDependencias({ deps, isDark }) {
    const [modalAbierto, setModalAbierto] = useState(false);
    const MAX_VISIBLE = 1;

    if (!deps || deps.length === 0) {
        return <span className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>—</span>;
    }

    return (
        <>
            <div className="flex items-center gap-1.5 flex-wrap">
                <span className={`px-2 py-0.5 rounded-md text-xs whitespace-nowrap ${isDark ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-50 text-indigo-700'}`}>
                    {deps[0]}
                </span>
                {deps.length > MAX_VISIBLE && (
                    <button
                        onClick={() => setModalAbierto(true)}
                        className={`px-2 py-0.5 rounded-md text-xs font-medium transition whitespace-nowrap ${
                            isDark
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        +{deps.length - MAX_VISIBLE} más
                    </button>
                )}
            </div>
            {modalAbierto && (
                <ModalDependencias
                    dependencias={deps}
                    onClose={() => setModalAbierto(false)}
                    isDark={isDark}
                />
            )}
        </>
    );
}

export default function Auditoria() {
    const { isDark } = useTheme();
    const [eventos, setEventos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [filtroDep, setFiltroDep] = useState('');
    const [dependencias, setDependencias] = useState([]);

    // Filtros de período
    const [filtroTipo, setFiltroTipo] = useState('todo');
    const [filtroAnio, setFiltroAnio] = useState(ANIO_ACTUAL);
    const [filtroMes,  setFiltroMes]  = useState(MES_ACTUAL);
    const [semestre,   setSemestre]   = useState(0);

    const params = useMemo(
        () => buildParams(filtroTipo, filtroAnio, filtroMes, semestre),
        [filtroTipo, filtroAnio, filtroMes, semestre]
    );

    useEffect(() => { cargar(params); }, [filtroTipo, filtroAnio, filtroMes, semestre]);

    const cargar = async (p = {}) => {
        setLoading(true);
        try {
            const [audRes, depRes] = await Promise.all([
                api.get('/auditoria/eventos-vencidos', { params: p }),
                api.get('/dependencias'),
            ]);
            setEventos(audRes.data);
            setDependencias(depRes.data.data ?? depRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const anios = Array.from({ length: 5 }, (_, i) => ANIO_ACTUAL - i);
    const meses = [
        'Enero','Febrero','Marzo','Abril','Mayo','Junio',
        'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
    ];

    const pillCls = (active) => `px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer border ${
        active
            ? 'bg-indigo-600 text-white border-indigo-600'
            : isDark
                ? 'bg-gray-700 text-gray-300 border-gray-600 hover:border-indigo-500'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-400'
    }`;
    const selCls = `px-2 py-1.5 rounded-lg text-xs border outline-none transition ${
        isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-700'
    }`;

    const eventosFiltrados = eventos.filter((e) => {
        const matchBusqueda = !busqueda ||
            e.tema?.toLowerCase().includes(busqueda.toLowerCase()) ||
            e.numero?.toString().includes(busqueda) ||
            `${e.responsable?.nombre} ${e.responsable?.apellido}`.toLowerCase().includes(busqueda.toLowerCase());
        const matchDep = !filtroDep || e.dependencias?.includes(filtroDep);
        return matchBusqueda && matchDep;
    });

    const cardBase = isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200 shadow-sm';
    const inputBase = `px-3 py-2 rounded-lg text-sm border outline-none transition w-full ${
        isDark
            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-indigo-500'
            : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:border-indigo-400'
    }`;

    const filaParaExport = (ev) => ({
        Nro:            ev.numero ?? ev.id,
        Tema:           ev.tema ?? '',
        Estado:         ev.estado === 'cerrado' ? 'Sin finalizar' : 'En curso vencido',
        'Tipo evento':  ev.tipo_evento ?? '',
        'Fecha fin':    ev.fecha_hora_fin
            ? new Date(ev.fecha_hora_fin).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
            : '',
        Responsable:    ev.responsable ? `${ev.responsable.nombre} ${ev.responsable.apellido}` : '',
        Dependencias:   (ev.dependencias ?? []).join(' | '),
        'Días vencido': ev.dias_vencido === 0 ? 'Hoy' : `${ev.dias_vencido} días`,
    });

    const exportarPDF = async () => {
        const NAVY  = [35, 45, 65];
        const WHITE = [255, 255, 255];
        const GRAY  = [90, 95, 110];
        const ROW   = [246, 247, 249];

        const entidad = await fetchEntidadPublica();

        const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
        const W  = doc.internal.pageSize.getWidth();
        const PH = doc.internal.pageSize.getHeight();
        const ML = 40;
        const MR = 40;

        // ── Header institucional ──────────────────────────────────────────────
        const logoSz  = 52;
        const headerY = 14;

        if (entidad.logo) {
            const fmt = entidad.logo.split(';')[0].split('/')[1]?.toUpperCase() ?? 'JPEG';
            try { doc.addImage(entidad.logo, fmt, ML, headerY, logoSz, logoSz); } catch {}
        }

        const textX = entidad.logo ? ML + logoSz + 12 : ML;

        if (entidad.nombre) {
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...GRAY);
            doc.text(entidad.nombre.toUpperCase(), textX, headerY + 13);
        }
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...NAVY);
        doc.text('AUDITORÍA DE EVENTOS — SIN FINALIZAR', textX, headerY + 30);

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...GRAY);
        doc.text(
            `Generado el ${new Date().toLocaleString('es-CO')} · ${eventosFiltrados.length} registro(s)`,
            textX, headerY + 44,
        );

        const divY = headerY + logoSz + 8;
        doc.setDrawColor(185, 190, 200);
        doc.setLineWidth(0.5);
        doc.line(ML, divY, W - MR, divY);

        // ── Tabla ─────────────────────────────────────────────────────────────
        autoTable(doc, {
            startY: divY + 10,
            head: [['Nro', 'Tema', 'Estado', 'Tipo', 'Fecha fin', 'Responsable', 'Dependencias', 'Días']],
            body: eventosFiltrados.map((ev) => [
                ev.numero ?? ev.id,
                ev.tema ?? '',
                ev.estado === 'cerrado' ? 'Sin finalizar' : 'En curso vencido',
                ev.tipo_evento ?? '',
                ev.fecha_hora_fin
                    ? new Date(ev.fecha_hora_fin).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : '',
                ev.responsable ? `${ev.responsable.nombre} ${ev.responsable.apellido}` : '',
                (ev.dependencias ?? []).join('\n'),
                ev.dias_vencido === 0 ? 'Hoy' : `${ev.dias_vencido}d`,
            ]),
            styles:             { fontSize: 8, cellPadding: 5, overflow: 'linebreak', textColor: [20, 20, 30] },
            headStyles:         { fillColor: NAVY, textColor: WHITE, fontStyle: 'bold', fontSize: 8 },
            alternateRowStyles: { fillColor: ROW },
            tableLineColor:     [185, 190, 200],
            tableLineWidth:     0.3,
            columnStyles: {
                0: { cellWidth: 60 },
                1: { cellWidth: 150 },
                2: { cellWidth: 80 },
                3: { cellWidth: 72 },
                4: { cellWidth: 95 },
                5: { cellWidth: 118 },
                6: { cellWidth: 130 },
                7: { cellWidth: 36 },
            },
            didDrawPage: (data) => {
                if (data.pageNumber > 1) {
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(...NAVY);
                    doc.text('AUDITORÍA DE EVENTOS — Sin finalizar (cont.)', ML, 24);
                    doc.setDrawColor(185, 190, 200);
                    doc.setLineWidth(0.5);
                    doc.line(ML, 30, W - MR, 30);
                }
            },
        });

        // ── Footer en todas las páginas ───────────────────────────────────────
        const totalPages = doc.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...GRAY);
            doc.text(
                `Desarrollado por NexGovIA S.A.S.® · Página ${p} de ${totalPages}`,
                W / 2, PH - 10, { align: 'center' },
            );
        }

        doc.save(`auditoria_eventos_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    const exportarExcel = () => {
        const COLS = [
            { label: 'Nro',           width: 100 },
            { label: 'Tema',          width: 280 },
            { label: 'Estado',        width: 130 },
            { label: 'Tipo evento',   width: 150 },
            { label: 'Fecha fin',     width: 160 },
            { label: 'Responsable',   width: 200 },
            { label: 'Dependencias',  width: 350 },
            { label: 'Días vencido',  width: 100 },
        ];

        const esc = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

        const colsXml = COLS.map((c) => `<Column ss:Width="${c.width}"/>`).join('');

        const headerXml = '<Row ss:StyleID="header">' +
            COLS.map((c) => `<Cell><Data ss:Type="String">${esc(c.label)}</Data></Cell>`).join('') +
            '</Row>';

        const rowsXml = eventosFiltrados.map((ev) => {
            const vals = [
                ev.numero ?? ev.id,
                ev.tema ?? '',
                ev.estado === 'cerrado' ? 'Sin finalizar' : 'En curso vencido',
                ev.tipo_evento ?? '',
                ev.fecha_hora_fin
                    ? new Date(ev.fecha_hora_fin).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : '',
                ev.responsable ? `${ev.responsable.nombre} ${ev.responsable.apellido}` : '',
                (ev.dependencias ?? []).join(' | '),
                ev.dias_vencido === 0 ? 'Hoy' : `${ev.dias_vencido} días`,
            ];
            return '<Row>' + vals.map((v) => `<Cell><Data ss:Type="String">${esc(v)}</Data></Cell>`).join('') + '</Row>';
        }).join('');

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:x="urn:schemas-microsoft-com:office:excel">
  <Styles>
    <Style ss:ID="header">
      <Font ss:Bold="1" ss:Color="#FFFFFF" ss:Size="10"/>
      <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
      <Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="0"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Auditoria">
    <Table>${colsXml}${headerXml}${rowsXml}</Table>
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
      <FreezePanes/>
      <FrozenNoSplit/>
      <SplitHorizontal>1</SplitHorizontal>
      <TopRowBottomPane>1</TopRowBottomPane>
    </WorksheetOptions>
  </Worksheet>
</Workbook>`;

        const blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `auditoria_eventos_${new Date().toISOString().slice(0, 10)}.xls`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            Auditoría de Eventos
                        </h1>
                        <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Eventos realizados que el líder responsable no finalizó
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={exportarExcel}
                            disabled={eventosFiltrados.length === 0}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <FileSpreadsheet size={15} />
                            Excel
                        </button>
                        <button
                            onClick={exportarPDF}
                            disabled={eventosFiltrados.length === 0}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <FileDown size={15} />
                            PDF
                        </button>
                        <button
                            onClick={() => cargar(params)}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition"
                        >
                            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                            Actualizar
                        </button>
                    </div>
                </div>

                {/* Resumen */}
                <div className={`flex items-center gap-3 p-4 rounded-xl ${
                    eventosFiltrados.length > 0
                        ? isDark ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
                        : filtroTipo !== 'todo'
                            ? isDark ? 'bg-gray-700/40 border border-gray-600' : 'bg-gray-50 border border-gray-200'
                            : isDark ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'
                }`}>
                    {eventosFiltrados.length > 0
                        ? <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
                        : filtroTipo !== 'todo'
                            ? <Filter size={20} className={isDark ? 'text-gray-400 flex-shrink-0' : 'text-gray-400 flex-shrink-0'} />
                            : <Clock size={20} className="text-green-500 flex-shrink-0" />
                    }
                    <p className={`text-sm font-medium ${
                        eventosFiltrados.length > 0
                            ? isDark ? 'text-red-300' : 'text-red-700'
                            : filtroTipo !== 'todo'
                                ? isDark ? 'text-gray-400' : 'text-gray-500'
                                : isDark ? 'text-green-300' : 'text-green-700'
                    }`}>
                        {eventosFiltrados.length > 0
                            ? `${eventosFiltrados.length} evento${eventosFiltrados.length !== 1 ? 's' : ''} sin finalizar por el responsable`
                            : filtroTipo !== 'todo'
                                ? `Sin eventos sin finalizar en ${periodoLabel(filtroTipo, filtroAnio, filtroMes, semestre)}`
                                : 'Sin eventos vencidos pendientes — todo está al día'
                        }
                    </p>
                </div>

                {/* Filtro de período */}
                <div className={`p-4 rounded-xl ${cardBase}`}>
                    <div className="flex items-center gap-2 mb-3">
                        <Filter size={14} className="text-indigo-500" />
                        <span className={`text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Período</span>
                        {filtroTipo !== 'todo' && (
                            <span className={`ml-auto text-[11px] px-2 py-0.5 rounded-full font-medium ${isDark ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
                                {periodoLabel(filtroTipo, filtroAnio, filtroMes, semestre)}
                            </span>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button className={pillCls(filtroTipo === 'todo')} onClick={() => setFiltroTipo('todo')}>Todo</button>
                        <button className={pillCls(filtroTipo === 'mes')}  onClick={() => setFiltroTipo('mes')}>Por mes</button>
                        <button className={pillCls(filtroTipo === 'año')}  onClick={() => setFiltroTipo('año')}>Por año</button>

                        <select value={filtroAnio} onChange={(e) => setFiltroAnio(Number(e.target.value))} className={selCls}>
                            {anios.map((a) => <option key={a} value={a}>{a}</option>)}
                        </select>

                        {filtroTipo === 'mes' && (
                            <select value={filtroMes} onChange={(e) => setFiltroMes(Number(e.target.value))} className={selCls}>
                                {meses.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                            </select>
                        )}

                        {filtroTipo === 'año' && (
                            <>
                                <button className={pillCls(semestre === 0)} onClick={() => setSemestre(0)}>Todo el año</button>
                                <button className={pillCls(semestre === 1)} onClick={() => setSemestre(1)}>1er semestre</button>
                                <button className={pillCls(semestre === 2)} onClick={() => setSemestre(2)}>2do semestre</button>
                            </>
                        )}
                    </div>
                </div>

                {/* Filtros de búsqueda y dependencia */}
                <div className={`p-4 rounded-xl ${cardBase}`}>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por tema, nro o responsable..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                                className={`${inputBase} pl-9`}
                            />
                            {busqueda && (
                                <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        <select
                            value={filtroDep}
                            onChange={(e) => setFiltroDep(e.target.value)}
                            className={`${inputBase} sm:w-56`}
                        >
                            <option value="">Todas las dependencias</option>
                            {dependencias.map((d) => (
                                <option key={d.id} value={d.nombre}>{d.nombre}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Tabla */}
                <div className={`rounded-xl overflow-hidden ${cardBase}`}>
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
                        </div>
                    ) : eventosFiltrados.length === 0 ? (
                        <div className="text-center py-16">
                            <Clock size={36} className="mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                No hay eventos vencidos que coincidan con los filtros
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className={isDark ? 'bg-gray-700/50' : 'bg-gray-50'}>
                                        {['Nro', 'Tema', 'Estado', 'Tipo', 'Fecha fin', 'Responsable', 'Dependencias', 'Días'].map((h) => (
                                            <th key={h} className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {eventosFiltrados.map((ev) => (
                                        <tr key={ev.id} className={`transition-colors ${isDark ? 'hover:bg-gray-700/30' : 'hover:bg-gray-50'}`}>
                                            <td className={`px-4 py-3 font-mono text-xs font-medium whitespace-nowrap ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                                                {ev.numero ?? ev.id}
                                            </td>
                                            <td className={`px-4 py-3 font-medium ${isDark ? 'text-white' : 'text-gray-800'}`} style={{ maxWidth: '200px' }}>
                                                <span className="line-clamp-2">{ev.tema}</span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                {ev.estado === 'cerrado' ? (
                                                    <span className="px-2 py-1 rounded-md text-xs font-medium bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                                                        Sin finalizar
                                                    </span>
                                                ) : (
                                                    <span className="px-2 py-1 rounded-md text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300">
                                                        En curso
                                                    </span>
                                                )}
                                            </td>
                                            <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                                {ev.tipo_evento ?? '—'}
                                            </td>
                                            <td className={`px-4 py-3 whitespace-nowrap text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                                {ev.fecha_hora_fin
                                                    ? new Date(ev.fecha_hora_fin).toLocaleString('es-CO', {
                                                        day: '2-digit', month: '2-digit', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit'
                                                    })
                                                    : '—'}
                                            </td>
                                            <td className={`px-4 py-3 whitespace-nowrap text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                                                {ev.responsable
                                                    ? `${ev.responsable.nombre} ${ev.responsable.apellido}`
                                                    : '—'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <CeldaDependencias deps={ev.dependencias} isDark={isDark} />
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${diasBadge(ev.dias_vencido)}`}>
                                                    {ev.dias_vencido === 0 ? 'Hoy' : `${ev.dias_vencido}d`}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
