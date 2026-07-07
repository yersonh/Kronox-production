// resources/js/pages/admin/Contratistas.jsx
import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import ModalConfirmLider from '../../components/ModalConfirmLider';
import ContratistaDetalleModal from '../../components/ContratistaDetalleModal';
import api from '../../api/axios';
import { useTheme } from '../../hooks/useTheme';
import { useDebounce } from '../../hooks/useDebounce';
import {
    Plus, Edit, Trash2, User, Mail, Phone,
    Building2, Briefcase, Save, X, AlertCircle,
    Users, CreditCard, MessageCircle, FileText, Calendar,
    AlertTriangle, ChevronLeft, ChevronRight, Search,
    Shield, Eye, EyeOff, KeyRound, Upload, Download,
    FileCheck2, FileX2, Camera, ZoomIn, ClipboardList,
    CheckCircle2, Clock, AlertOctagon, Circle, BadgeCheck,
    BookOpen, Scale, Heart, FolderOpen, Loader2,
    RefreshCw, Ban, RotateCcw, History, AlertTriangle as AlertTriangleIcon,
    CheckCircle
} from 'lucide-react';

function EstadoContratoBadge({ contratista: c, isDark }) {
    const estado = c.estado_contrato ?? 'vigente';
    const dias   = c.fecha_fin ? Math.ceil((new Date(c.fecha_fin) - new Date()) / 86400000) : null;

    const cfg = {
        vigente:    { label: 'Vigente',     cls: isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700',   icon: <CheckCircle size={11} /> },
        por_vencer: { label: dias !== null ? `Vence en ${dias}d` : 'Por vencer', cls: isDark ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-amber-50 text-amber-700 animate-pulse', icon: <Clock size={11} /> },
        vencido:    { label: 'Vencido',     cls: isDark ? 'bg-red-500/20 text-red-400'     : 'bg-red-50 text-red-700',               icon: <AlertTriangleIcon size={11} /> },
        suspendido: { label: 'Suspendido',  cls: isDark ? 'bg-gray-600/40 text-gray-400'   : 'bg-gray-100 text-gray-500',            icon: <Ban size={11} /> },
    };
    const { label, cls, icon } = cfg[estado] ?? cfg.vigente;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
            {icon} {label}
        </span>
    );
}

const DOCS_CONFIG = [
    { key: 'estudios_previos',        endpoint: 'estudios-previos',        label: 'Estudios Previos',             icon: BookOpen },
    { key: 'registro_presupuestal',   endpoint: 'registro-presupuestal',   label: 'Registro Presupuestal',        icon: FileText },
    { key: 'rut',                     endpoint: 'rut',                     label: 'RUT (DIAN)',                    icon: FileText },
    { key: 'polizas',                 endpoint: 'polizas',                 label: 'Pólizas',                      icon: Shield },
    { key: 'arl',                     endpoint: 'arl',                     label: 'ARL',                          icon: Heart },
    { key: 'paz_salvo_parafiscales',  endpoint: 'paz-salvo-parafiscales',  label: 'Paz y Salvo Parafiscales',     icon: CheckCircle2 },
    { key: 'seguridad_social',        endpoint: 'seguridad-social',        label: 'Afil. Seguridad Social',       icon: Heart },
    { key: 'certificacion_bancaria',  endpoint: 'certificacion-bancaria',  label: 'Certificación Bancaria',       icon: FileText },
    { key: 'resolucion_supervisor',   endpoint: 'resolucion-supervisor',   label: 'Resolución Supervisor',        icon: FileText },
    { key: 'acta_inicio',             endpoint: 'acta-inicio',             label: 'Acta de Inicio',               icon: FileText },
];
// Funciones de validación
const validarCedula = (cedula) => {
    if (!cedula) return 'La cédula es requerida';
    if (!/^\d+$/.test(cedula)) return 'La cédula debe contener solo números';
    if (cedula.length < 5 || cedula.length > 10) return 'La cédula debe tener entre 5 y 10 dígitos';
    return '';
};

const validarEmail = (email) => {
    if (!email) return 'El email es requerido';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return 'Ingrese un email válido (ej: usuario@dominio.com)';
    return '';
};

const validarTelefono = (telefono) => {
    if (!telefono) return ''; // El teléfono es opcional
    if (!/^\d+$/.test(telefono)) return 'El teléfono debe contener solo números';
    if (telefono.length !== 10) return 'El teléfono debe tener 10 dígitos';
    return '';
};

const validarWhatsapp = (whatsapp) => {
    if (!whatsapp) return ''; // WhatsApp es opcional
    if (!/^\d+$/.test(whatsapp)) return 'El WhatsApp debe contener solo números';
    if (whatsapp.length !== 10) return 'El WhatsApp debe tener 10 dígitos';
    return '';
};


const validarFechas = (fechaInicio, fechaFin) => {
    if (!fechaInicio) return 'La fecha de inicio es requerida';
    if (!fechaFin) return 'La fecha de fin es requerida';
    if (new Date(fechaFin) <= new Date(fechaInicio)) return 'La fecha de fin debe ser posterior a la fecha de inicio';
    return '';
};

// Mapea cada campo del formulario a su nombre en la persona del Core, para saber
// individualmente cuáles ya traen dato (se bloquean) y cuáles están vacíos (se completan).
const CAMPO_CORE = { nombre: 'nombres', apellido: 'apellidos', email: 'email', telefono: 'telefono', whatsapp: 'whatsapp' };
// numero_contrato/objeto_contrato/fecha_inicio/fecha_fin no están aquí a propósito: esos campos
// están ocultos en el formulario de creación (los completa el propio contratista después, desde
// su perfil) — sector_id es el único de "Datos del Contrato" visible al crear.
const CAMPO_CORE_CONTRATISTA = { sector_id: 'sector_id' };
const esVacio = (v) => v === null || v === undefined || v === '';
// Predicado genérico: un campo se bloquea solo si "fuente" ya tiene dato ahí, según el mapeo dado.
const campoBloqueadoDe = (fuente, mapeo, campo) => !!fuente && !esVacio(fuente[mapeo[campo]]);

const validarTamañoArchivo = (file, tipoArchivo) => {
    const maxSize = tipoArchivo === 'foto' ? 2 * 1024 * 1024 : 10 * 1024 * 1024;
    const maxSizeMB = tipoArchivo === 'foto' ? 2 : 10;
    if (file.size > maxSize) {
        return `El archivo no debe exceder ${maxSizeMB} MB. Tamaño actual: ${(file.size / (1024 * 1024)).toFixed(2)} MB`;
    }
    return '';
};

const validarObligacionNueva = (descripcion) => {
    if (!descripcion.trim()) return 'La descripción es requerida';
    if (descripcion.length > 500) return 'La descripción no debe exceder 500 caracteres';
    return '';
};

export default function Contratistas() {
    const { isDark } = useTheme();
    const [contratistas, setContratistas] = useState([]);
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
    const [dependencias, setDependencias] = useState([]);
    const [sectores, setSectores] = useState([]);
    const [sectoresFiltrados, setSectoresFiltrados] = useState([]);
    const [searchParams] = useSearchParams();
    const [filtros, setFiltros] = useState({ dependencia_id: '', sector_id: '', search: searchParams.get('search') || '', solo_lideres: false });
    const debouncedSearch = useDebounce(filtros.search);
    const [form, setForm] = useState({
        nombre: '', apellido: '', cedula: '', email: '',
        telefono: '', whatsapp: '', dependencia_id: '', sector_id: '',
        numero_contrato: '', objeto_contrato: '', fecha_inicio: '', fecha_fin: '',
        es_lider: false,
    });
    const [dependenciaTieneLider, setDependenciaTieneLider] = useState(false);
    const [editando, setEditando] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mostrarForm, setMostrarForm] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [erroresCampo, setErroresCampo] = useState({});

    // Verificación en vivo de cédula existente en el Core (asistente paso a paso, solo al crear)
    const [verificando, setVerificando] = useState(false);
    const [verificacionEstado, setVerificacionEstado] = useState(null); // null|'nueva'|'existente_sin_registro'|'ya_registrado'|'error_503'
    const [personaEncontrada, setPersonaEncontrada] = useState(null);
    const [registroExistente, setRegistroExistente] = useState(null); // { tipo_registro, registro_id, registro_url } — duplicado local, bloquea todo
    const [registroCoreExistente, setRegistroCoreExistente] = useState(null); // { tipo, campos } — contratista ya existe en el Core, sin vínculo local
    const [avisoVerificacionCaida, setAvisoVerificacionCaida] = useState(false);
    const [avisoPostGuardado, setAvisoPostGuardado] = useState('');
    const revelarResto = editando || ['nueva', 'existente_sin_registro', 'error_503'].includes(verificacionEstado);
    // Un campo se bloquea solo si la fuente (persona o contratista del Core) ya tiene dato ahí.
    const campoBloqueado = (campo) => campoBloqueadoDe(personaEncontrada, CAMPO_CORE, campo);
    const campoContratistaBloqueado = (campo) => campoBloqueadoDe(registroCoreExistente?.campos, CAMPO_CORE_CONTRATISTA, campo);

    // Foto en formulario
    const [fotoFormFile, setFotoFormFile] = useState(null);
    const [fotoFormPreview, setFotoFormPreview] = useState(null);
    const [errorFotoForm, setErrorFotoForm] = useState('');

    // Minuta en formulario
    const [minutaFormFile, setMinutaFormFile] = useState(null);
    const [errorMinutaForm, setErrorMinutaForm] = useState('');

    // Documentos legales en formulario
    const [documentosForm, setDocumentosForm] = useState({});
    const [documentosExistentes, setDocumentosExistentes] = useState({});
    const [erroresDocumentos, setErroresDocumentos] = useState({});

    // Obligaciones en formulario (creación y edición)
    const [obligacionesForm, setObligacionesForm] = useState([]);
    const [formObligacionNueva, setFormObligacionNueva] = useState({ descripcion: '', observaciones: '' });
    const [mostrarFormObligacionNueva, setMostrarFormObligacionNueva] = useState(false);
    const [editandoObligacionIndice, setEditandoObligacionIndice] = useState(null);
    const [errorObligacionNueva, setErrorObligacionNueva] = useState('');

    // Modal foto (desde tabla)
    const [modalFoto, setModalFoto] = useState({ show: false, id: null, nombre: '' });
    const [fotoModalFile, setFotoModalFile] = useState(null);
    const [fotoModalPreview, setFotoModalPreview] = useState(null);
    const [fotoModalExistente, setFotoModalExistente] = useState(null);
    const [loadingFoto, setLoadingFoto] = useState(false);
    const [errorFoto, setErrorFoto] = useState('');
    const [fotoAmpliada, setFotoAmpliada] = useState(null);

    // Modal detalle contratista
    const [modalDetalle, setModalDetalle] = useState(null); // contratista object | null

    // Modal documentos (desde tabla)
    const [modalDocumentos, setModalDocumentos] = useState({ show: false, contratista: null });
    const [loadingDocModal, setLoadingDocModal] = useState({});
    const [errorDocModal, setErrorDocModal] = useState({});
    const [confirmarEliminarDoc, setConfirmarEliminarDoc] = useState(null); // key del doc a confirmar

    // Modal renovar contrato
    const [modalRenovar, setModalRenovar] = useState({ show: false, contratista: null });
    const [formRenovar, setFormRenovar] = useState({ tipo: 'prorroga', fecha_inicio_nueva: '', fecha_fin_nueva: '', numero_nuevo: '', valor_adicion: '', motivo: '' });
    const [loadingRenovar, setLoadingRenovar] = useState(false);
    const [errorRenovar, setErrorRenovar] = useState('');
    const [minutaRenovar, setMinutaRenovar] = useState(null);
    const [actaInicioRenovar, setActaInicioRenovar] = useState(null);
    const [resolucionSupervisorRenovar, setResolucionSupervisorRenovar] = useState(null);

    // Modal historial
    const [modalHistorial, setModalHistorial] = useState({ show: false, contratista: null });
    const [historial, setHistorial] = useState([]);
    const [loadingHistorial, setLoadingHistorial] = useState(false);

    // Modales varios
    const [modalConfirm, setModalConfirm] = useState({ show: false, id: null, nombre: '' });
    const [modalObjeto, setModalObjeto] = useState({ show: false, objeto: '', numero: '' });
    const [isMobile, setIsMobile] = useState(false);

    // Modal obligaciones
    const obligacionesScrollRef = useRef(null);
    const [modalObligaciones, setModalObligaciones] = useState({ show: false, contratistaId: null, nombre: '', tieneMinuta: false, numeroContrato: '' });
    const [obligaciones, setObligaciones] = useState([]);
    const [loadingObligaciones, setLoadingObligaciones] = useState(false);
    const [mostrarFormObligacion, setMostrarFormObligacion] = useState(false);
    const [editandoObligacion, setEditandoObligacion] = useState(null);
    const [formObligacion, setFormObligacion] = useState({ descripcion: '', observaciones: '' });
    const [errorObligacion, setErrorObligacion] = useState('');
    const [savingObligacion, setSavingObligacion] = useState(false);
    const [confirmEliminarObligacion, setConfirmEliminarObligacion] = useState(null);
    const [loadingLider, setLoadingLider] = useState(false);
    const [modalLider, setModalLider] = useState({ show: false, contratista: null });


    const handleInputChange = (campo, valor) => {
        const nuevoForm = { ...form, [campo]: valor };
        setForm(nuevoForm);

        // Validar en tiempo real y limpiar error del campo
        setErroresCampo(prev => {
            const nuevosErrores = { ...prev };
            delete nuevosErrores[campo]; // Limpiar error de este campo al escribir

            // Validar según el campo
            if (campo === 'cedula' && valor) {
                const error = validarCedula(valor);
                if (error) nuevosErrores.cedula = error;
            }
            if (campo === 'email' && valor) {
                const error = validarEmail(valor);
                if (error) nuevosErrores.email = error;
            }
            if (campo === 'telefono' && valor) {
                const error = validarTelefono(valor);
                if (error) nuevosErrores.telefono = error;
            }
            if (campo === 'whatsapp' && valor) {
                const error = validarWhatsapp(valor);
                if (error) nuevosErrores.whatsapp = error;
            }
            if ((campo === 'fecha_inicio' || campo === 'fecha_fin') && (nuevoForm.fecha_inicio || nuevoForm.fecha_fin)) {
                const error = validarFechas(nuevoForm.fecha_inicio, nuevoForm.fecha_fin);
                if (error) nuevosErrores.fechas = error;
                else delete nuevosErrores.fechas;
            }

            return nuevosErrores;
        });
    };

    // Consulta si ya existe una persona con esta cédula (solo al crear, no al editar).
    // Estados posibles: 'nueva' | 'existente_sin_registro' | 'ya_registrado' | 'error_503'.
    const verificarCedula = async (cedula) => {
        if (editando || !cedula || validarCedula(cedula)) {
            return;
        }
        setVerificando(true);
        setAvisoVerificacionCaida(false);
        try {
            const res = await api.get('/personas/buscar-por-identificacion', { params: { numero_identificacion: cedula, tipo_registro: 'contratista' } });
            const { estado, persona, tipo_registro, registro_id, registro_url, registro_core_existente } = res.data;
            setVerificacionEstado(estado);

            if (estado === 'ya_registrado') {
                setPersonaEncontrada(null);
                setRegistroCoreExistente(null);
                setRegistroExistente({ tipo_registro, registro_id, registro_url });
                setForm(f => ({ ...f, nombre: '', apellido: '', email: '', telefono: '', whatsapp: '' }));
            } else if (estado === 'existente_sin_registro') {
                setRegistroExistente(null);
                setPersonaEncontrada(persona);
                setRegistroCoreExistente(registro_core_existente || null);
                const campos = registro_core_existente?.campos || {};
                setForm(f => ({
                    ...f,
                    nombre: persona.nombres || '',
                    apellido: persona.apellidos || '',
                    email: persona.email || '',
                    telefono: persona.telefono || '',
                    whatsapp: persona.whatsapp || '',
                    sector_id: campos.sector_id || '',
                }));
            } else {
                setPersonaEncontrada(null);
                setRegistroExistente(null);
                setRegistroCoreExistente(null);
                setForm(f => ({ ...f, nombre: '', apellido: '', email: '', telefono: '', whatsapp: '' }));
            }
        } catch (err) {
            setPersonaEncontrada(null);
            setRegistroExistente(null);
            setRegistroCoreExistente(null);
            if (err.response?.status === 503) {
                setVerificacionEstado('error_503');
                setAvisoVerificacionCaida(true);
            } else {
                setVerificacionEstado(null);
                setError('No se pudo verificar la cédula, intenta de nuevo.');
                console.error('Error al verificar cédula:', err);
            }
        } finally {
            setVerificando(false);
        }
    };

    useEffect(() => {
        fetchContratistas();
        fetchDependencias();
        fetchSectores();
        const checkScreenSize = () => setIsMobile(window.innerWidth < 1024);
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, [pagination.current_page, filtros.dependencia_id, filtros.sector_id, filtros.solo_lideres, debouncedSearch]);

    const fetchContratistas = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', pagination.current_page);
            params.append('per_page', pagination.per_page);
            if (filtros.dependencia_id) params.append('dependencia_id', filtros.dependencia_id);
            if (filtros.sector_id) params.append('sector_id', filtros.sector_id);
            if (debouncedSearch) params.append('search', debouncedSearch);
            if (filtros.solo_lideres) params.append('solo_lideres', '1');
            const res = await api.get(`/contratistas?${params.toString()}`);
            setContratistas(res.data.data);
            setPagination({ current_page: res.data.current_page, last_page: res.data.last_page, per_page: res.data.per_page, total: res.data.total });
        } catch (err) {
            console.error('Error al cargar contratistas:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchDependencias = async () => {
        try { const res = await api.get('/dependencias'); setDependencias(res.data); } catch (e) { console.error(e); }
    };
    const fetchSectores = async () => {
        try { const res = await api.get('/sectores'); setSectores(res.data); } catch (e) { console.error(e); }
    };

    const handleDependenciaChange = async (dependencia_id) => {
        setForm(prev => ({ ...prev, dependencia_id, sector_id: '', es_lider: false }));
        setSectoresFiltrados(sectores.filter(s => s.dependencia_id == dependencia_id));
        if (!editando && dependencia_id) {
            try {
                const res = await api.get(`/contratistas?dependencia_id=${dependencia_id}&per_page=500`);
                const lista = res.data.data ?? res.data;
                setDependenciaTieneLider(lista.some(c => c.es_lider));
            } catch {
                setDependenciaTieneLider(false);
            }
        } else {
            setDependenciaTieneLider(false);
        }
    };

    // ── Foto en formulario ──────────────────────────────────────────────
    const handleFotoFormChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const error = validarTamañoArchivo(file, 'foto');
        if (error) {
            setErrorFotoForm(error);
            e.target.value = '';
            return;
        }
        setErrorFotoForm('');
        setFotoFormFile(file);
        setFotoFormPreview(URL.createObjectURL(file));
    };

    const clearFotoForm = () => {
        setFotoFormFile(null);
        if (fotoFormPreview && fotoFormPreview.startsWith('blob:')) {
            URL.revokeObjectURL(fotoFormPreview);
        }
        setFotoFormPreview(null);
    };

    // ── Submit formulario ───────────────────────────────────────────────
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // No debe poder llegar aquí con este estado (el resto del formulario está oculto),
        // pero se guarda como defensa extra en el propio cliente.
        if (!editando && verificacionEstado === 'ya_registrado') {
            return;
        }

        // Validar campos
        const errores = {};
        
        // Validar cédula
        const errorCedula = validarCedula(form.cedula);
        if (errorCedula) errores.cedula = errorCedula;
        
        // Validar email
        const errorEmail = validarEmail(form.email);
        if (errorEmail) errores.email = errorEmail;
        
        // Validar teléfono (si se ingresó)
        if (form.telefono) {
            const errorTelefono = validarTelefono(form.telefono);
            if (errorTelefono) errores.telefono = errorTelefono;
        }
        
        // Validar WhatsApp (si se ingresó)
        if (form.whatsapp) {
            const errorWhatsapp = validarWhatsapp(form.whatsapp);
            if (errorWhatsapp) errores.whatsapp = errorWhatsapp;
        }
        
        // Si hay errores, mostrarlos y no continuar
        if (Object.keys(errores).length > 0) {
            setErroresCampo(errores);
            // Mostrar el primer error como mensaje general también
            setError(Object.values(errores)[0]);
            return;
        }
        
        // Limpiar errores
        setErroresCampo({});
        setLoading(true);
        setAvisoPostGuardado('');

        try {
            let id = editando;
            if (editando) {
                await api.put(`/contratistas/${editando}`, form);
            } else {
                const res = await api.post('/contratistas', form);
                id = res.data.id;
                if (res.data.aviso) setAvisoPostGuardado(res.data.aviso);
            }
            // ... resto del código existente igual ...
            if (fotoFormFile && id) {
                const fd = new FormData();
                fd.append('foto', fotoFormFile);
                await api.post(`/contratistas/${id}/foto`, fd, { headers: { 'Content-Type': undefined } });
            }
            if (minutaFormFile && id) {
                const fd = new FormData();
                fd.append('minuta_pdf', minutaFormFile);
                await api.post(`/contratistas/${id}/minuta`, fd, { headers: { 'Content-Type': undefined } });
            }
            for (const { key, endpoint } of DOCS_CONFIG) {
                if (documentosForm[key] && id) {
                    const fd = new FormData();
                    fd.append('archivo', documentosForm[key]);
                    await api.post(`/contratistas/${id}/documentos/${endpoint}`, fd, { headers: { 'Content-Type': undefined } });
                }
            }
            if (!editando && obligacionesForm.length > 0 && id) {
                for (const ob of obligacionesForm) {
                    await api.post(`/contratistas/${id}/obligaciones`, ob);
                }
            }
            resetForm();
            fetchContratistas();
        } catch (err) {
            // Defensa en profundidad del backend: si llega esta forma de 422, es el mismo
            // caso de duplicado que ya bloquea la verificación en vivo — mostramos el mismo banner.
            if (err.response?.status === 422 && err.response.data?.registro_url) {
                setVerificacionEstado('ya_registrado');
                setRegistroExistente({
                    tipo_registro: err.response.data.tipo_registro,
                    registro_id: err.response.data.registro_id,
                    registro_url: err.response.data.registro_url,
                });
            } else {
                setError(err.response?.data?.message || 'Error al guardar');
            }
            // Si el backend devuelve errores de validación, también los mostramos
            if (err.response?.data?.errors) {
                setErroresCampo(err.response.data.errors);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEditar = (c) => {
        setEditando(c.id);
        setForm({
            nombre: c.persona?.nombres || '', apellido: c.persona?.apellidos || '',
            cedula: c.persona?.numero_identificacion || '', email: c.persona?.email || '',
            telefono: c.persona?.telefono || '', whatsapp: c.persona?.whatsapp || '',
            dependencia_id: c.dependencia_id || '', sector_id: c.sector_id || '',
            numero_contrato: c.numero_contrato || '', objeto_contrato: c.objeto_contrato || '',
            fecha_inicio: c.fecha_inicio ? c.fecha_inicio.substring(0, 10) : '', fecha_fin: c.fecha_fin ? c.fecha_fin.substring(0, 10) : '',
        });
        setSectoresFiltrados(sectores.filter(s => s.dependencia_id == c.dependencia_id));
        setDependenciaTieneLider(false);
        setErroresCampo({});
        setVerificando(false);
        setVerificacionEstado(null);
        setPersonaEncontrada(null);
        setRegistroExistente(null);
        setRegistroCoreExistente(null);
        setAvisoVerificacionCaida(false);
        setAvisoPostGuardado('');

        // Cargar foto existente si la tiene
        if (c.persona?.tiene_foto) {
            setFotoFormPreview(c.persona.foto_url);
            setFotoFormFile(null);
        } else {
            clearFotoForm();
        }
        setMinutaFormFile(null);
        setDocumentosForm({});
        setDocumentosExistentes(c.documentos_estado ?? {});
        setErroresDocumentos({});
        setMostrarForm(true);

        // Cargar obligaciones existentes
        fetchObligacionesForm(c.id);
    };

    const fetchObligacionesForm = async (contratistaId) => {
        try {
            const res = await api.get(`/contratistas/${contratistaId}/obligaciones`);
            setObligacionesForm(res.data);
        } catch (err) {
            console.error('Error al cargar obligaciones para el formulario:', err);
        }
    };

    const resetForm = () => {
        setMostrarForm(false);
        setEditando(null);
        setForm({ nombre: '', apellido: '', cedula: '', email: '', telefono: '', whatsapp: '', dependencia_id: '', sector_id: '', numero_contrato: '', objeto_contrato: '', fecha_inicio: '', fecha_fin: '', es_lider: false });
        setDependenciaTieneLider(false);
        setError('');
        setErroresCampo({});
        setShowPassword(false);
        clearFotoForm();
        setMinutaFormFile(null);
        setDocumentosForm({});
        setDocumentosExistentes({});
        setErroresDocumentos({});
        setObligacionesForm([]);
        setFormObligacionNueva({ descripcion: '', observaciones: '' });
        setMostrarFormObligacionNueva(false);
        setEditandoObligacionIndice(null);
        setVerificando(false);
        setVerificacionEstado(null);
        setPersonaEncontrada(null);
        setRegistroExistente(null);
        setRegistroCoreExistente(null);
        setAvisoVerificacionCaida(false);
    };

    // ── Gestión de obligaciones en el formulario ─────────────────────────
    const handleGuardarObligacionForm = async () => {
        const error = validarObligacionNueva(formObligacionNueva.descripcion);
        if (error) {
            setErrorObligacionNueva(error);
            return;
        }
        setErrorObligacionNueva('');
        setLoading(true);

        try {
            if (editando) {
                // Estamos editando el contratista, los cambios en obligaciones se guardan de inmediato
                if (editandoObligacionIndice !== null) {
                    const ob = obligacionesForm[editandoObligacionIndice];
                    if (ob.id) {
                        await api.put(`/obligaciones/${ob.id}`, formObligacionNueva);
                    } else {
                        // Caso raro: una obligación añadida en esta sesión de edición pero no guardada
                        await api.post(`/contratistas/${editando}/obligaciones`, formObligacionNueva);
                    }
                } else {
                    await api.post(`/contratistas/${editando}/obligaciones`, formObligacionNueva);
                }
                // Refrescar lista
                fetchObligacionesForm(editando);
            } else {
                // Estamos creando el contratista, solo actualizamos el estado local
                if (editandoObligacionIndice !== null) {
                    const nuevas = [...obligacionesForm];
                    nuevas[editandoObligacionIndice] = { ...formObligacionNueva };
                    setObligacionesForm(nuevas);
                } else {
                    setObligacionesForm([...obligacionesForm, { ...formObligacionNueva }]);
                }
            }
            // Reset mini form
            setFormObligacionNueva({ descripcion: '', observaciones: '' });
            setMostrarFormObligacionNueva(false);
            setEditandoObligacionIndice(null);
        } catch (err) {
            setErrorObligacionNueva(err.response?.data?.message || 'Error al guardar obligación');
        } finally {
            setLoading(false);
        }
    };

    const handleEditarObligacionForm = (idx) => {
        const ob = obligacionesForm[idx];
        setFormObligacionNueva({
            descripcion: ob.descripcion || '',
            observaciones: ob.observaciones || ''
        });
        setEditandoObligacionIndice(idx);
        setMostrarFormObligacionNueva(true);
    };

    const handleEliminarObligacionForm = async (idx) => {
        const ob = obligacionesForm[idx];
        if (editando && ob.id) {
            if (!confirm('¿Estás seguro de eliminar esta obligación?')) return;
            setLoading(true);
            try {
                await api.delete(`/obligaciones/${ob.id}`);
                fetchObligacionesForm(editando);
            } catch (err) {
                console.error('Error al eliminar obligación:', err);
            } finally {
                setLoading(false);
            }
        } else {
            setObligacionesForm(prev => prev.filter((_, i) => i !== idx));
        }
    };

    // ── Modal foto (desde acciones) ──────────────────────────────────────
    const handleAbrirModalFoto = (id, nombre, fotoUrl) => {
        setFotoModalFile(null);
        setFotoModalPreview(null);
        setFotoModalExistente(fotoUrl || null);
        setErrorFoto('');
        setModalFoto({ show: true, id, nombre });
    };

    const handleCerrarModalFoto = () => {
        if (fotoModalPreview) URL.revokeObjectURL(fotoModalPreview);
        setModalFoto({ show: false, id: null, nombre: '' });
        setFotoModalFile(null);
        setFotoModalPreview(null);
        setFotoModalExistente(null);
        setErrorFoto('');
    };

    const handleFotoModalChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const error = validarTamañoArchivo(file, 'foto');
        if (error) {
            setErrorFoto(error);
            e.target.value = '';
            return;
        }
        setErrorFoto('');
        setFotoModalFile(file);
        if (fotoModalPreview) URL.revokeObjectURL(fotoModalPreview);
        setFotoModalPreview(URL.createObjectURL(file));
    };

    const handleSubirFotoModal = async () => {
        if (!fotoModalFile) { setErrorFoto('Selecciona una imagen'); return; }
        setLoadingFoto(true);
        setErrorFoto('');
        try {
            const fd = new FormData();
            fd.append('foto', fotoModalFile);
            await api.post(`/contratistas/${modalFoto.id}/foto`, fd, { headers: { 'Content-Type': undefined } });
            handleCerrarModalFoto();
            fetchContratistas();
        } catch (err) {
            setErrorFoto(err.response?.data?.message || 'Error al subir la foto');
        } finally {
            setLoadingFoto(false);
        }
    };

    // ── Modal documentos (desde acciones) ───────────────────────────────
    const handleAbrirModalDocumentos = (c) => {
        setLoadingDocModal({});
        setErrorDocModal({});
        setModalDocumentos({ show: true, contratista: c });
    };

    const handleCerrarModalDocumentos = () => {
        setModalDocumentos({ show: false, contratista: null });
        setLoadingDocModal({});
        setErrorDocModal({});
        setConfirmarEliminarDoc(null);
    };

    const handleSubirMinutaModal = async (file) => {
        const key = 'minuta';
        if (file.size > 10 * 1024 * 1024) {
            setErrorDocModal(prev => ({ ...prev, [key]: 'El archivo no debe exceder 10 MB' }));
            return;
        }
        setLoadingDocModal(prev => ({ ...prev, [key]: true }));
        setErrorDocModal(prev => { const n = { ...prev }; delete n[key]; return n; });
        try {
            const fd = new FormData();
            fd.append('minuta_pdf', file);
            const res = await api.post(`/contratistas/${modalDocumentos.contratista.id}/minuta`, fd, { headers: { 'Content-Type': undefined } });
            setModalDocumentos(prev => ({ ...prev, contratista: res.data }));
            fetchContratistas();
        } catch (err) {
            setErrorDocModal(prev => ({ ...prev, [key]: err.response?.data?.message || 'Error al subir' }));
        } finally {
            setLoadingDocModal(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleSubirDocumentoModal = async (key, endpoint, file) => {
        if (file.size > 10 * 1024 * 1024) {
            setErrorDocModal(prev => ({ ...prev, [key]: 'El archivo no debe exceder 10 MB' }));
            return;
        }
        setLoadingDocModal(prev => ({ ...prev, [key]: true }));
        setErrorDocModal(prev => { const n = { ...prev }; delete n[key]; return n; });
        try {
            const fd = new FormData();
            fd.append('archivo', file);
            const res = await api.post(`/contratistas/${modalDocumentos.contratista.id}/documentos/${endpoint}`, fd, { headers: { 'Content-Type': undefined } });
            setModalDocumentos(prev => ({ ...prev, contratista: res.data }));
            fetchContratistas();
        } catch (err) {
            setErrorDocModal(prev => ({ ...prev, [key]: err.response?.data?.message || 'Error al subir' }));
        } finally {
            setLoadingDocModal(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleEliminarDocumento = async (key, endpoint) => {
        setConfirmarEliminarDoc(null);
        setLoadingDocModal(prev => ({ ...prev, [key]: true }));
        setErrorDocModal(prev => { const n = { ...prev }; delete n[key]; return n; });
        try {
            const url_path = key === 'minuta'
                ? `/contratistas/${modalDocumentos.contratista.id}/minuta`
                : `/contratistas/${modalDocumentos.contratista.id}/documentos/${endpoint}`;
            const res = await api.delete(url_path);
            setModalDocumentos(prev => ({ ...prev, contratista: res.data }));
            fetchContratistas();
        } catch (err) {
            setErrorDocModal(prev => ({ ...prev, [key]: err.response?.data?.message || 'Error al eliminar' }));
        } finally {
            setLoadingDocModal(prev => ({ ...prev, [key]: false }));
        }
    };

    const handleDescargarDocumento = async (id, endpoint) => {
        try {
            const url_path = endpoint === 'minuta' ? `/contratistas/${id}/minuta` : `/contratistas/${id}/documentos/${endpoint}`;
            const res = await api.get(url_path, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 15000);
        } catch (err) {
            console.error('Error al descargar documento:', err);
        }
    };

    const handleDescargarDocumentoForm = async (id, endpoint) => {
        try {
            const res = await api.get(`/contratistas/${id}/documentos/${endpoint}`, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 15000);
        } catch (err) {
            console.error('Error al descargar documento:', err);
        }
    };

    const handleDescargarMinuta = async (id) => {
        try {
            const res = await api.get(`/contratistas/${id}/minuta`, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 15000);
        } catch (err) {
            console.error('Error al descargar minuta:', err);
        }
    };

    // ── Modal renovar ───────────────────────────────────────────────────
    const handleAbrirRenovar = (c) => {
        setFormRenovar({
            tipo: 'prorroga',
            fecha_inicio_nueva: c.fecha_fin ? String(c.fecha_fin).slice(0, 10) : '',
            fecha_fin_nueva: '',
            numero_nuevo: c.numero_contrato ?? '',
            valor_adicion: '',
            motivo: '',
        });
        setErrorRenovar('');
        setModalRenovar({ show: true, contratista: c });
    };

    const handleCerrarRenovar = () => {
        setModalRenovar({ show: false, contratista: null });
        setErrorRenovar('');
        setMinutaRenovar(null);
        setActaInicioRenovar(null);
        setResolucionSupervisorRenovar(null);
    };

    const handleConfirmarRenovar = async () => {
        if (!formRenovar.fecha_inicio_nueva || !formRenovar.fecha_fin_nueva || !formRenovar.motivo.trim()) {
            setErrorRenovar('Fecha inicio, fecha fin y motivo son obligatorios');
            return;
        }
        setLoadingRenovar(true);
        setErrorRenovar('');
        try {
            const id = modalRenovar.contratista.id;
            const res = await api.patch(`/contratistas/${id}/renovar`, formRenovar);
            const renovacionId = res.data.renovacion?.id;
            if (minutaRenovar) {
                const fd = new FormData();
                fd.append('minuta_pdf', minutaRenovar);
                if (renovacionId) fd.append('renovacion_id', renovacionId);
                await api.post(`/contratistas/${id}/minuta`, fd, { headers: { 'Content-Type': undefined } });
            }
            if (actaInicioRenovar) {
                const fd = new FormData();
                fd.append('archivo', actaInicioRenovar);
                if (renovacionId) fd.append('renovacion_id', renovacionId);
                await api.post(`/contratistas/${id}/documentos/acta-inicio`, fd, { headers: { 'Content-Type': undefined } });
            }
            if (resolucionSupervisorRenovar) {
                const fd = new FormData();
                fd.append('archivo', resolucionSupervisorRenovar);
                await api.post(`/contratistas/${id}/documentos/resolucion-supervisor`, fd, { headers: { 'Content-Type': undefined } });
            }
            handleCerrarRenovar();
            fetchContratistas();
        } catch (err) {
            setErrorRenovar(err.response?.data?.message || err.response?.data?.errors ? Object.values(err.response.data.errors)[0]?.[0] : 'Error al renovar');
        } finally {
            setLoadingRenovar(false);
        }
    };

    // ── Modal historial ─────────────────────────────────────────────────
    const handleAbrirHistorial = async (c) => {
        setHistorial([]);
        setLoadingHistorial(true);
        setModalHistorial({ show: true, contratista: c });
        try {
            const res = await api.get(`/contratistas/${c.id}/historial`);
            setHistorial(res.data);
        } catch (err) {
            console.error('Error al cargar historial:', err);
        } finally {
            setLoadingHistorial(false);
        }
    };

    const handleCerrarHistorial = () => {
        setModalHistorial({ show: false, contratista: null });
        setHistorial([]);
    };

    const openModal = (id, nombre) => { setModalConfirm({ show: true, id, nombre }); };
    const closeModal = () => { setModalConfirm({ show: false, id: null, nombre: '' }); setError(''); };

    const handleEliminar = async () => {
        setLoading(true);
        try {
            await api.delete(`/contratistas/${modalConfirm.id}`);
            closeModal();
            fetchContratistas();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al desactivar');
        } finally {
            setLoading(false);
        }
    };

    const goToPage = (page) => {
        if (page >= 1 && page <= pagination.last_page)
            setPagination(prev => ({ ...prev, current_page: page }));
    };

    // ── Obligaciones ────────────────────────────────────────────────────
    const fetchObligaciones = async (contratistaId) => {
        setLoadingObligaciones(true);
        try {
            const res = await api.get(`/contratistas/${contratistaId}/obligaciones`);
            setObligaciones(res.data);
        } catch (err) {
            console.error('Error al cargar obligaciones:', err);
        } finally {
            setLoadingObligaciones(false);
        }
    };

    const handleAbrirObligaciones = (c) => {
        setModalObligaciones({ show: true, contratistaId: c.id, nombre: `${c.persona?.nombres} ${c.persona?.apellidos}`, tieneMinuta: c.tiene_minuta, numeroContrato: c.numero_contrato });
        setMostrarFormObligacion(false);
        setEditandoObligacion(null);
        setFormObligacion({ descripcion: '', observaciones: '' });
        setErrorObligacion('');
        setConfirmEliminarObligacion(null);
        fetchObligaciones(c.id);
    };

    const handleCerrarObligaciones = () => {
        setModalObligaciones({ show: false, contratistaId: null, nombre: '', tieneMinuta: false, numeroContrato: '' });
        setObligaciones([]);
        setMostrarFormObligacion(false);
        setEditandoObligacion(null);
        setErrorObligacion('');
        setConfirmEliminarObligacion(null);
    };

    const handleNuevaObligacion = () => {
        setEditandoObligacion(null);
        setFormObligacion({ descripcion: '', observaciones: '' });
        setErrorObligacion('');
        setMostrarFormObligacion(true);
    };

    const handleEditarObligacion = (o) => {
        setEditandoObligacion(o.id);
        setFormObligacion({
            descripcion: o.descripcion || '',
            observaciones: o.observaciones || '',
        });
        setErrorObligacion('');
        setMostrarFormObligacion(true);
        setTimeout(() => obligacionesScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 50);
    };

    const handleGuardarObligacion = async (e) => {
        e.preventDefault();
        if (!formObligacion.descripcion.trim()) { setErrorObligacion('La descripción es requerida'); return; }
        setSavingObligacion(true);
        setErrorObligacion('');
        try {
            if (editandoObligacion) {
                await api.put(`/obligaciones/${editandoObligacion}`, formObligacion);
            } else {
                await api.post(`/contratistas/${modalObligaciones.contratistaId}/obligaciones`, formObligacion);
            }
            setMostrarFormObligacion(false);
            setEditandoObligacion(null);
            fetchObligaciones(modalObligaciones.contratistaId);
        } catch (err) {
            setErrorObligacion(err.response?.data?.message || 'Error al guardar');
        } finally {
            setSavingObligacion(false);
        }
    };

    const handleEliminarObligacion = async (obligacionId) => {
        try {
            await api.delete(`/obligaciones/${obligacionId}`);
            setConfirmEliminarObligacion(null);
            fetchObligaciones(modalObligaciones.contratistaId);
        } catch (err) {
            console.error('Error al eliminar obligación:', err);
        }
    };

    const handleToggleLider = (c) => {
        setModalLider({ show: true, contratista: c });
    };

    const handleConfirmarLider = async () => {
        const c = modalLider.contratista;
        setLoadingLider(true);
        try {
            await api.patch(`/contratistas/${c.id}/lider`);
            setModalLider({ show: false, contratista: null });
            fetchContratistas();
        } catch (err) {
            console.error('Error al cambiar líder:', err.response?.data?.message || err);
        } finally {
            setLoadingLider(false);
        }
    };

    const formatBytes = (bytes) => {
        if (!bytes) return '';
        return bytes < 1048576 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
    };

    const inputClass = `w-full rounded-xl px-4 py-2.5 text-sm transition border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`;
    const labelClass = `block text-sm font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`;

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Users size={24} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Contratistas</h2>
                        </div>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Gestiona los contratistas y colaboradores de la organización</p>
                    </div>
                    <button onClick={() => mostrarForm ? resetForm() : setMostrarForm(true)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all transform hover:scale-[1.02] ${mostrarForm
                            ? isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md'}`}>
                        {mostrarForm ? <X size={18} /> : <Plus size={18} />}
                        {mostrarForm ? 'Cancelar' : 'Nuevo Contratista'}
                    </button>
                </div>

                {/* Filtros */}
                <div className={`rounded-2xl p-4 ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Search size={12} />Buscar</label>
                            <div className="relative">
                                <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                <input type="text" value={filtros.search} onChange={e => setFiltros({ ...filtros, search: e.target.value })} placeholder="Buscar por nombre o cédula..."
                                    className={`w-full pl-10 pr-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`} />
                                {filtros.search && <button onClick={() => setFiltros({ ...filtros, search: '' })} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}><X size={14} /></button>}
                            </div>
                        </div>
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Building2 size={12} />Dependencia</label>
                            <select value={filtros.dependencia_id} onChange={e => setFiltros({ ...filtros, dependencia_id: e.target.value, sector_id: '' })}
                                className={`w-full rounded-xl px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                                <option value="">Todas las dependencias</option>
                                {dependencias.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><Briefcase size={12} />Sector</label>
                            <select value={filtros.sector_id} onChange={e => setFiltros({ ...filtros, sector_id: e.target.value })}
                                className={`w-full rounded-xl px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                                <option value="">Todos los sectores</option>
                                {filtros.dependencia_id
                                    ? sectores.filter(s => s.dependencia_id == filtros.dependencia_id).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)
                                    : sectores.map(s => <option key={s.id} value={s.id}>{s.nombre} ({s.dependencia?.nombre})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}><BadgeCheck size={12} />Lideres</label>
                            <label className={`flex items-center gap-3 px-3 py-2 rounded-xl border cursor-pointer select-none transition-all ${filtros.solo_lideres
                                ? isDark ? 'bg-indigo-500/15 border-indigo-500/40' : 'bg-indigo-50 border-indigo-300'
                                : isDark ? 'bg-gray-900 border-gray-700 hover:border-gray-500' : 'bg-gray-50 border-gray-200 hover:border-gray-300'}`}>
                                <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all ${filtros.solo_lideres
                                    ? 'bg-indigo-600 border-indigo-600'
                                    : isDark ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-white'}`}>
                                    {filtros.solo_lideres && (
                                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </div>
                                <input type="checkbox" checked={filtros.solo_lideres} onChange={e => setFiltros(prev => ({ ...prev, solo_lideres: e.target.checked }))} className="sr-only" />
                                <span className={`text-sm font-medium transition-colors ${filtros.solo_lideres
                                    ? isDark ? 'text-indigo-300' : 'text-indigo-700'
                                    : isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    Solo líderes
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

                {/* Formulario */}
                {mostrarForm && (
                    <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'}`}>
                        <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <div className="flex items-center gap-2">
                                {editando ? <Edit size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} /> : <Plus size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />}
                                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>{editando ? 'Editar Contratista' : 'Nuevo Contratista'}</h3>
                            </div>
                        </div>
                        <div className="p-6">
                            {error && (
                                <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                                    <AlertCircle size={16} /><span className="text-sm">{error}</span>
                                </div>
                            )}
                            <form onSubmit={handleSubmit} className="space-y-6">

                                {/* Paso 1: verificación de identidad — solo en creación */}
                                {!editando && (
                                    <div>
                                        <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Verificación de Identidad</p>
                                        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                                            <div className="flex-1 w-full">
                                                <label className={labelClass}><CreditCard size={14} />Cédula *</label>
                                                <input
                                                    type="text"
                                                    value={form.cedula}
                                                    onChange={e => handleInputChange('cedula', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                    onBlur={e => verificarCedula(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); verificarCedula(form.cedula); } }}
                                                    className={`${inputClass} ${erroresCampo.cedula ? 'border-red-500 focus:ring-red-500' : ''}`}
                                                    placeholder="Cédula (máx. 10 dígitos)"
                                                    maxLength={10}
                                                    required
                                                    disabled={verificando}
                                                />
                                                {erroresCampo.cedula && (
                                                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                                        <AlertCircle size={12} /> {erroresCampo.cedula}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => verificarCedula(form.cedula)}
                                                disabled={verificando || !form.cedula}
                                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 sm:mt-6 ${isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                            >
                                                {verificando
                                                    ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                                                    : <Search size={16} />}
                                                <span>Verificar</span>
                                            </button>
                                        </div>
                                        <p className={`mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                            Ingresa el número de identificación. Vamos a verificar si esta persona ya está registrada antes de continuar.
                                        </p>

                                        {verificacionEstado === 'ya_registrado' && registroExistente && (
                                            <div className={`mt-4 p-3 rounded-xl flex items-start gap-2 ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                                                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                                                <span className="text-sm">
                                                    Esta persona ya está registrada como <strong>{registroExistente.tipo_registro}</strong> en Kronox.{' '}
                                                    <a href={registroExistente.registro_url} className="underline font-semibold inline-flex items-center gap-1">
                                                        Ver registro existente →
                                                    </a>
                                                </span>
                                            </div>
                                        )}

                                        {verificacionEstado === 'existente_sin_registro' && personaEncontrada && (
                                            <div className={`mt-4 p-3 rounded-xl flex items-start gap-2 ${isDark ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-300' : 'bg-yellow-50 border border-yellow-200 text-yellow-800'}`}>
                                                <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                                                <span className="text-sm">
                                                    Ya existe una persona registrada con esta cédula: <strong>{personaEncontrada.nombres} {personaEncontrada.apellidos}</strong> ({personaEncontrada.email || 'sin email'}). Se vinculará este contratista a ese registro; los campos que ya tienen dato quedan bloqueados abajo, y los que estén vacíos puedes completarlos.
                                                </span>
                                            </div>
                                        )}

                                        {avisoVerificacionCaida && (
                                            <div className={`mt-4 p-3 rounded-xl flex items-center gap-2 ${isDark ? 'bg-gray-700/50 border border-gray-600 text-gray-300' : 'bg-gray-50 border border-gray-200 text-gray-600'}`}>
                                                <AlertCircle size={14} />
                                                <span className="text-xs">No se pudo verificar si esta cédula ya existe (el servicio no respondió). Puedes continuar normalmente.</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Resto del formulario: oculto hasta verificar en creación; siempre visible en edición */}
                                {revelarResto && <>

                                {/* Foto de perfil */}
                                <div>
                                    <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Foto de Perfil</p>
                                    <div className="flex items-center gap-5">
                                        <div className="relative flex-shrink-0">
                                            <img
                                                src={fotoFormPreview || '/images/imagendefault.png'}
                                                alt="Preview"
                                                className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600 shadow-sm"
                                            />
                                            {fotoFormPreview && (
                                                <button type="button" onClick={clearFotoForm}
                                                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition">
                                                    <X size={11} />
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <input id="foto-form-c" type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFotoFormChange} />
                                            <button type="button" onClick={() => document.getElementById('foto-form-c').click()}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                                <Camera size={14} />
                                                {fotoFormPreview ? 'Cambiar foto' : 'Seleccionar foto'}
                                            </button>
                                            <p className={`mt-1.5 text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>JPG, PNG, WebP · Máx. 2 MB · Opcional</p>
                                            {errorFotoForm && (
                                                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                                    <AlertCircle size={12} /> {errorFotoForm}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Datos personales */}
                                <div>
                                    <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Datos Personales</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div><label className={labelClass}><User size={14} />Nombre *</label><input type="text" value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} className={inputClass} placeholder="Nombre" required disabled={campoBloqueado('nombre')} /></div>
                                        <div><label className={labelClass}><User size={14} />Apellido *</label><input type="text" value={form.apellido} onChange={e => setForm({ ...form, apellido: e.target.value })} className={inputClass} placeholder="Apellido" required disabled={campoBloqueado('apellido')} /></div>
                                        {editando && (
                                        <div>
                                            <label className={labelClass}>
                                                <CreditCard size={14} />Cédula *
                                            </label>
                                            <input
                                                type="text"
                                                value={form.cedula}
                                                onChange={e => handleInputChange('cedula', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                className={`${inputClass} ${erroresCampo.cedula ? 'border-red-500 focus:ring-red-500' : ''}`}
                                                placeholder="Cédula (máx. 10 dígitos)"
                                                maxLength={10}
                                                required
                                            />
                                            {erroresCampo.cedula && (
                                                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                                    <AlertCircle size={12} /> {erroresCampo.cedula}
                                                </p>
                                            )}
                                        </div>
                                        )}
                                        <div>
                                            <label className={labelClass}>
                                                <Mail size={14} />Email *
                                            </label>
                                            <input
                                                type="email"
                                                value={form.email}
                                                onChange={e => handleInputChange('email', e.target.value)}
                                                className={`${inputClass} ${erroresCampo.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                                                placeholder="correo@ejemplo.com"
                                                required
                                                disabled={campoBloqueado('email')}
                                            />
                                            {erroresCampo.email && (
                                                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                                    <AlertCircle size={12} /> {erroresCampo.email}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className={labelClass}>
                                                <Phone size={14} />Teléfono
                                            </label>
                                            <input
                                                type="text"
                                                value={form.telefono}
                                                onChange={e => handleInputChange('telefono', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                className={`${inputClass} ${erroresCampo.telefono ? 'border-red-500 focus:ring-red-500' : ''}`}
                                                placeholder="Teléfono (10 dígitos)"
                                                maxLength={10}
                                                disabled={campoBloqueado('telefono')}
                                            />
                                            {erroresCampo.telefono && (
                                                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                                    <AlertCircle size={12} /> {erroresCampo.telefono}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <label className={labelClass}>
                                                <MessageCircle size={14} />WhatsApp
                                            </label>
                                            <input
                                                type="text"
                                                value={form.whatsapp}
                                                onChange={e => handleInputChange('whatsapp', e.target.value.replace(/\D/g, '').slice(0, 10))}
                                                className={`${inputClass} ${erroresCampo.whatsapp ? 'border-red-500 focus:ring-red-500' : ''}`}
                                                placeholder="WhatsApp (10 dígitos)"
                                                maxLength={10}
                                                disabled={campoBloqueado('whatsapp')}
                                            />
                                            {erroresCampo.whatsapp && (
                                                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                                    <AlertCircle size={12} /> {erroresCampo.whatsapp}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Dependencia */}
                                <div>
                                    <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Dependencia y Sector</p>
                                    {registroCoreExistente && (
                                        <div className={`mb-4 p-3 rounded-xl flex items-start gap-2 ${isDark ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-300' : 'bg-yellow-50 border border-yellow-200 text-yellow-800'}`}>
                                            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                                            <span className="text-sm">
                                                Esta persona ya tiene un registro de contratista en el Core (otra aplicación pudo haberlo creado). Los campos que ya tienen dato quedan bloqueados abajo; los vacíos puedes completarlos.
                                            </span>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div><label className={labelClass}><Building2 size={14} />Dependencia</label>
                                            <select value={form.dependencia_id} onChange={e => handleDependenciaChange(e.target.value)} className={inputClass}>
                                                <option value="">Seleccionar dependencia</option>
                                                {dependencias.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                                            </select>
                                        </div>
                                        <div><label className={labelClass}><Briefcase size={14} />Sector</label>
                                            <select value={form.sector_id} onChange={e => setForm({ ...form, sector_id: e.target.value })} className={inputClass} disabled={!form.dependencia_id || campoContratistaBloqueado('sector_id')}>
                                                <option value="">Seleccionar sector</option>
                                                {sectoresFiltrados.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Líder de dependencia — solo en creación y solo si no hay líder en esa dependencia */}
                                {!editando && form.dependencia_id && !dependenciaTieneLider && (
                                    <div className={`flex items-start gap-3 p-4 rounded-xl border ${isDark ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-indigo-200 bg-indigo-50'}`}>
                                        <input
                                            type="checkbox"
                                            id="es_lider_check"
                                            checked={form.es_lider}
                                            onChange={e => setForm(prev => ({ ...prev, es_lider: e.target.checked }))}
                                            className="mt-0.5 w-4 h-4 accent-indigo-600 cursor-pointer flex-shrink-0"
                                        />
                                        <label htmlFor="es_lider_check" className="cursor-pointer select-none">
                                            <span className={`block text-sm font-medium ${isDark ? 'text-indigo-300' : 'text-indigo-800'}`}>
                                                Designar como líder de {dependencias.find(d => d.id == form.dependencia_id)?.nombre}
                                            </span>
                                            <span className={`block text-xs mt-0.5 ${isDark ? 'text-indigo-400/70' : 'text-indigo-600/70'}`}>
                                                Esta dependencia aún no tiene líder asignado
                                            </span>
                                        </label>
                                    </div>
                                )}

                                {/* Datos del contrato — solo en edición */}
                                {editando && (
                                <div>
                                    <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Datos del Contrato</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div><label className={labelClass}><FileText size={14} />N° Contrato</label><input type="text" value={form.numero_contrato} onChange={e => setForm({ ...form, numero_contrato: e.target.value })} className={inputClass} placeholder="Número de contrato" /></div>
                                        <div>
                                            <label className={labelClass}><Calendar size={14} />Fecha inicio</label>
                                            <input type="date" value={form.fecha_inicio} onChange={e => handleInputChange('fecha_inicio', e.target.value)} className={`${inputClass} ${erroresCampo.fechas ? 'border-red-500 focus:ring-red-500' : ''}`} />
                                            {erroresCampo.fechas && <p className="mt-1 text-xs text-red-500 flex items-center gap-1"><AlertCircle size={12} /> {erroresCampo.fechas}</p>}
                                        </div>
                                        <div>
                                            <label className={labelClass}><Calendar size={14} />Fecha fin</label>
                                            <input type="date" value={form.fecha_fin} onChange={e => handleInputChange('fecha_fin', e.target.value)} min={form.fecha_inicio} className={`${inputClass} ${erroresCampo.fechas ? 'border-red-500 focus:ring-red-500' : ''}`} />
                                        </div>
                                        <div className="md:col-span-2 lg:col-span-3"><label className={labelClass}><FileText size={14} />Objeto del contrato</label><textarea value={form.objeto_contrato} onChange={e => setForm({ ...form, objeto_contrato: e.target.value })} className={`${inputClass} resize-none`} rows={3} placeholder="Descripción del objeto del contrato" /></div>
                                    </div>
                                </div>
                                )}

                                {/* Minuta, Documentos y Obligaciones — solo en edición */}
                                {editando && (<>
                                {/* Minuta de contrato */}
                                <div>
                                    <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Minuta de Contrato</p>
                                    <div className={`rounded-xl border-2 border-dashed p-5 text-center transition cursor-pointer ${minutaFormFile
                                        ? isDark ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-emerald-400 bg-emerald-50'
                                        : isDark ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'}`}
                                        onClick={() => document.getElementById('minuta-form-input-c').click()}>
                                        <input id="minuta-form-input-c" type="file" accept=".pdf" className="hidden" onChange={e => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            const error = validarTamañoArchivo(file, 'minuta');
                                            if (error) {
                                                setErrorMinutaForm(error);
                                                e.target.value = '';
                                                return;
                                            }
                                            setErrorMinutaForm('');
                                            setMinutaFormFile(file);
                                        }} />
                                        {minutaFormFile ? (
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <FileCheck2 size={24} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
                                                    <div className="text-left">
                                                        <p className={`text-sm font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{minutaFormFile.name}</p>
                                                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{formatBytes(minutaFormFile.size)}</p>
                                                    </div>
                                                </div>
                                                <button type="button" onClick={e => { e.stopPropagation(); setMinutaFormFile(null); }}
                                                    className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-500 hover:text-gray-300' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600'}`}>
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-3">
                                                <Upload size={20} className={isDark ? 'text-gray-600' : 'text-gray-400'} />
                                                <div className="text-left">
                                                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{editando ? 'Haz clic para reemplazar la minuta (opcional)' : 'Haz clic para adjuntar la minuta (opcional)'}</p>
                                                    <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Solo PDF · Máximo 10 MB</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    {errorMinutaForm && (
                                        <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                                            <AlertCircle size={12} /> {errorMinutaForm}
                                        </p>
                                    )}
                                </div>

                                {/* Documentos Legales */}
                                <div>
                                    <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        Documentos Legales
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {DOCS_CONFIG.map(({ key, endpoint, label, icon: Icon }) => {
                                            const file = documentosForm[key];
                                            const existe = documentosExistentes[key];
                                            const error = erroresDocumentos[key];
                                            return (
                                                <div key={key}>
                                                    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition ${
                                                        file
                                                            ? isDark ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-emerald-300 bg-emerald-50'
                                                            : isDark ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-gray-50'
                                                    }`}>
                                                        <Icon size={15} className={file ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : existe ? (isDark ? 'text-sky-400' : 'text-sky-600') : (isDark ? 'text-gray-500' : 'text-gray-400')} />
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-xs font-medium truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</p>
                                                            {file ? (
                                                                <p className={`text-xs truncate ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{file.name}</p>
                                                            ) : existe ? (
                                                                <span className={`inline-flex items-center gap-1 text-xs ${isDark ? 'text-sky-400' : 'text-sky-600'}`}>
                                                                    <FileCheck2 size={10} /> Cargado
                                                                </span>
                                                            ) : (
                                                                <span className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Sin cargar</span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-0.5 flex-shrink-0">
                                                            {existe && editando && !file && (
                                                                <button type="button"
                                                                    onClick={() => handleDescargarDocumentoForm(editando, endpoint)}
                                                                    className={`p-1.5 rounded-lg transition ${isDark ? 'text-sky-500 hover:bg-gray-600' : 'text-sky-600 hover:bg-gray-200'}`}
                                                                    title="Ver documento">
                                                                    <Download size={13} />
                                                                </button>
                                                            )}
                                                            {file ? (
                                                                <button type="button"
                                                                    onClick={() => setDocumentosForm(prev => ({ ...prev, [key]: null }))}
                                                                    className={`p-1.5 rounded-lg transition ${isDark ? 'text-gray-500 hover:text-red-400 hover:bg-gray-600' : 'text-gray-400 hover:text-red-500 hover:bg-gray-200'}`}
                                                                    title="Quitar">
                                                                    <X size={13} />
                                                                </button>
                                                            ) : (
                                                                <>
                                                                    <input id={`doc-${key}`} type="file" accept=".pdf" className="hidden"
                                                                        onChange={e => {
                                                                            const f = e.target.files[0];
                                                                            if (!f) return;
                                                                            if (f.size > 10 * 1024 * 1024) {
                                                                                setErroresDocumentos(prev => ({ ...prev, [key]: 'Máx. 10 MB' }));
                                                                                e.target.value = '';
                                                                                return;
                                                                            }
                                                                            setErroresDocumentos(prev => { const n = { ...prev }; delete n[key]; return n; });
                                                                            setDocumentosForm(prev => ({ ...prev, [key]: f }));
                                                                        }} />
                                                                    <button type="button"
                                                                        onClick={() => document.getElementById(`doc-${key}`).click()}
                                                                        className={`p-1.5 rounded-lg transition ${isDark ? 'text-gray-500 hover:text-indigo-400 hover:bg-gray-600' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-200'}`}
                                                                        title={existe ? 'Reemplazar PDF' : 'Cargar PDF'}>
                                                                        <Upload size={13} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {error && (
                                                        <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                                            <AlertCircle size={11} /> {error}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Obligaciones */}
                                <div>
                                         <div className="flex items-center justify-between mb-3">
                                             <div>
                                                 <p className={`text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Obligaciones del contrato</p>
                                                 {editando && <p className={`text-[10px] mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Los cambios en obligaciones se guardan automáticamente al confirmar en este panel</p>}
                                             </div>
                                             <button type="button" onClick={() => { 
                                                 if (mostrarFormObligacionNueva) {
                                                     setMostrarFormObligacionNueva(false);
                                                     setEditandoObligacionIndice(null);
                                                 } else {
                                                     setFormObligacionNueva({ descripcion: '', observaciones: '' });
                                                     setMostrarFormObligacionNueva(true);
                                                 }
                                             }}
                                                 className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${mostrarFormObligacionNueva ? isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600' : isDark ? 'bg-violet-500/20 text-violet-400 hover:bg-violet-500/30' : 'bg-violet-50 text-violet-700 hover:bg-violet-100'}`}>
                                                 {mostrarFormObligacionNueva ? <><X size={12} /> Cancelar</> : <><Plus size={12} /> Agregar obligación</>}
                                             </button>
                                         </div>

                                         {/* Mini formulario para agregar/editar */}
                                         {mostrarFormObligacionNueva && (
                                             <div className={`mb-3 p-4 rounded-xl border ${isDark ? 'bg-gray-700/40 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                                 <div className="space-y-3">
                                                     <div>
                                                         <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Descripción *</label>
                                                         <textarea
                                                             value={formObligacionNueva.descripcion}
                                                             onChange={e => setFormObligacionNueva({ ...formObligacionNueva, descripcion: e.target.value })}
                                                             rows={2}
                                                             placeholder="Descripción de la obligación..."
                                                             className={`${inputClass} resize-none`}
                                                         />
                                                     </div>
                                                     {errorObligacionNueva && (
                                                         <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                                                             <AlertCircle size={15} /> {errorObligacionNueva}
                                                         </div>
                                                     )}
                                                     <div className="flex justify-end gap-2">
                                                         <button type="button" onClick={handleGuardarObligacionForm}
                                                             className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white transition disabled:opacity-50"
                                                             disabled={!formObligacionNueva.descripcion.trim() || loading}>
                                                             {loading ? <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" /> : <Save size={13} />}
                                                             {editandoObligacionIndice !== null ? 'Actualizar obligación' : 'Añadir a la lista'}
                                                         </button>
                                                     </div>
                                                 </div>
                                             </div>
                                         )}

                                         {/* Lista de obligaciones */}
                                         {obligacionesForm.length > 0 ? (
                                             <div className="space-y-2">
                                                 {obligacionesForm.map((ob, idx) => (
                                                     <div key={idx} className={`flex items-start justify-between gap-3 px-4 py-3 rounded-xl border ${isDark ? 'bg-gray-700/40 border-gray-600' : 'bg-white border-gray-200'}`}>
                                                         <div className="flex-1 min-w-0">
                                                             <p className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{ob.descripcion}</p>
                                                         </div>
                                                         <div className="flex items-center gap-1">
                                                             <button type="button" onClick={() => handleEditarObligacionForm(idx)}
                                                                 className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-600 text-gray-500 hover:text-indigo-400' : 'hover:bg-gray-100 text-gray-400 hover:text-indigo-600'}`}>
                                                                 <Edit size={14} />
                                                             </button>
                                                             <button type="button" onClick={() => handleEliminarObligacionForm(idx)}
                                                                 className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-600 text-gray-500 hover:text-red-400' : 'hover:bg-gray-100 text-gray-400 hover:text-red-600'}`}>
                                                                 <X size={14} />
                                                             </button>
                                                         </div>
                                                     </div>
                                                 ))}
                                                 {!editando && (
                                                     <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                                         {obligacionesForm.length} {obligacionesForm.length === 1 ? 'obligación' : 'obligaciones'} · Se guardarán al crear el contratista
                                                     </p>
                                                 )}
                                             </div>
                                         ) : (
                                             !mostrarFormObligacionNueva && (
                                                 <p className={`text-xs italic ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                                                     Opcional — puedes agregar obligaciones ahora o después desde la tabla
                                                 </p>
                                             )
                                          )}
                                     </div>
                                </>)}

                                {/* Acceso al sistema — solo en creación */}
                                {!editando && (
                                    <div className={`p-4 rounded-xl border ${isDark ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-indigo-200 bg-indigo-50'}`}>
                                        <p className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>
                                            <Shield size={14} /> Acceso al Sistema
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className={`p-3 rounded-lg ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                                                <p className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Rol asignado</p>
                                                <p className={`text-sm font-semibold mt-1 ${isDark ? 'text-orange-400' : 'text-orange-600'}`}>Contratista</p>
                                                <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Solo ve sus eventos asignados</p>
                                            </div>
                                            {!editando && (
                                                <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-900/30 border border-blue-700/40' : 'bg-blue-50 border border-blue-200'}`}>
                                                    <p className={`text-xs font-medium flex items-center gap-1 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                                                        <KeyRound size={12} /> Contraseña automática
                                                    </p>
                                                    <p className={`text-xs mt-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                                        El sistema generará una contraseña temporal segura y la enviará al correo del contratista junto con sus credenciales de acceso.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={resetForm} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}><X size={16} />Cancelar</button>
                                    <button type="submit" disabled={loading} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white transition-all disabled:opacity-50">
                                        {loading ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /><span>Guardando...</span></> : <><Save size={16} /><span>{editando ? 'Actualizar' : 'Guardar'}</span></>}
                                    </button>
                                </div>
                                </>}
                            </form>
                        </div>
                    </div>
                )}

                {avisoPostGuardado && (
                    <div className={`rounded-xl p-3 flex items-start justify-between gap-2 ${isDark ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-300' : 'bg-yellow-50 border border-yellow-200 text-yellow-800'}`}>
                        <div className="flex items-start gap-2">
                            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                            <span className="text-sm">{avisoPostGuardado}</span>
                        </div>
                        <button type="button" onClick={() => setAvisoPostGuardado('')} className="flex-shrink-0">
                            <X size={16} />
                        </button>
                    </div>
                )}

                {/* Listado */}
                <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'}`}>
                    <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Users size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Listado de Contratistas</h3>
                                <span className={`px-2 py-0.5 rounded-full text-xs ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>{pagination.total} registros</span>
                            </div>
                            {!loading && pagination.total > 0 && (
                                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Mostrando {contratistas.length} de {pagination.total}</span>
                            )}
                        </div>
                    </div>

                    {loading && contratistas.length === 0 ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent" />
                        </div>
                    ) : (
                        <>
                            {/* Desktop */}
                            {!isMobile && (
                                <div className="overflow-x-auto">
                                    <div className="max-h-[500px] overflow-y-auto custom-scroll">
                                        <table className="w-full text-sm">
                                            <thead className={`sticky top-0 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
                                                <tr className={isDark ? 'bg-gray-900/50 border-b border-gray-700' : 'bg-gray-50 border-b border-gray-200'}>
                                                    {['Nombre', 'Cédula', 'Email', 'Dependencia', 'Sector', 'Objeto Contrato', 'Documentos', 'Contrato', 'WhatsApp', 'Acciones'].map(h => (
                                                        <th key={h} className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                {contratistas.map(c => (
                                                    <tr key={c.id} className={`transition ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                                                        {/* Nombre con avatar */}
                                                        <td className={`px-4 py-3 font-medium whitespace-nowrap ${isDark ? 'text-white' : 'text-gray-800'}`} style={{ minWidth: '280px' }}>
                                                            <div className="flex items-center gap-2.5">
                                                                <button onClick={() => setFotoAmpliada(c.persona?.foto_url ?? '/images/imagendefault.png')} className="flex-shrink-0 focus:outline-none">
                                                                    <img
                                                                        src={c.persona?.foto_thumbnail_url ?? '/images/imagendefault.png'}
                                                                        alt=""
                                                                        className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-gray-600 shadow-sm hover:ring-2 hover:ring-indigo-400 transition"
                                                                        onError={e => { e.target.src = '/images/imagendefault.png'; }}
                                                                    />
                                                                </button>
                                                                <div className="flex flex-col">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setModalDetalle(c)}
                                                                        className={`text-left font-medium hover:underline transition ${isDark ? 'text-white hover:text-indigo-300' : 'text-gray-800 hover:text-indigo-600'}`}
                                                                    >
                                                                        {c.persona?.nombres} {c.persona?.apellidos}
                                                                    </button>
                                                                    {c.es_lider && (
                                                                        <span title={`Líder de ${c.dependencia?.nombre}`}
                                                                            className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase w-fit ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-700'}`}>
                                                                            Líder
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{c.persona?.numero_identificacion}</td>
                                                        <td className={`px-4 py-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><span className="block max-w-[200px] truncate">{c.persona?.email}</span></td>
                                                        <td className={`px-4 py-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{c.dependencia?.nombre || '-'}</td>
                                                        <td className={`px-4 py-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{c.sector?.nombre || '-'}</td>
                                                        <td className={`px-4 py-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} style={{ minWidth: '260px' }}>
                                                            {c.objeto_contrato ? (
                                                                <div>
                                                                    <p className="text-sm break-words whitespace-normal">
                                                                        {c.objeto_contrato.length > 100 ? `${c.objeto_contrato.substring(0, 100)}...` : c.objeto_contrato}
                                                                    </p>
                                                                    {c.objeto_contrato.length > 100 && (
                                                                        <button onClick={() => setModalObjeto({ show: true, objeto: c.objeto_contrato, numero: c.numero_contrato })}
                                                                            className={`text-xs mt-1 ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}>Ver completo</button>
                                                                    )}
                                                                    {c.numero_contrato && <p className="text-xs mt-1 opacity-70"><span className="font-medium">N°:</span> {c.numero_contrato}</p>}
                                                                </div>
                                                            ) : <span className="italic opacity-50">Sin contrato</span>}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            {(() => {
                                                                const total = 11;
                                                                const cargados = (c.tiene_minuta ? 1 : 0) + Object.values(c.documentos_estado ?? {}).filter(Boolean).length;
                                                                return (
                                                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cargados === total ? (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700') : cargados > 0 ? (isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-700') : (isDark ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400')}`}>
                                                                        <FolderOpen size={11} /> {cargados}/{total}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <EstadoContratoBadge contratista={c} isDark={isDark} />
                                                        </td>
                                                        <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{c.persona?.whatsapp || '-'}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div className="flex items-center gap-1">
                                                                <button onClick={() => handleEditar(c)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-indigo-400' : 'hover:bg-gray-100 text-gray-500 hover:text-indigo-600'}`} title="Editar"><Edit size={15} /></button>
                                                                <button onClick={() => handleAbrirModalFoto(c.id, `${c.persona?.nombres} ${c.persona?.apellidos}`, c.persona?.foto_url)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-sky-400' : 'hover:bg-gray-100 text-gray-500 hover:text-sky-600'}`} title="Cambiar foto"><Camera size={15} /></button>
                                                                <button onClick={() => handleAbrirModalDocumentos(c)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-amber-400' : 'hover:bg-gray-100 text-gray-500 hover:text-amber-600'}`} title="Documentos"><FolderOpen size={15} /></button>
                                                                <button onClick={() => handleAbrirObligaciones(c)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-violet-400' : 'hover:bg-gray-100 text-gray-500 hover:text-violet-600'}`} title="Gestionar obligaciones"><ClipboardList size={15} /></button>
                                                                {filtros.dependencia_id && (
                                                                    <button
                                                                        onClick={() => handleToggleLider(c)}
                                                                        disabled={loadingLider}
                                                                        title={c.es_lider ? 'Quitar como líder de dependencia' : 'Asignar como líder de dependencia'}
                                                                        className={`p-1.5 rounded-lg transition disabled:opacity-50 ${c.es_lider
                                                                            ? isDark ? 'text-indigo-400 hover:bg-indigo-500/20' : 'text-indigo-600 hover:bg-indigo-50'
                                                                            : isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-indigo-400' : 'hover:bg-gray-100 text-gray-400 hover:text-indigo-600'}`}>
                                                                        <BadgeCheck size={15} />
                                                                    </button>
                                                                )}
                                                                <button onClick={() => openModal(c.id, `${c.persona?.nombres} ${c.persona?.apellidos}`)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-red-400' : 'hover:bg-gray-100 text-gray-500 hover:text-red-600'}`} title="Desactivar"><Trash2 size={15} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {contratistas.length === 0 && (
                                                    <tr><td colSpan="9" className={`px-6 py-12 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                        <Users size={48} className={`mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                                                        <p>No hay contratistas registrados</p>
                                                    </td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Móvil */}
                            {isMobile && (
                                <div className="max-h-[500px] overflow-y-auto custom-scroll">
                                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                        {contratistas.map(c => (
                                            <div key={c.id} className={`p-4 ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <button onClick={() => setFotoAmpliada(c.persona?.foto_url ?? '/images/imagendefault.png')} className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-gray-600">
                                                            <img src={c.persona?.foto_thumbnail_url ?? '/images/imagendefault.png'} alt="" className="w-full h-full object-cover"
                                                                onError={e => { e.target.src = '/images/imagendefault.png'; }} />
                                                        </button>
                                                        <div>
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <button type="button" onClick={() => setModalDetalle(c)}
                                                                    className={`font-semibold hover:underline text-left ${isDark ? 'text-white hover:text-indigo-300' : 'text-gray-800 hover:text-indigo-600'}`}>
                                                                    {c.persona?.nombres} {c.persona?.apellidos}
                                                                </button>
                                                                {c.es_lider && (
                                                                    <span title={`Líder de ${c.dependencia?.nombre}`}
                                                                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-50 text-indigo-700'}`}>
                                                                        Líder
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{c.persona?.numero_identificacion}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleEditar(c)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-indigo-400' : 'hover:bg-gray-100 text-gray-500 hover:text-indigo-600'}`}><Edit size={16} /></button>
                                                        <button onClick={() => handleAbrirModalFoto(c.id, `${c.persona?.nombres} ${c.persona?.apellidos}`, c.persona?.foto_url)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-sky-400' : 'hover:bg-gray-100 text-gray-500 hover:text-sky-600'}`}><Camera size={16} /></button>
                                                        <button onClick={() => handleAbrirModalDocumentos(c)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-amber-400' : 'hover:bg-gray-100 text-gray-500 hover:text-amber-600'}`} title="Documentos"><FolderOpen size={16} /></button>
                                                        <button onClick={() => handleAbrirObligaciones(c)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-violet-400' : 'hover:bg-gray-100 text-gray-500 hover:text-violet-600'}`} title="Obligaciones"><ClipboardList size={16} /></button>
                                                        {filtros.dependencia_id && (
                                                            <button
                                                                onClick={() => handleToggleLider(c)}
                                                                disabled={loadingLider}
                                                                title={c.es_lider ? 'Quitar como líder' : 'Asignar como líder'}
                                                                className={`p-1.5 rounded-lg transition disabled:opacity-50 ${c.es_lider
                                                                    ? isDark ? 'text-indigo-400 hover:bg-indigo-500/20' : 'text-indigo-600 hover:bg-indigo-50'
                                                                    : isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-indigo-400' : 'hover:bg-gray-100 text-gray-400 hover:text-indigo-600'}`}>
                                                                <BadgeCheck size={16} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => openModal(c.id, `${c.persona?.nombres} ${c.persona?.apellidos}`)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-red-400' : 'hover:bg-gray-100 text-gray-500 hover:text-red-600'}`}><Trash2 size={16} /></button>
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5 mt-2 ml-1">
                                                    <div className="flex items-center gap-2 text-sm"><Mail size={13} className={isDark ? 'text-gray-500' : 'text-gray-400'} /><span className={isDark ? 'text-gray-400' : 'text-gray-600'}>{c.persona?.email}</span></div>
                                                    <div className="flex items-center gap-2 text-sm"><Building2 size={13} className={isDark ? 'text-gray-500' : 'text-gray-400'} /><span className={isDark ? 'text-gray-400' : 'text-gray-600'}>{c.dependencia?.nombre || '-'}</span></div>
                                                    <div className="flex items-center gap-2">
                                                        {(() => {
                                                            const cargados = (c.tiene_minuta ? 1 : 0) + Object.values(c.documentos_estado ?? {}).filter(Boolean).length;
                                                            return (
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cargados === 11 ? (isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700') : cargados > 0 ? (isDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-50 text-amber-700') : (isDark ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400')}`}>
                                                                    <FolderOpen size={10} /> Docs: {cargados}/11
                                                                </span>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {contratistas.length === 0 && (
                                            <div className={`p-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                <Users size={48} className={`mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                                                <p>No hay contratistas registrados</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Paginación */}
                            {pagination.last_page > 1 && (
                                <div className={`px-6 py-4 border-t flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                    <button onClick={() => goToPage(pagination.current_page - 1)} disabled={pagination.current_page === 1}
                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50'}`}>
                                        <ChevronLeft size={16} /> Anterior
                                    </button>
                                    <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Página {pagination.current_page} de {pagination.last_page}</span>
                                    <button onClick={() => goToPage(pagination.current_page + 1)} disabled={pagination.current_page === pagination.last_page}
                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50'}`}>
                                        Siguiente <ChevronRight size={16} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ── Modales ─────────────────────────────────────────────────────── */}

            {/* Modal ampliar foto */}
            {fotoAmpliada && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setFotoAmpliada(null)}>
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                    <img src={fotoAmpliada} alt="Foto ampliada" className="relative max-w-sm w-full rounded-2xl shadow-2xl object-cover"
                        onError={e => { e.target.src = '/images/imagendefault.png'; }} />
                </div>
            )}

            {/* Modal cambiar foto */}
            {modalFoto.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCerrarModalFoto} />
                    <div className={`relative w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                        <div className={`px-6 py-4 border-b flex justify-between items-center ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <div className="flex items-center gap-2">
                                <Camera size={18} className={isDark ? 'text-sky-400' : 'text-sky-600'} />
                                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Foto de Perfil</h3>
                            </div>
                            <button onClick={handleCerrarModalFoto} className={`p-1 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Contratista: <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>{modalFoto.nombre}</span>
                            </p>
                            {errorFoto && (
                                <div className={`p-3 rounded-xl flex items-center gap-2 ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                                    <AlertCircle size={15} /><span className="text-sm">{errorFoto}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-4">
                                <div className="relative flex-shrink-0">
                                    <button type="button" onClick={() => setFotoAmpliada(fotoModalPreview || fotoModalExistente || '/images/imagendefault.png')} className="focus:outline-none">
                                        <img src={fotoModalPreview || fotoModalExistente || '/images/imagendefault.png'} alt="Preview"
                                            className="w-24 h-24 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600 shadow cursor-pointer hover:opacity-80 transition"
                                            onError={e => { e.target.src = '/images/imagendefault.png'; }} />
                                    </button>
                                    {fotoModalPreview && (
                                        <button onClick={() => { setFotoModalFile(null); setFotoModalPreview(null); }}
                                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white transition">
                                            <X size={11} />
                                        </button>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <input id="foto-modal-c" type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFotoModalChange} />
                                    <button onClick={() => document.getElementById('foto-modal-c').click()}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                        <Camera size={14} /> {fotoModalPreview ? 'Cambiar' : 'Seleccionar'}
                                    </button>
                                    <p className={`mt-1.5 text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>JPG, PNG, WebP · Máx. 2 MB</p>
                                </div>
                            </div>
                        </div>
                        <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <button onClick={handleCerrarModalFoto} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Cancelar</button>
                            <button onClick={handleSubirFotoModal} disabled={loadingFoto || !fotoModalFile}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 text-white transition disabled:opacity-50">
                                {loadingFoto ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Guardando...</> : <><Camera size={15} /> Guardar Foto</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal documentos del contratista */}
            {modalDocumentos.show && modalDocumentos.contratista && (() => {
                const c = modalDocumentos.contratista;
                const nombre = `${c.persona?.nombres ?? ''} ${c.persona?.apellidos ?? ''}`.trim();
                const allDocs = [
                    { key: 'minuta', endpoint: 'minuta', label: 'Minuta de Contrato', icon: FileText, existe: c.tiene_minuta },
                    ...DOCS_CONFIG.map(d => ({ ...d, existe: c.documentos_estado?.[d.key] ?? false })),
                ];
                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCerrarModalDocumentos} />
                        <div className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                            {/* Header */}
                            <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                <div className="flex items-center gap-2">
                                    <FolderOpen size={18} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
                                    <div>
                                        <h3 className={`font-semibold leading-tight ${isDark ? 'text-white' : 'text-gray-800'}`}>Documentos</h3>
                                        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{nombre}</p>
                                    </div>
                                </div>
                                <button onClick={handleCerrarModalDocumentos} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}><X size={18} /></button>
                            </div>

                            {/* Lista de documentos */}
                            <div className="p-4 space-y-1.5 max-h-[70vh] overflow-y-auto">
                                {allDocs.map(({ key, endpoint, label, icon: Icon, existe }) => {
                                    const isLoading = loadingDocModal[key];
                                    const err = errorDocModal[key];
                                    const inputId = `modal-doc-${key}`;
                                    return (
                                        <div key={key}>
                                            <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition ${existe ? isDark ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-emerald-200 bg-emerald-50/60' : isDark ? 'border-gray-700 bg-gray-700/30' : 'border-gray-200 bg-gray-50'}`}>
                                                <Icon size={15} className={existe ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-gray-500' : 'text-gray-400')} />
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{label}</p>
                                                    {existe ? (
                                                        <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                                            <FileCheck2 size={10} /> Cargado
                                                        </span>
                                                    ) : (
                                                        <span className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Sin cargar</span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    {isLoading ? (
                                                        <Loader2 size={16} className="animate-spin text-indigo-500" />
                                                    ) : confirmarEliminarDoc === key ? (
                                                        <div className="flex items-center gap-1">
                                                            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>¿Eliminar?</span>
                                                            <button
                                                                onClick={() => handleEliminarDocumento(key, endpoint)}
                                                                className="px-2 py-1 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition">
                                                                Sí
                                                            </button>
                                                            <button
                                                                onClick={() => setConfirmarEliminarDoc(null)}
                                                                className={`px-2 py-1 rounded-lg text-xs font-medium transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                                                                No
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            {existe && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleDescargarDocumento(c.id, endpoint)}
                                                                        className={`p-1.5 rounded-lg transition ${isDark ? 'text-emerald-500 hover:bg-gray-600 hover:text-emerald-400' : 'text-emerald-600 hover:bg-gray-200'}`}
                                                                        title="Descargar / Ver">
                                                                        <Download size={15} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setConfirmarEliminarDoc(key)}
                                                                        className={`p-1.5 rounded-lg transition ${isDark ? 'text-gray-500 hover:text-red-400 hover:bg-gray-600' : 'text-gray-400 hover:text-red-500 hover:bg-gray-200'}`}
                                                                        title="Eliminar">
                                                                        <Trash2 size={15} />
                                                                    </button>
                                                                </>
                                                            )}
                                                            <input id={inputId} type="file" accept=".pdf" className="hidden"
                                                                onChange={e => {
                                                                    const file = e.target.files[0];
                                                                    if (!file) return;
                                                                    e.target.value = '';
                                                                    if (key === 'minuta') {
                                                                        handleSubirMinutaModal(file);
                                                                    } else {
                                                                        handleSubirDocumentoModal(key, endpoint, file);
                                                                    }
                                                                }} />
                                                            <button
                                                                onClick={() => document.getElementById(inputId).click()}
                                                                className={`p-1.5 rounded-lg transition ${isDark ? 'text-gray-500 hover:text-indigo-400 hover:bg-gray-600' : 'text-gray-400 hover:text-indigo-600 hover:bg-gray-200'}`}
                                                                title={existe ? 'Reemplazar' : 'Cargar PDF'}>
                                                                <Upload size={15} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            {err && (
                                                <p className="mt-1 ml-1 text-xs text-red-500 flex items-center gap-1">
                                                    <AlertCircle size={11} /> {err}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className={`px-6 py-3 border-t flex justify-end ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                                <button onClick={handleCerrarModalDocumentos} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Cerrar</button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Modal foto ampliada */}
            {fotoAmpliada && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setFotoAmpliada(null)}>
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <button onClick={() => setFotoAmpliada(null)} className="fixed top-4 right-4 z-[61] p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition">
                        <X size={24} />
                    </button>
                    <div className="relative max-w-2xl max-h-[90vh]">
                        <img src={fotoAmpliada} alt="Foto ampliada" className="rounded-2xl shadow-2xl max-w-full max-h-[90vh] object-contain"
                            onError={e => { e.target.src = '/images/imagendefault.png'; }} />
                    </div>
                </div>
            )}

            {/* Modal renovar contrato */}
            {modalRenovar.show && modalRenovar.contratista && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCerrarRenovar} />
                    <div className={`relative w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <div className="flex items-center gap-2">
                                <RefreshCw size={18} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
                                <div>
                                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Renovar Contrato</h3>
                                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{modalRenovar.contratista.persona?.nombres} {modalRenovar.contratista.persona?.apellidos}</p>
                                </div>
                            </div>
                            <button onClick={handleCerrarRenovar} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}><X size={18} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {errorRenovar && (
                                <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                                    <AlertCircle size={15} /> {errorRenovar}
                                </div>
                            )}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}><FileText size={14} />Tipo de renovación *</label>
                                    <select value={formRenovar.tipo} onChange={e => setFormRenovar(p => ({ ...p, tipo: e.target.value }))} className={inputClass}>
                                        <option value="prorroga">Prórroga</option>
                                        <option value="adicion">Adición de valor</option>
                                        <option value="nuevo_contrato">Nuevo contrato</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}><FileText size={14} />N° Contrato nuevo</label>
                                    <input type="text" value={formRenovar.numero_nuevo} onChange={e => setFormRenovar(p => ({ ...p, numero_nuevo: e.target.value }))} className={inputClass} placeholder="Número de contrato" />
                                </div>
                                <div>
                                    <label className={labelClass}><Calendar size={14} />Nueva fecha inicio *</label>
                                    <input type="date" value={formRenovar.fecha_inicio_nueva} onChange={e => setFormRenovar(p => ({ ...p, fecha_inicio_nueva: e.target.value }))} className={inputClass} />
                                </div>
                                <div>
                                    <label className={labelClass}><Calendar size={14} />Nueva fecha fin *</label>
                                    <input type="date" value={formRenovar.fecha_fin_nueva} onChange={e => setFormRenovar(p => ({ ...p, fecha_fin_nueva: e.target.value }))} className={inputClass} min={formRenovar.fecha_inicio_nueva} />
                                </div>
                                {formRenovar.tipo === 'adicion' && (
                                    <div className="sm:col-span-2">
                                        <label className={labelClass}><FileText size={14} />Valor adición ($)</label>
                                        <input type="number" value={formRenovar.valor_adicion} onChange={e => setFormRenovar(p => ({ ...p, valor_adicion: e.target.value }))} className={inputClass} placeholder="0.00" min="0" />
                                    </div>
                                )}
                                <div className="sm:col-span-2">
                                    <label className={labelClass}><FileText size={14} />Motivo / Justificación *</label>
                                    <textarea value={formRenovar.motivo} onChange={e => setFormRenovar(p => ({ ...p, motivo: e.target.value }))} rows={3} className={`${inputClass} resize-none`} placeholder="Describa el motivo de la renovación..." />
                                </div>
                                <div className="sm:col-span-2">
                                    <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Documentos de renovación</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {[
                                            { key: 'minuta',      label: 'Nueva Minuta de Contrato',  file: minutaRenovar,               set: setMinutaRenovar,               inputId: 'minuta-renov-c' },
                                            { key: 'acta',        label: 'Acta de Inicio',            file: actaInicioRenovar,            set: setActaInicioRenovar,           inputId: 'acta-renov-c' },
                                            { key: 'resolucion',  label: 'Resolución Supervisor',     file: resolucionSupervisorRenovar,  set: setResolucionSupervisorRenovar, inputId: 'resolucion-renov-c' },
                                        ].map(({ label, file, set, inputId }) => (
                                            <div key={inputId}
                                                onClick={() => document.getElementById(inputId).click()}
                                                className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed cursor-pointer transition ${file ? (isDark ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-emerald-400 bg-emerald-50') : (isDark ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400')}`}>
                                                <input id={inputId} type="file" accept=".pdf" className="hidden"
                                                    onChange={e => { const f = e.target.files[0]; if (f) set(f); e.target.value = ''; }} />
                                                <FileText size={16} className={file ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-gray-500' : 'text-gray-400')} />
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{label}</p>
                                                    <p className={`text-xs truncate ${file ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-gray-600' : 'text-gray-400')}`}>
                                                        {file ? file.name : 'Haz clic para adjuntar PDF'}
                                                    </p>
                                                </div>
                                                {file && (
                                                    <button type="button" onClick={e => { e.stopPropagation(); set(null); }}
                                                        className={`p-1 rounded-lg flex-shrink-0 ${isDark ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'}`}>
                                                        <X size={13} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <button onClick={handleCerrarRenovar} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Cancelar</button>
                            <button onClick={handleConfirmarRenovar} disabled={loadingRenovar}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white transition disabled:opacity-50">
                                {loadingRenovar ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Guardando...</> : <><RefreshCw size={15} /> Confirmar Renovación</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal historial de renovaciones */}
            {modalHistorial.show && modalHistorial.contratista && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCerrarHistorial} />
                    <div className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <div className="flex items-center gap-2">
                                <History size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                <div>
                                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Historial Contractual</h3>
                                    <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{modalHistorial.contratista.persona?.nombres} {modalHistorial.contratista.persona?.apellidos}</p>
                                </div>
                            </div>
                            <button onClick={handleCerrarHistorial} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}><X size={18} /></button>
                        </div>
                        <div className="p-4 max-h-[60vh] overflow-y-auto space-y-3">
                            {loadingHistorial ? (
                                <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-4 border-indigo-500 border-t-transparent" /></div>
                            ) : historial.length === 0 ? (
                                <div className={`text-center py-10 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <History size={36} className="mx-auto mb-2 opacity-40" />
                                    <p className="text-sm">Sin renovaciones registradas</p>
                                </div>
                            ) : (
                                historial.map((r, i) => {
                                    const tipoLabel = { prorroga: 'Prórroga', adicion: 'Adición', nuevo_contrato: 'Nuevo contrato' }[r.tipo] ?? r.tipo;
                                    const tipoColor = { prorroga: isDark ? 'text-sky-400 bg-sky-500/10' : 'text-sky-700 bg-sky-50', adicion: isDark ? 'text-amber-400 bg-amber-500/10' : 'text-amber-700 bg-amber-50', nuevo_contrato: isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-700 bg-emerald-50' }[r.tipo] ?? '';
                                    return (
                                        <div key={r.id} className={`rounded-xl border p-4 ${isDark ? 'bg-gray-700/40 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${tipoColor}`}>{tipoLabel}</span>
                                                <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{new Date(r.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2">
                                                {r.numero_anterior && <div><span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Contrato anterior: </span><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{r.numero_anterior}</span></div>}
                                                {r.numero_nuevo && <div><span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Contrato nuevo: </span><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{r.numero_nuevo}</span></div>}
                                                {r.fecha_fin_anterior && <div><span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Fin anterior: </span><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>{new Date(String(r.fecha_fin_anterior).substring(0, 10) + 'T12:00:00').toLocaleDateString('es-CO')}</span></div>}
                                                <div><span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Nueva vigencia: </span><span className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>{new Date(String(r.fecha_inicio_nueva).substring(0, 10) + 'T12:00:00').toLocaleDateString('es-CO')} → {new Date(String(r.fecha_fin_nueva).substring(0, 10) + 'T12:00:00').toLocaleDateString('es-CO')}</span></div>
                                                {r.valor_adicion && <div><span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Valor adición: </span><span className={isDark ? 'text-gray-300' : 'text-gray-700'}>${Number(r.valor_adicion).toLocaleString('es-CO')}</span></div>}
                                            </div>
                                            <p className={`text-xs mt-2 italic ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{r.motivo}</p>
                                            <p className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Por: {r.renovado_por?.name ?? '—'}</p>
                                            {(r.ruta_minuta || r.ruta_acta_inicio) && (
                                                <div className="flex gap-2 mt-2 flex-wrap">
                                                    {r.ruta_minuta && (
                                                        <button onClick={async () => {
                                                            const res = await api.get(`/contratistas/${modalHistorial.contratista.id}/renovaciones/${r.id}/documentos/minuta`, { responseType: 'blob' });
                                                            const url = URL.createObjectURL(res.data);
                                                            window.open(url, '_blank');
                                                            setTimeout(() => URL.revokeObjectURL(url), 15000);
                                                        }} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg ${isDark ? 'bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25' : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'}`}>
                                                            <Download size={11} /> Minuta
                                                        </button>
                                                    )}
                                                    {r.ruta_acta_inicio && (
                                                        <button onClick={async () => {
                                                            const res = await api.get(`/contratistas/${modalHistorial.contratista.id}/renovaciones/${r.id}/documentos/acta-inicio`, { responseType: 'blob' });
                                                            const url = URL.createObjectURL(res.data);
                                                            window.open(url, '_blank');
                                                            setTimeout(() => URL.revokeObjectURL(url), 15000);
                                                        }} className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg ${isDark ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}>
                                                            <Download size={11} /> Acta de Inicio
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <div className={`px-6 py-3 border-t flex justify-end ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <button onClick={handleCerrarHistorial} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal desactivar */}
            {modalConfirm.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
                    <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                        <div className="p-6 text-center">
                            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}>
                                <AlertTriangle size={24} className={isDark ? 'text-red-400' : 'text-red-600'} />
                            </div>
                            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>Desactivar contratista</h3>
                            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>¿Estás seguro de desactivar a <span className="font-semibold">"{modalConfirm.nombre}"</span>? Su acceso al sistema también será desactivado.</p>
                            {error && <div className={`mb-4 p-2 rounded-lg text-sm ${isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-50 text-red-600'}`}>{error}</div>}
                            <div className="flex gap-3">
                                <button onClick={closeModal} className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Cancelar</button>
                                <button onClick={handleEliminar} disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50">
                                    {loading ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Desactivando...</> : <><Trash2 size={16} /> Desactivar</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal objeto contrato */}
            {modalObjeto.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalObjeto({ show: false, objeto: '', numero: '' })} />
                    <div className={`relative w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                        <div className={`px-6 py-4 border-b flex justify-between items-center ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <div className="flex items-center gap-2"><FileText size={20} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} /><h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Detalle del Contrato</h3></div>
                            <button onClick={() => setModalObjeto({ show: false, objeto: '', numero: '' })} className={`p-1 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}><X size={20} /></button>
                        </div>
                        <div className="p-6">
                            {modalObjeto.numero && <div className="mb-4"><label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Número de Contrato</label><p className={`text-sm font-mono ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{modalObjeto.numero}</p></div>}
                            <div><label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Objeto del Contrato</label>
                                <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}><p className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{modalObjeto.objeto}</p></div>
                            </div>
                        </div>
                        <div className={`px-6 py-4 border-t flex justify-end ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <button onClick={() => setModalObjeto({ show: false, objeto: '', numero: '' })} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal Obligaciones ──────────────────────────────────────── */}
            {modalObligaciones.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCerrarObligaciones} />
                    <div className={`relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>

                        {/* Header */}
                        <div className={`px-6 py-4 border-b flex items-center justify-between flex-shrink-0 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <div className="flex items-center gap-3 min-w-0">
                                <ClipboardList size={20} className={isDark ? 'text-violet-400' : 'text-violet-600'} />
                                <div className="min-w-0">
                                    <h3 className={`font-semibold truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                        Obligaciones — {modalObligaciones.nombre} {modalObligaciones.numeroContrato && <span className="opacity-60 text-xs ml-1 font-normal">(N°: {modalObligaciones.numeroContrato})</span>}
                                    </h3>
                                    {modalObligaciones.tieneMinuta && (
                                        <p className={`text-xs mt-0.5 flex items-center gap-1 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                                            <FileCheck2 size={11} />
                                            Minuta disponible —{' '}
                                            <button onClick={() => handleDescargarMinuta(modalObligaciones.contratistaId)}
                                                className="underline hover:no-underline">
                                                ver minuta del contrato
                                            </button>
                                        </p>
                                    )}
                                    {!modalObligaciones.tieneMinuta && (
                                        <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                            Sin minuta cargada — ingrese las obligaciones manualmente
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button onClick={handleCerrarObligaciones} className={`p-1 rounded-lg flex-shrink-0 ml-4 ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}><X size={20} /></button>
                        </div>

                        {/* Toolbar */}
                        <div className={`px-6 py-3 border-b flex-shrink-0 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <button onClick={handleNuevaObligacion}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition ${mostrarFormObligacion && !editandoObligacion
                                    ? isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                                    : 'bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-sm'}`}>
                                <Plus size={15} /> Agregar obligación
                            </button>
                        </div>

                        {/* Contenido scrollable */}
                        <div ref={obligacionesScrollRef} className="flex-1 overflow-y-auto custom-scroll">

                            {/* Formulario inline */}
                            {mostrarFormObligacion && (
                                <div className={`mx-6 mt-4 mb-2 p-5 rounded-xl border ${isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                    <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {editandoObligacion ? 'Editar obligación' : 'Nueva obligación'}
                                    </p>
                                    {errorObligacion && (
                                        <div className={`mb-3 p-2.5 rounded-lg flex items-center gap-2 text-sm ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                                            <AlertCircle size={14} /> {errorObligacion}
                                        </div>
                                    )}
                                    <form onSubmit={handleGuardarObligacion} className="space-y-3">
                                        <div>
                                            <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Descripción *</label>
                                            <textarea
                                                value={formObligacion.descripcion}
                                                onChange={e => setFormObligacion({ ...formObligacion, descripcion: e.target.value })}
                                                rows={3}
                                                placeholder="Descripción de la obligación según la minuta..."
                                                className={`w-full rounded-xl px-4 py-2.5 text-sm resize-none transition border focus:outline-none focus:ring-2 focus:ring-violet-500 ${isDark ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                            />
                                        </div>
                                        <div>
                                            <label className={`block text-xs font-medium mb-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Observaciones</label>
                                            <textarea
                                                value={formObligacion.observaciones}
                                                onChange={e => setFormObligacion({ ...formObligacion, observaciones: e.target.value })}
                                                rows={2}
                                                placeholder="Notas adicionales (opcional)..."
                                                className={`w-full rounded-xl px-4 py-2.5 text-sm resize-none transition border focus:outline-none focus:ring-2 focus:ring-violet-500 ${isDark ? 'bg-gray-900 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
                                            />
                                        </div>
                                        <div className="flex justify-end gap-2 pt-1">
                                            <button type="button" onClick={() => { setMostrarFormObligacion(false); setEditandoObligacion(null); setErrorObligacion(''); }}
                                                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-600 text-gray-300 hover:bg-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                                                Cancelar
                                            </button>
                                            <button type="submit" disabled={savingObligacion}
                                                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white transition disabled:opacity-50">
                                                {savingObligacion
                                                    ? <><div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" /> Guardando...</>
                                                    : <><Save size={14} /> {editandoObligacion ? 'Actualizar' : 'Guardar'}</>}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Lista de obligaciones */}
                            <div className="px-6 pb-6 pt-4">
                                {loadingObligaciones ? (
                                    <div className="flex items-center justify-center py-12">
                                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-violet-500 border-t-transparent" />
                                    </div>
                                ) : obligaciones.length === 0 ? (
                                    <div className={`text-center py-12 rounded-xl border-2 border-dashed ${isDark ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'}`}>
                                        <ClipboardList size={40} className={`mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                                        <p className="text-sm font-medium">Sin obligaciones registradas</p>
                                        <p className="text-xs mt-1">Haz clic en "Agregar obligación" para comenzar</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {obligaciones.map(o => (
                                            <div key={o.id} className={`rounded-xl border p-4 transition ${isDark ? 'bg-gray-700/40 border-gray-600 hover:bg-gray-700/60' : 'bg-gray-50 border-gray-200 hover:bg-white'}`}>
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>{o.descripcion}</p>
                                                        {o.observaciones && (
                                                            <p className={`text-xs mt-2 italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{o.observaciones}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1 flex-shrink-0">
                                                        <button onClick={() => handleEditarObligacion(o)}
                                                            className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-600 text-gray-400 hover:text-indigo-400' : 'hover:bg-gray-200 text-gray-400 hover:text-indigo-600'}`}
                                                            title="Editar">
                                                            <Edit size={14} />
                                                        </button>
                                                        {confirmEliminarObligacion === o.id ? (
                                                            <div className="flex gap-1">
                                                                <button onClick={() => handleEliminarObligacion(o.id)}
                                                                    className="p-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white transition"
                                                                    title="Confirmar eliminar">
                                                                    <CheckCircle2 size={14} />
                                                                </button>
                                                                <button onClick={() => setConfirmEliminarObligacion(null)}
                                                                    className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-500'}`}
                                                                    title="Cancelar">
                                                                    <X size={14} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => setConfirmEliminarObligacion(o.id)}
                                                                className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-600 text-gray-400 hover:text-red-400' : 'hover:bg-gray-200 text-gray-400 hover:text-red-600'}`}
                                                                title="Eliminar">
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className={`px-6 py-4 border-t flex justify-between items-center flex-shrink-0 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {obligaciones.length} {obligaciones.length === 1 ? 'obligación' : 'obligaciones'}
                            </span>
                            <button onClick={handleCerrarObligaciones}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal asignar / quitar líder */}
            {modalLider.show && (
                <ModalConfirmLider
                    contratista={modalLider.contratista}
                    loading={loadingLider}
                    onConfirm={handleConfirmarLider}
                    onClose={() => setModalLider({ show: false, contratista: null })}
                />
            )}

            {/* Modal detalle contratista */}
            {modalDetalle && (
                <ContratistaDetalleModal
                    contratista={modalDetalle}
                    isDark={isDark}
                    onClose={() => setModalDetalle(null)}
                />
            )}

            <style>{`
                .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scroll::-webkit-scrollbar-track { background: ${isDark ? '#1f2937' : '#f1f5f9'}; border-radius: 10px; }
                .custom-scroll::-webkit-scrollbar-thumb { background: ${isDark ? '#4b5563' : '#cbd5e1'}; border-radius: 10px; }
                .custom-scroll::-webkit-scrollbar-thumb:hover { background: ${isDark ? '#6b7280' : '#94a3b8'}; }
            `}</style>
        </Layout>
    );
}
