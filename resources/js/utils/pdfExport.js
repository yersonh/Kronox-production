import { jsPDF } from 'jspdf';
import 'jspdf/dist/polyfills.es.js';
import api from '../api/axios';

// Paleta institucional formal — sin azules llamativos
const INST = {
    navyDark:  [199, 201, 205], // cabeceras de tabla / sección (gris medio, mismo tono de Tabla 7)
    navyMid:   [224, 225, 228], // sub-cabeceras de ítem (gris claro, texto oscuro)
    navyFg:    [20, 20, 30],    // texto sobre fondo de cabecera
    rowAlt:    [246, 247, 249], // fila alternada
    border:    [185, 190, 200], // bordes de tabla
    text:      [20, 20, 30],    // texto principal
    textMid:   [90, 95, 110],   // texto secundario
};

function fmtFecha(str) {
    if (!str) return '—';
    return new Date(str).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}

function fmtFechaCorta(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('es-CO', { dateStyle: 'medium' });
}

// ─── Auxiliar de Informe ──────────────────────────────────────────────────────

export async function fetchBase64(url) {
    try {
        const res = await api.get(url, { responseType: 'blob' });
        return await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(res.data);
        });
    } catch {
        return null;
    }
}

export async function fetchEntidadPublica() {
    try {
        const [cfg, logo] = await Promise.all([
            api.get('/entidad-config/public'),
            fetchBase64('/entidad-config/logo'),
        ]);
        return { nombre: cfg.data?.nombre ?? '', logo };
    } catch {
        return { nombre: '', logo: null };
    }
}

const TIPO_LABEL = { evento: 'EVENTO', tarea: 'TAREA', compromiso: 'COMPROMISO' };

// Draws the institutional page header (logo | name + contract | cuenta / página).
// Returns y position after the header.
function drawAuxiliarHeader(doc, W, ML, entidad, contratista = null, cuenta = '01', pageNum = 1) {
    const H      = 22;
    const TOP    = 8;
    const IW     = W - ML - 24; // 24 = right margin
    const logoW  = entidad.logo ? 28 : 0;
    const rightW = 36;
    const labelW = 20;

    doc.setDrawColor(...INST.border);
    doc.setLineWidth(0.3);
    doc.rect(ML, TOP, IW, H);

    // Logo — dibujado como cuadrado proporcional centrado en su columna
    if (entidad.logo) {
        const fmt    = entidad.logo.split(';')[0].split('/')[1]?.toUpperCase() ?? 'JPEG';
        const imgSz  = H - 4;
        const imgX   = ML + (logoW - imgSz) / 2;
        const imgY   = TOP + (H - imgSz) / 2;
        try { doc.addImage(entidad.logo, fmt, imgX, imgY, imgSz, imgSz); } catch {}
        doc.line(ML + logoW, TOP, ML + logoW, TOP + H);
    }

    // Right column divider
    doc.line(ML + IW - rightW, TOP, ML + IW - rightW, TOP + H);
    // Horizontal mid-divider in right column
    doc.line(ML + IW - rightW, TOP + H / 2, ML + IW, TOP + H / 2);
    // Vertical divider label | value
    doc.line(ML + IW - rightW + labelW, TOP, ML + IW - rightW + labelW, TOP + H);

    // Center: entity name + contratista name + CPS
    const cx = ML + logoW + (IW - logoW - rightW) / 2;
    const entNombre = (entidad.nombre ?? '').toUpperCase();
    const nombre    = (contratista?.nombre ?? '').toUpperCase();
    const cps       = contratista?.numero_contrato ? `CPS – ${contratista.numero_contrato}` : '';
    if (entNombre) {
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...INST.textMid);
        doc.text(entNombre, cx, TOP + 5.5, { align: 'center' });
    }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INST.text);
    doc.text(nombre, cx, TOP + 11, { align: 'center' });
    if (cps) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...INST.textMid);
        doc.text(cps, cx, TOP + 17, { align: 'center' });
    }

    // Right: Cuenta / Página
    const lx = ML + IW - rightW + 2;
    const vx = ML + IW - rightW + labelW + 3;
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...INST.text);
    doc.text('Cuenta:', lx, TOP + H / 2 - 2);
    doc.text('Página:', lx, TOP + H - 3);
    doc.setFont('helvetica', 'normal');
    doc.text(String(cuenta), vx, TOP + H / 2 - 2);
    doc.text(String(pageNum), vx, TOP + H - 3);

    return TOP + H + 5;
}

async function fetchAnálisisSoportes(items) {
    const conSoporte = items.filter(it => it.tiene_soporte);
    if (conSoporte.length === 0) return {};

    try {
        const res = await api.post('/auxiliar-informe/analizar-soportes', {
            items: conSoporte.map(it => ({ tipo: it.tipo, id: it.id })),
        });
        return res.data ?? {};
    } catch {
        return {};
    }
}

export async function exportarAuxiliarInforme(datos, desde, hasta) {
    const { contratista, obligaciones, items, planilla } = datos;

    const [entidad, analisisSoportes] = await Promise.all([
        fetchEntidadPublica(),
        fetchAnálisisSoportes(items),
    ]);

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const W   = doc.internal.pageSize.getWidth();
    const PH  = doc.internal.pageSize.getHeight();
    const M   = 30;   // margen izquierdo (3 cm)
    const MR  = 24;   // margen derecho  (2.34 cm ≈ 24 mm)
    const IW  = W - M - MR;
    const LBL = 62;
    const BDR     = INST.border;
    const TXT     = INST.text;
    const TXT_MED = INST.textMid;
    const FOOTER_Y = PH - 25; // margen inferior 2.5 cm

    // Cuenta: número de mes relativo al inicio del contrato
    const calcCuenta = () => {
        if (!desde || !contratista.fecha_inicio) return '01';
        const d1 = new Date(contratista.fecha_inicio + 'T12:00:00');
        const d2 = new Date(desde + 'T12:00:00');
        const m  = (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth()) + 1;
        return String(Math.max(1, m)).padStart(2, '0');
    };
    const cuenta = calcCuenta();
    let currentPage = 1;

    const setDraw = () => { doc.setDrawColor(...BDR); doc.setLineWidth(0.3); };
    const addPage = () => {
        doc.addPage();
        currentPage += 1;
        return drawAuxiliarHeader(doc, W, M, entidad, contratista, cuenta, currentPage);
    };
    const checkY  = (y, need) => (y + need > FOOTER_Y ? addPage() : y);

    // draw a full-width bordered row; returns next y
    const drawRow = (y, h, bgFill = null) => {
        if (bgFill) { doc.setFillColor(...bgFill); doc.rect(M, y, IW, h, 'F'); }
        setDraw();
        doc.rect(M, y, IW, h);
        return y + h;
    };

    let y = drawAuxiliarHeader(doc, W, M, entidad, contratista, cuenta, currentPage);
    y += 5;

    // ── INFORMACIÓN GENERAL DEL CONTRATO ──────────────────────────────────
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TXT);
    doc.text('INFORMACIÓN GENERAL DEL CONTRATO', M, y);
    setDraw();
    doc.setLineWidth(0.5);
    doc.line(M, y + 1.2, M + doc.getTextWidth('INFORMACIÓN GENERAL DEL CONTRATO'), y + 1.2);
    y += 8;

    const numC  = contratista.numero_contrato || '—';
    const yearC = contratista.fecha_inicio
        ? new Date(contratista.fecha_inicio + 'T12:00:00').getFullYear()
        : '';
    const objeto = (contratista.objeto_contrato || '—').toUpperCase();

    // Párrafo intro: prefijo normal + objeto en negrilla, flujo continuo
    const intro1 = `El presente Documento soporta las actividades derivadas del Contrato de Prestación de Servicios ${numC}${yearC ? ' de ' + yearC : ''}, que tiene por objeto: `;
    const intro2 = `"${objeto}".`;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXT);

    // Usar el espaciado real de jsPDF para coherencia entre normal y negrilla
    const lineH = doc.getLineHeight() / doc.internal.scaleFactor;

    const i1Lines = doc.splitTextToSize(intro1, IW);
    doc.text(i1Lines, M, y);

    // Posición donde termina la última línea del prefijo
    const lastNormalLine = i1Lines[i1Lines.length - 1];
    const lastNormalW    = doc.getTextWidth(lastNormalLine);
    let   boldY          = y + (i1Lines.length - 1) * lineH;
    let   availW         = IW - lastNormalW;

    // Distribuir palabras del objeto a partir del espacio restante
    doc.setFont('helvetica', 'bold');
    const words     = intro2.split(' ');
    const boldLines = [];
    let   cur       = [];
    let   firstBold = true;

    for (const word of words) {
        const test = [...cur, word].join(' ');
        if (doc.getTextWidth(test) <= availW) {
            cur.push(word);
        } else {
            if (cur.length) boldLines.push({ text: cur.join(' '), first: firstBold });
            cur       = [word];
            firstBold = false;
            availW    = IW;
        }
    }
    if (cur.length) boldLines.push({ text: cur.join(' '), first: firstBold });

    for (const { text, first } of boldLines) {
        if (!first) boldY += lineH;
        doc.text(text, first ? M + lastNormalW : M, boldY);
    }

    y = boldY + lineH + 5;

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...TXT_MED);
    doc.text('En la siguiente tabla, se relaciona la información general del presente contrato:', M, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TXT);
    doc.text('Tabla 1. Información general del contrato.', M, y);
    y += 6;

    const calcDuracion = () => {
        if (contratista.duracion_contrato) return contratista.duracion_contrato;
        if (!contratista.fecha_inicio || !contratista.fecha_fin) return '—';
        const d1 = new Date(contratista.fecha_inicio + 'T12:00:00');
        const d2 = new Date(contratista.fecha_fin + 'T12:00:00');
        const m  = Math.round((d2 - d1) / (1000 * 60 * 60 * 24 * 30.44));
        return m === 1 ? '1 mes' : `${m} meses`;
    };
    const fmtFechaContrato = () => {
        if (contratista.fecha_suscripcion) return contratista.fecha_suscripcion;
        if (!contratista.fecha_inicio) return '—';
        return new Date(contratista.fecha_inicio + 'T12:00:00')
            .toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const fmtFechaLarga = (str) => {
        if (!str) return '—';
        return new Date(str + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
    };
    const periodoInforme = desde && hasta
        ? `${fmtFechaLarga(desde)} al ${fmtFechaLarga(hasta)}`
        : 'Todo el período';

    const tablaInfo = [
        ['Número y fecha del Contrato',              `${numC}${contratista.fecha_inicio ? ' del ' + fmtFechaContrato() : ''}`],
        ['Objeto del contrato',                      contratista.objeto_contrato || '—'],
        ['Duración del contrato',                    calcDuracion()],
        ['Valor del contrato',                       contratista.valor_contrato || '—'],
        ['Contratista',                              contratista.nombre || '—'],
        ['Número de identificación del contratista', contratista.cedula || '—'],
        ['Supervisor del Contrato',                  contratista.supervisor_nombre || '—'],
        ['Número de identificación del supervisor',  contratista.supervisor_cedula || '—'],
        ['Fecha de Acta de Inicio',                  fmtFechaLarga(contratista.fecha_inicio)],
        ['Fecha de Terminación',                     fmtFechaLarga(contratista.fecha_fin)],
        ['Fecha de Adición y prórroga No. 1',        contratista.supervisor_fecha_adicion_prorroga || 'N/A'],
        ['Valor y tiempo Adición y Prórroga No. 1',  contratista.supervisor_valor_adicion_prorroga || 'N/A'],
        ['Periodo del Informe',                      periodoInforme],
        ['Ciudad y Fecha presentación del Informe',  `Monterrey, ${new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}`],
    ];

    for (let idx = 0; idx < tablaInfo.length; idx++) {
        const [label, value] = tablaInfo[idx];
        doc.setFontSize(8.5);
        const valLines = doc.splitTextToSize(String(value), IW - LBL - 4);
        const rowH = Math.max(8, valLines.length * 4.8 + 4);
        y = checkY(y, rowH);
        const bg = idx % 2 === 0 ? [255, 255, 255] : INST.rowAlt;
        doc.setFillColor(...bg);
        doc.rect(M, y, IW, rowH, 'F');
        setDraw();
        doc.rect(M, y, LBL, rowH);
        doc.rect(M + LBL, y, IW - LBL, rowH);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...TXT_MED);
        doc.text(doc.splitTextToSize(label, LBL - 3), M + 2, y + 5.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...TXT);
        doc.text(valLines, M + LBL + 2, y + 5.5);
        y += rowH;
    }
    y += 8; // espacio debajo de la Tabla 1

    // ── Encabezado de sección obligaciones ────────────────────────────────
    const secTitulo = `1. CUMPLIMIENTO DE LAS OBLIGACIONES ESPECÍFICAS DEL CONTRATO CPS – ${numC} del ${fmtFechaContrato()}.`;
    y = checkY(y, 18);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...TXT);
    const cx11 = M + IW / 2;
    const secLines = doc.splitTextToSize(secTitulo, IW);
    const lhSec = doc.getLineHeight() / doc.internal.scaleFactor;
    doc.text(secLines, cx11, y, { align: 'center' });
    y += secLines.length * lhSec + 3;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    const secParrafo = 'Se llevaron a cabo el avance de las siguientes obligaciones específicas en atención al cumplimiento del objeto contractual.';
    const secParrafoLines = doc.splitTextToSize(secParrafo, IW);
    const lhParrafo = doc.getLineHeight() / doc.internal.scaleFactor;
    doc.text(secParrafoLines, M, y);
    y += secParrafoLines.length * lhParrafo + 4;

    const tablaDevLabel = `Tabla 2 Desarrollo del plan de las obligaciones específicas del contrato CPS – ${numC}`;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(tablaDevLabel, M, y);
    y += doc.getLineHeight() / doc.internal.scaleFactor + 3;

    // ── Obligaciones ───────────────────────────────────────────────────────
    const grupos = obligaciones
        .map(ob => ({ ob, its: items.filter(it => it.obligacion_id === ob.id) }))
        .filter(g => g.its.length > 0);

    if (!grupos.length) {
        doc.setFontSize(9); doc.setTextColor(...TXT_MED);
        doc.text('No hay actividades vinculadas a obligaciones en este período.', M, y + 6);
    }

    for (let gi = 0; gi < grupos.length; gi++) {
        const { ob, its } = grupos[gi];

        // ── Encabezado de la obligación ────────────────────────────────────
        const obText  = `OBLIGACION No. ${gi + 1}: ${ob.descripcion}`;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        const obLines = doc.splitTextToSize(obText, IW - 6);
        const obH = Math.max(10, obLines.length * 5 + 5);
        y = checkY(y, obH);
        doc.setFillColor(...INST.navyDark);
        setDraw();
        doc.setLineWidth(0.4);
        doc.rect(M, y, IW, obH, 'FD');
        doc.setTextColor(...INST.navyFg);
        doc.text(obLines, M + 3, y + 6.5);
        y += obH;

        for (const item of its) {
            const analisis = analisisSoportes[`${item.tipo}_${item.id}`];

            // pre-fetch photos
            let fotosB64 = [];
            if (item.fotos_ids?.length > 0) {
                const base = item.tipo === 'evento' ? `/eventos/${item.id}/fotos`
                    : item.tipo === 'tarea' ? `/tareas/${item.id}/fotos`
                    : `/compromisos/${item.id}/fotos`;
                fotosB64 = (await Promise.all(
                    item.fotos_ids.map(fid => fetchBase64(`${base}/${fid}`))
                )).filter(Boolean);
            }

            // ── Sub-header: tipo + titulo + fecha ──────────────────────────
            const subText  = `${(TIPO_LABEL[item.tipo] ?? item.tipo.toUpperCase())}: ${item.titulo || '—'}  —  ${item.fecha ? fmtFechaCorta(item.fecha) : '—'}`;
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'bold');
            const subLines = doc.splitTextToSize(subText, IW - 6);
            const subH = Math.max(8, subLines.length * 4.8 + 4);
            y = checkY(y, subH);
            doc.setFillColor(...INST.navyMid);
            setDraw();
            doc.rect(M, y, IW, subH, 'FD');
            doc.setTextColor(...INST.text);
            doc.text(subLines, M + 3, y + 5.5);
            y += subH;

            // ── MUNICIPIO ──────────────────────────────────────────────────
            if (item.lugar) {
                const munH = 8;
                y = checkY(y, munH);
                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'bold');
                const munLabel = 'MUNICIPIO: ';
                const munLW = doc.getTextWidth(munLabel);
                drawRow(y, munH, [255, 255, 255]);
                doc.setTextColor(...TXT);
                doc.text(munLabel, M + 3, y + 5.5);
                doc.setFont('helvetica', 'normal');
                doc.text(String(item.lugar), M + 3 + munLW, y + 5.5);
                y += munH;
            }

            // ── DESCRIPCION DEL CUMPLIMIENTO ───────────────────────────────
            const descText = item.conclusiones || item.descripcion || '';
            if (descText) {
                doc.setFontSize(8.5);
                const descBody = doc.splitTextToSize(descText, IW - 6);
                const descH = Math.max(14, descBody.length * 4.8 + 12);
                y = checkY(y, descH);
                drawRow(y, descH, [255, 255, 255]);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...TXT);
                doc.text('DESCRIPCION DEL CUMPLIMIENTO:', M + 3, y + 6);
                doc.setFont('helvetica', 'normal');
                doc.text(descBody, M + 3, y + 11.5);
                y += descH;
            }

            // ── SOPORTE ────────────────────────────────────────────────────
            if (item.tiene_soporte || analisis) {
                const lines = [];
                if (analisis?.dates?.length)
                    lines.push(`Fecha: ${analisis.dates.join(' · ')}`);
                else if (item.fecha)
                    lines.push(`Fecha: ${fmtFechaCorta(item.fecha)}`);
                if (item.lugar) lines.push(`Sitio: ${item.lugar}`);
                if (analisis?.summary)   lines.push(analisis.summary);
                if (analisis?.signatories?.length)
                    lines.push(`Firmantes: ${analisis.signatories.join(', ')}`);
                if (analisis?.amounts?.length)
                    lines.push(`Valores: ${analisis.amounts.join(' · ')}`);

                doc.setFontSize(8);
                let sH = 9;
                lines.forEach(l => { sH += doc.splitTextToSize(l, IW - 6).length * 4.5 + 1; });
                sH = Math.max(14, sH);
                y = checkY(y, sH);
                drawRow(y, sH, [255, 255, 255]);
                doc.setFontSize(8.5);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...TXT);
                doc.text('SOPORTE:', M + 3, y + 6);
                let sy = y + 11;
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                lines.forEach(line => {
                    const ll = doc.splitTextToSize(line, IW - 6);
                    doc.text(ll, M + 3, sy);
                    sy += ll.length * 4.5 + 1;
                });
                y += sH;
            }

            // ── Fotografías en fila bordeada ───────────────────────────────
            if (fotosB64.length > 0) {
                const photoW   = (IW - 6) / 2;
                const photoH   = photoW * 0.65;
                const numRows  = Math.ceil(fotosB64.length / 2);
                const totalPhH = numRows * (photoH + 3) + 4;
                y = checkY(y, totalPhH);
                drawRow(y, totalPhH, [255, 255, 255]);
                let fy = y + 2;
                for (let fi = 0; fi < fotosB64.length; fi += 2) {
                    const pair = fotosB64.slice(fi, fi + 2);
                    pair.forEach((b64, j) => {
                        const fw  = pair.length === 1 ? IW - 6 : photoW;
                        const fx  = M + 3 + j * (photoW + 3);
                        const fmt = b64?.split(';')[0].split('/')[1]?.toUpperCase() ?? 'JPEG';
                        try { doc.addImage(b64, fmt, fx, fy, fw, photoH); } catch {}
                    });
                    fy += photoH + 3;
                }
                y += totalPhH;
            }
            // sin gap entre items — la tabla es continua
        }
        // sin gap entre obligaciones — la tabla es continua
    }
    y += 5; // espacio después de la Tabla 2

    // ── Tabla 7 y Tabla 8: Planilla de seguridad social ───────────────────
    if (planilla?.numero || planilla?.fondo_pension) {
        y += 6;
        y = checkY(y, 14);

        // Etiqueta Tabla 7
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...TXT);
        doc.text('Tabla 7.  Discriminación detalle pago de planilla este periodo.', M, y);
        y += doc.getLineHeight() / doc.internal.scaleFactor + 3;

        // Tabla 7 — encabezado gris + 4 filas
        const t7Header = [['Entidad', 'Referencia']];
        const t7Rows = [
            ['Planilla No.',                          planilla.numero        || '—'],
            ['Fondo de Pensión',                      planilla.fondo_pension || '—'],
            ['ARL (Aseguradora de Riesgos Laborales)', planilla.arl          || '—'],
            ['EPS (Empresa Prestadora de Salud)',      planilla.eps          || '—'],
        ];
        const t7ColW = IW / 2;

        // Header row
        y = checkY(y, 8);
        doc.setFillColor(...INST.navyDark);
        doc.rect(M, y, IW, 8, 'F');
        setDraw();
        doc.rect(M, y, t7ColW, 8);
        doc.rect(M + t7ColW, y, t7ColW, 8);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...INST.navyFg);
        doc.text('Entidad',    M + 3,          y + 5.5);
        doc.text('Referencia', M + t7ColW + 3, y + 5.5);
        y += 8;

        t7Rows.forEach(([label, val], idx) => {
            const rh = 8;
            y = checkY(y, rh);
            const bg = idx % 2 === 0 ? [255,255,255] : INST.rowAlt;
            doc.setFillColor(...bg);
            doc.rect(M, y, IW, rh, 'F');
            setDraw();
            doc.rect(M, y, t7ColW, rh);
            doc.rect(M + t7ColW, y, t7ColW, rh);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...TXT);
            doc.text(label, M + 3,          y + 5.5);
            doc.text(val,   M + t7ColW + 3, y + 5.5);
            y += rh;
        });
        y += 10;

        // Etiqueta Tabla 8
        y = checkY(y, 14);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text(`Tabla 8 Cumplimiento obligaciones de seguridad social.`, M, y);
        y += doc.getLineHeight() / doc.internal.scaleFactor + 3;

        // Fila superior: Planilla + IBC
        const infoH = 8;
        y = checkY(y, infoH);
        doc.setFillColor(255, 255, 255);
        doc.rect(M, y, IW, infoH, 'F');
        setDraw();
        doc.rect(M, y, IW / 2, infoH);
        doc.rect(M + IW / 2, y, IW / 2, infoH);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...TXT);
        doc.text(`Planilla: ${planilla.numero || '—'}`,                         M + 3,          y + 5.5);
        doc.text(`Ingreso Base de Cotización: ${planilla.ibc || '—'}`,          M + IW / 2 + 3, y + 5.5);
        y += infoH;

        // Cabecera tabla 8
        const t8Cols = [IW * 0.35, IW * 0.25, IW * 0.22, IW * 0.18];
        const t8Labels = ['DESCRIPCIÓN DEL APORTE', 'NOMBRE EMPRESA', 'VALOR APORTE PAGADO', 'FECHA DE PAGO'];
        y = checkY(y, 9);
        doc.setFillColor(...INST.navyDark);
        doc.rect(M, y, IW, 9, 'F');
        setDraw();
        let cx8 = M;
        t8Cols.forEach((cw, i) => {
            doc.rect(cx8, y, cw, 9);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...INST.navyFg);
            const lbl = doc.splitTextToSize(t8Labels[i], cw - 4);
            doc.text(lbl, cx8 + 2, y + 5.5);
            cx8 += cw;
        });
        y += 9;

        const t8Filas = [
            ['PAGO APORTES PENSIÓN',         planilla.fondo_pension || '—', planilla.valor_pension || '—', planilla.fecha_pago || '—'],
            ['PAGO RIESGOS PROFESIONALES',   planilla.arl           || '—', planilla.valor_arl     || '—', planilla.fecha_pago || '—'],
            ['PAGO APORTES SALUD',           planilla.eps           || '—', planilla.valor_salud   || '—', planilla.fecha_pago || '—'],
        ];

        t8Filas.forEach((row, idx) => {
            const rh = 8;
            y = checkY(y, rh);
            const bg = idx % 2 === 0 ? [255,255,255] : INST.rowAlt;
            doc.setFillColor(...bg);
            doc.rect(M, y, IW, rh, 'F');
            setDraw();
            let rx = M;
            t8Cols.forEach((cw, i) => {
                doc.rect(rx, y, cw, rh);
                doc.setFontSize(7.5);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...TXT);
                doc.text(String(row[i]), rx + 2, y + 5.2);
                rx += cw;
            });
            y += rh;
        });

        // Fila TOTAL
        y = checkY(y, 8);
        doc.setFillColor(...INST.navyDark);
        doc.rect(M, y, IW, 8, 'F');
        setDraw();
        let rx = M;
        [IW * 0.35, IW * 0.25, IW * 0.22, IW * 0.18].forEach((cw, i) => {
            doc.rect(rx, y, cw, 8);
            if (i === 1) {
                doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...INST.navyFg);
                doc.text('TOTAL', rx + 2, y + 5.5);
            }
            if (i === 2) {
                doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(...INST.navyFg);
                doc.text(planilla.valor_total || '—', rx + 2, y + 5.5);
            }
            rx += cw;
        });
        y += 8;
        y += 8; // espacio debajo de Tabla 8
    }

    // ── Imagen de aviso al final ───────────────────────────────────────────
    try {
        const avisoUrl = `${window.location.origin}/images/avisodeinforme.png`;
        const avisoB64 = await fetch(avisoUrl)
            .then(r => r.blob())
            .then(blob => new Promise(res => { const fr = new FileReader(); fr.onloadend = () => res(fr.result); fr.readAsDataURL(blob); }));
        if (avisoB64) {
            const imgW = IW;
            const imgH = imgW / 4.2; // proporción real del banner
            y = checkY(y, imgH + 8);
            doc.addImage(avisoB64, 'PNG', M, y + 5, imgW, imgH);
        }
    } catch {}

    // ── Footer en todas las páginas ────────────────────────────────────────
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(7);
        doc.setTextColor(...TXT_MED);
        doc.text(
            `Desarrollado por NexGovIA S.A.S.®, Asesores e-Governance Solutions para Entidades Públicas.  ·  Página ${p} de ${totalPages}`,
            W / 2, PH - 4, { align: 'center' }
        );
    }

    doc.save(`auxiliar-informe-${contratista.nombre?.replace(/\s+/g, '-') ?? 'contratista'}-${new Date().toISOString().split('T')[0]}.pdf`);
}
