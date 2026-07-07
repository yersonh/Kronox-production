// resources/js/pages/admin/Funcionarios.jsx
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { useTheme } from '../../hooks/useTheme';
import {
    Plus, Edit, Trash2, User, Mail, Phone,
    Building2, Briefcase, Save, X, AlertCircle,
    Users, CreditCard, MessageCircle, Calendar,
    AlertTriangle, Search, Award, Shield, Eye, EyeOff, KeyRound,
    Upload, Download, FileCheck2, FileX2, FileText, Camera, CheckCircle2, Circle,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

const ROLES_FUNCIONARIO = [
    { value: 'super_admin',          label: 'Super Admin'          },
    { value: 'admin',                label: 'Admin'                },
    { value: 'digitador',            label: 'Digitador'            },
    { value: 'funcionario',          label: 'Funcionario'          },
    { value: 'supervisor_contratos', label: 'Supervisor Contratos' },
];

const validarCedula = (cedula) => {
    if (!cedula) return 'La cédula es requerida';
    if (!/^\d+$/.test(cedula)) return 'La cédula debe contener solo números';
    if (cedula.length < 5 || cedula.length > 10) return 'La cédula debe tener entre 5 y 10 dígitos';
    return '';
};

// Mapea cada campo del formulario a su nombre en la persona del Core, para saber
// individualmente cuáles ya traen dato (se bloquean) y cuáles están vacíos (se completan).
const CAMPO_CORE = { nombre: 'nombres', apellido: 'apellidos', email: 'email', telefono: 'telefono', whatsapp: 'whatsapp' };
const CAMPO_CORE_FUNCIONARIO = { cargo: 'cargo', sector_id: 'sector_id', nivel_cargo_id: 'nivel_cargo_id', fecha_vinculacion: 'fecha_vinculacion' };
const esVacio = (v) => v === null || v === undefined || v === '';
// Predicado genérico: un campo se bloquea solo si "fuente" ya tiene dato ahí, según el mapeo dado.
const campoBloqueadoDe = (fuente, mapeo, campo) => !!fuente && !esVacio(fuente[mapeo[campo]]);

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

const validarTamañoArchivo = (file, tipoArchivo) => {
    const maxSize = tipoArchivo === 'foto' ? 2 * 1024 * 1024 : 10 * 1024 * 1024;
    const maxSizeMB = tipoArchivo === 'foto' ? 2 : 10;
    if (file.size > maxSize) {
        return `El archivo no debe exceder ${maxSizeMB} MB. Tamaño actual: ${(file.size / (1024 * 1024)).toFixed(2)} MB`;
    }
    return '';
};

export default function Funcionarios() {
    const { isDark } = useTheme();
    const [funcionarios, setFuncionarios] = useState([]);
    const [dependencias, setDependencias] = useState([]);
    const [sectores, setSectores] = useState([]);
    const [nivelesCargo, setNivelesCargo] = useState([]);
    const [sectoresFiltrados, setSectoresFiltrados] = useState([]);
    const [searchParams] = useSearchParams();
    const [filtros, setFiltros] = useState({ dependencia_id: '', sector_id: '', search: searchParams.get('search') || '' });
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
    const debouncedSearch = useDebounce(filtros.search);
    const [form, setForm] = useState({
        nombre: '', apellido: '', cedula: '', email: '',
        telefono: '', whatsapp: '', dependencia_id: '', sector_id: '',
        cargo: '', nivel_cargo_id: '', fecha_vinculacion: '',
        rol: '',
    });
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
    const [registroCoreExistente, setRegistroCoreExistente] = useState(null); // { tipo, campos } — funcionario ya existe en el Core, sin vínculo local
    const [avisoVerificacionCaida, setAvisoVerificacionCaida] = useState(false);
    const [avisoPostGuardado, setAvisoPostGuardado] = useState('');
    const revelarResto = editando || ['nueva', 'existente_sin_registro', 'error_503'].includes(verificacionEstado);
    // Un campo se bloquea solo si la fuente (persona o funcionario del Core) ya tiene dato ahí.
    const campoBloqueado = (campo) => campoBloqueadoDe(personaEncontrada, CAMPO_CORE, campo);
    const campoFuncionarioBloqueado = (campo) => campoBloqueadoDe(registroCoreExistente?.campos, CAMPO_CORE_FUNCIONARIO, campo);

    // Foto en formulario
    const [fotoFormFile, setFotoFormFile] = useState(null);
    const [fotoFormPreview, setFotoFormPreview] = useState(null);
    const [errorFotoForm, setErrorFotoForm] = useState('');

    // Minuta en formulario
    const [minutaFormFile, setMinutaFormFile] = useState(null);
    const [errorMinutaForm, setErrorMinutaForm] = useState('');

    // Modal foto (desde tabla)
    const [modalFoto, setModalFoto] = useState({ show: false, id: null, nombre: '' });
    const [fotoModalFile, setFotoModalFile] = useState(null);
    const [fotoModalPreview, setFotoModalPreview] = useState(null);
    const [fotoModalExistente, setFotoModalExistente] = useState(null);
    const [loadingFoto, setLoadingFoto] = useState(false);
    const [errorFoto, setErrorFoto] = useState('');
    const [fotoAmpliada, setFotoAmpliada] = useState(null);

    // Modal minuta (desde tabla)
    const [modalMinuta, setModalMinuta] = useState({ show: false, id: null, nombre: '' });
    const [minutaFile, setMinutaFile] = useState(null);
    const [loadingMinuta, setLoadingMinuta] = useState(false);
    const [errorMinuta, setErrorMinuta] = useState('');

    const [modalConfirm, setModalConfirm] = useState({ show: false, id: null, nombre: '' });
    const [isMobile, setIsMobile] = useState(false);

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
            const res = await api.get('/personas/buscar-por-identificacion', { params: { numero_identificacion: cedula, tipo_registro: 'funcionario' } });
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
                    cargo: campos.cargo || '',
                    sector_id: campos.sector_id || '',
                    nivel_cargo_id: campos.nivel_cargo_id || '',
                    fecha_vinculacion: campos.fecha_vinculacion ? campos.fecha_vinculacion.substring(0, 10) : '',
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
        fetchDependencias();
        fetchSectores();
        fetchNivelesCargo();
        const checkScreenSize = () => setIsMobile(window.innerWidth < 1024);
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    useEffect(() => {
        fetchFuncionarios(1);
    }, [debouncedSearch, filtros.dependencia_id, filtros.sector_id]);

    const fetchFuncionarios = async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', page);
            params.append('per_page', pagination.per_page);
            if (filtros.dependencia_id) params.append('dependencia_id', filtros.dependencia_id);
            if (filtros.sector_id) params.append('sector_id', filtros.sector_id);
            if (debouncedSearch) params.append('search', debouncedSearch);
            const res = await api.get(`/funcionarios?${params.toString()}`);
            setFuncionarios(res.data.data);
            setPagination(prev => ({ ...prev, current_page: res.data.current_page, last_page: res.data.last_page, total: res.data.total }));
        } catch (err) {
            console.error('Error al cargar funcionarios:', err);
        } finally {
            setLoading(false);
        }
    };

    const goToPage = (page) => {
        if (page >= 1 && page <= pagination.last_page) fetchFuncionarios(page);
    };

    const fetchDependencias = async () => {
        try { const res = await api.get('/dependencias'); setDependencias(res.data); }
        catch (err) { console.error(err); }
    };

    const fetchSectores = async () => {
        try { const res = await api.get('/sectores'); setSectores(res.data); }
        catch (err) { console.error(err); }
    };

    const fetchNivelesCargo = async () => {
        try { const res = await api.get('/niveles-cargo'); setNivelesCargo(res.data); }
        catch (err) { console.error(err); }
    };

    const handleDependenciaChange = (dependencia_id) => {
        setForm({ ...form, dependencia_id, sector_id: '' });
        setSectoresFiltrados(sectores.filter(s => s.dependencia_id == dependencia_id));
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
                await api.put(`/funcionarios/${editando}`, form);
            } else {
                const res = await api.post('/funcionarios', form);
                id = res.data.id;
                if (res.data.aviso) setAvisoPostGuardado(res.data.aviso);
            }
            if (fotoFormFile && id) {
                const fd = new FormData();
                fd.append('foto', fotoFormFile);
                await api.post(`/funcionarios/${id}/foto`, fd, { headers: { 'Content-Type': undefined } });
            }
            if (minutaFormFile && id) {
                const fd = new FormData();
                fd.append('minuta_pdf', minutaFormFile);
                await api.post(`/funcionarios/${id}/minuta`, fd, {
                    headers: { 'Content-Type': undefined },
                });
            }
            resetForm();
            fetchFuncionarios();
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

    const handleEditar = (f) => {
        setEditando(f.id);
        setForm({
            nombre: f.persona?.nombres || '',
            apellido: f.persona?.apellidos || '',
            cedula: f.persona?.numero_identificacion || '',
            email: f.persona?.email || '',
            telefono: f.persona?.telefono || '',
            whatsapp: f.persona?.whatsapp || '',
            dependencia_id: f.dependencia_id || '',
            sector_id: f.sector_id || '',
            cargo: f.cargo || '',
            nivel_cargo_id: f.nivel_cargo_id || '',
            fecha_vinculacion: f.fecha_vinculacion ? f.fecha_vinculacion.substring(0, 10) : '',
            rol: '',
        });
        setErroresCampo({});
        setError('');
        setVerificando(false);
        setVerificacionEstado(null);
        setPersonaEncontrada(null);
        setRegistroExistente(null);
        setRegistroCoreExistente(null);
        setAvisoVerificacionCaida(false);
        setAvisoPostGuardado('');
        setSectoresFiltrados(sectores.filter(s => s.dependencia_id == f.dependencia_id));
        
        // Cargar foto existente si la tiene
        if (f.persona?.tiene_foto) {
            setFotoFormPreview(f.persona.foto_url);
            setFotoFormFile(null);
        } else {
            clearFotoForm();
        }
        setMinutaFormFile(null);
        setMostrarForm(true);
    };

    const handleEliminar = async () => {
        setLoading(true);
        try {
            await api.delete(`/funcionarios/${modalConfirm.id}`);
            closeModal();
            fetchFuncionarios();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al desactivar');
        } finally {
            setLoading(false);
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
            await api.post(`/funcionarios/${modalFoto.id}/foto`, fd, { headers: { 'Content-Type': undefined } });
            handleCerrarModalFoto();
            fetchFuncionarios();
        } catch (err) {
            setErrorFoto(err.response?.data?.message || 'Error al subir la foto');
        } finally {
            setLoadingFoto(false);
        }
    };

    // ── Modal minuta (desde acciones) ────────────────────────────────────
    const handleAbrirModalMinuta = (id, nombre) => {
        setMinutaFile(null);
        setErrorMinuta('');
        setModalMinuta({ show: true, id, nombre });
    };

    const handleCerrarModalMinuta = () => {
        setModalMinuta({ show: false, id: null, nombre: '' });
        setMinutaFile(null);
        setErrorMinuta('');
    };

    const handleSubirMinuta = async () => {
        if (!minutaFile) { setErrorMinuta('Selecciona un archivo PDF'); return; }
        setLoadingMinuta(true);
        setErrorMinuta('');
        try {
            const formData = new FormData();
            formData.append('minuta_pdf', minutaFile);
            await api.post(`/funcionarios/${modalMinuta.id}/minuta`, formData, {
                headers: { 'Content-Type': undefined },
            });
            handleCerrarModalMinuta();
            fetchFuncionarios();
        } catch (err) {
            setErrorMinuta(err.response?.data?.message || 'Error al subir la minuta');
        } finally {
            setLoadingMinuta(false);
        }
    };

    const handleDescargarMinuta = async (id) => {
        try {
            const res = await api.get(`/funcionarios/${id}/minuta`, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 15000);
        } catch (err) {
            console.error('Error al descargar minuta:', err);
        }
    };

    const openModal = (id, nombre) => { setError(''); setModalConfirm({ show: true, id, nombre }); };
    const closeModal = () => { setModalConfirm({ show: false, id: null, nombre: '' }); setError(''); };

    const resetForm = () => {
        setMostrarForm(false);
        setEditando(null);
        setForm({
            nombre: '', apellido: '', cedula: '', email: '',
            telefono: '', whatsapp: '', dependencia_id: '', sector_id: '',
            cargo: '', nivel_cargo_id: '', fecha_vinculacion: '',
            rol: '',
        });
        setError('');
        setErroresCampo({});
        setShowPassword(false);
        clearFotoForm();
        setMinutaFormFile(null);
        setVerificando(false);
        setVerificacionEstado(null);
        setPersonaEncontrada(null);
        setRegistroExistente(null);
        setRegistroCoreExistente(null);
        setAvisoVerificacionCaida(false);
    };

    const formatBytes = (bytes) => {
        if (!bytes) return '';
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const inputClass = `w-full rounded-xl px-4 py-2.5 text-sm transition border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
        isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
    }`;
    const labelClass = `block text-sm font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`;

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Users size={24} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Funcionarios</h2>
                        </div>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Gestiona los funcionarios de la organización
                        </p>
                    </div>
                    <button
                        onClick={() => mostrarForm ? resetForm() : setMostrarForm(true)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all transform hover:scale-[1.02] ${
                            mostrarForm
                                ? isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md'
                        }`}
                    >
                        {mostrarForm ? <X size={18} /> : <Plus size={18} />}
                        {mostrarForm ? 'Cancelar' : 'Nuevo Funcionario'}
                    </button>
                </div>

                {/* Filtros */}
                <div className={`rounded-2xl p-4 ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                <Search size={12} /> Buscar
                            </label>
                            <div className="relative">
                                <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                <input type="text" value={filtros.search}
                                    onChange={e => setFiltros({ ...filtros, search: e.target.value })}
                                    placeholder="Buscar por nombre o cédula..."
                                    className={`w-full pl-10 pr-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                />
                                {filtros.search && (
                                    <button onClick={() => setFiltros({ ...filtros, search: '' })}
                                        className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                <Building2 size={12} /> Dependencia
                            </label>
                            <select value={filtros.dependencia_id}
                                onChange={e => setFiltros({ ...filtros, dependencia_id: e.target.value, sector_id: '' })}
                                className={`w-full rounded-xl px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                                <option value="">Todas las dependencias</option>
                                {dependencias.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                <Briefcase size={12} /> Sector
                            </label>
                            <select value={filtros.sector_id}
                                onChange={e => setFiltros({ ...filtros, sector_id: e.target.value })}
                                className={`w-full rounded-xl px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                                <option value="">Todos los sectores</option>
                                {filtros.dependencia_id
                                    ? sectores.filter(s => s.dependencia_id == filtros.dependencia_id).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)
                                    : sectores.map(s => <option key={s.id} value={s.id}>{s.nombre} ({s.dependencia?.nombre})</option>)
                                }
                            </select>
                        </div>
                    </div>
                </div>

                {/* Formulario */}
                {mostrarForm && (
                    <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'}`}>
                        <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <div className="flex items-center gap-2">
                                {editando ? <Edit size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} /> : <Plus size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />}
                                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                    {editando ? 'Editar Funcionario' : 'Nuevo Funcionario'}
                                </h3>
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
                                                    Ya existe una persona registrada con esta cédula: <strong>{personaEncontrada.nombres} {personaEncontrada.apellidos}</strong> ({personaEncontrada.email || 'sin email'}). Se vinculará este funcionario a ese registro; los campos que ya tienen dato quedan bloqueados abajo, y los que estén vacíos puedes completarlos.
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
                                            <input id="foto-form-f" type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFotoFormChange} />
                                            <button type="button" onClick={() => document.getElementById('foto-form-f').click()}
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

                                {/* Datos del cargo */}
                                <div>
                                    <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Cargo y Dependencia</p>
                                    {registroCoreExistente && (
                                        <div className={`mb-4 p-3 rounded-xl flex items-start gap-2 ${isDark ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-300' : 'bg-yellow-50 border border-yellow-200 text-yellow-800'}`}>
                                            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                                            <span className="text-sm">
                                                Esta persona ya tiene un registro de funcionario en el Core (otra aplicación pudo haberlo creado). Los campos que ya tienen dato quedan bloqueados abajo; los vacíos puedes completarlos.
                                            </span>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        <div><label className={labelClass}><Building2 size={14} />Dependencia *</label>
                                            <select value={form.dependencia_id} onChange={e => handleDependenciaChange(e.target.value)} className={inputClass} required>
                                                <option value="">Seleccionar dependencia</option>
                                                {dependencias.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                                            </select>
                                        </div>
                                        <div><label className={labelClass}><Briefcase size={14} />Sector</label>
                                            <select value={form.sector_id} onChange={e => setForm({ ...form, sector_id: e.target.value })} className={inputClass} disabled={!form.dependencia_id || campoFuncionarioBloqueado('sector_id')}>
                                                <option value="">Seleccionar sector</option>
                                                {sectoresFiltrados.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                            </select>
                                        </div>
                                        <div><label className={labelClass}><Briefcase size={14} />Cargo *</label><input type="text" value={form.cargo} onChange={e => setForm({ ...form, cargo: e.target.value })} className={inputClass} placeholder="Cargo" required disabled={campoFuncionarioBloqueado('cargo')} /></div>
                                        <div><label className={labelClass}><Award size={14} />Nivel de Cargo</label>
                                            <select value={form.nivel_cargo_id} onChange={e => setForm({ ...form, nivel_cargo_id: e.target.value })} className={inputClass} disabled={campoFuncionarioBloqueado('nivel_cargo_id')}>
                                                <option value="">Seleccionar nivel</option>
                                                {nivelesCargo.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
                                            </select>
                                        </div>
                                        <div><label className={labelClass}><Calendar size={14} />Fecha de Vinculación</label><input type="date" value={form.fecha_vinculacion} onChange={e => setForm({ ...form, fecha_vinculacion: e.target.value })} className={inputClass} disabled={campoFuncionarioBloqueado('fecha_vinculacion')} /></div>
                                    </div>
                                </div>

                                {/* Minuta de contrato — solo en edición */}
                                {editando && <div>
                                    <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Minuta de Contrato</p>
                                    <div
                                        className={`rounded-xl border-2 border-dashed p-5 text-center transition cursor-pointer ${minutaFormFile
                                            ? isDark ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-emerald-400 bg-emerald-50'
                                            : isDark ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'}`}
                                        onClick={() => document.getElementById('minuta-form-input-f').click()}
                                    >
                                        <input
                                            id="minuta-form-input-f"
                                            type="file"
                                            accept=".pdf"
                                            className="hidden"
                                            onChange={e => {
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
                                            }}
                                        />
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
                                                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                        {editando
                                                            ? 'Haz clic para reemplazar la minuta (opcional)'
                                                            : 'Haz clic para adjuntar la minuta (opcional)'}
                                                    </p>
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
                                </div>}

                                {/* Acceso al sistema — solo en creación */}
                                {!editando && (
                                    <div className={`p-4 rounded-xl border ${isDark ? 'border-indigo-500/30 bg-indigo-500/5' : 'border-indigo-200 bg-indigo-50'}`}>
                                        <p className={`text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-1.5 ${isDark ? 'text-indigo-400' : 'text-indigo-700'}`}>
                                            <Shield size={14} /> Acceso al Sistema
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelClass}><Shield size={14} />Rol *</label>
                                                <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })} className={inputClass} required>
                                                    <option value="">Seleccionar rol</option>
                                                    {ROLES_FUNCIONARIO.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                                </select>
                                                <p className={`mt-1.5 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    Define qué puede hacer en el sistema
                                                </p>
                                            </div>
                                            {!editando && (
                                                <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-900/30 border border-blue-700/40' : 'bg-blue-50 border border-blue-200'}`}>
                                                    <p className={`text-xs font-medium flex items-center gap-1 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                                                        <KeyRound size={12} /> Contraseña automática
                                                    </p>
                                                    <p className={`text-xs mt-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                                        El sistema generará una contraseña temporal segura y la enviará al correo del funcionario junto con sus credenciales de acceso.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={resetForm} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                        <X size={16} />Cancelar
                                    </button>
                                    <button type="submit" disabled={loading} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white transition-all disabled:opacity-50">
                                        {loading
                                            ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /><span>Guardando...</span></>
                                            : <><Save size={16} /><span>{editando ? 'Actualizar' : 'Guardar'}</span></>}
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
                        <div className="flex items-center gap-2">
                            <Users size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Listado de Funcionarios</h3>
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>{pagination.total} registros</span>
                        </div>
                        {!loading && pagination.total > 0 && (
                            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Mostrando {funcionarios.length} de {pagination.total}</span>
                        )}
                    </div>

                    {loading && funcionarios.length === 0 ? (
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
                                                    {['Nombre', 'Cédula', 'Email', 'Dependencia', 'Sector', 'Cargo', 'Minuta', 'WhatsApp', 'Acciones'].map(h => (
                                                        <th key={h} className={`text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                {funcionarios.map(f => (
                                                    <tr key={f.id} className={`transition ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                                                        {/* Nombre con avatar */}
                                                        <td className={`px-4 py-3 font-medium whitespace-nowrap ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                                            <div className="flex items-center gap-2.5">
                                                                <button onClick={() => setFotoAmpliada(f.persona?.foto_url ?? '/images/imagendefault.png')} className="flex-shrink-0 focus:outline-none">
                                                                    <img
                                                                        src={f.persona?.foto_thumbnail_url ?? '/images/imagendefault.png'}
                                                                        alt=""
                                                                        className="w-9 h-9 rounded-full object-cover border border-gray-200 dark:border-gray-600 shadow-sm hover:ring-2 hover:ring-indigo-400 transition"
                                                                        onError={e => { e.target.src = '/images/imagendefault.png'; }}
                                                                    />
                                                                </button>
                                                                <span>{f.persona?.nombres} {f.persona?.apellidos}</span>
                                                            </div>
                                                        </td>
                                                        <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{f.persona?.numero_identificacion}</td>
                                                        <td className={`px-4 py-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}><span className="block max-w-[180px] truncate">{f.persona?.email}</span></td>
                                                        <td className={`px-4 py-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{f.dependencia?.nombre || '-'}</td>
                                                        <td className={`px-4 py-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{f.sector?.nombre || '-'}</td>
                                                        <td className={`px-4 py-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{f.cargo || '-'}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            {f.tiene_minuta ? (
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                                                                    <FileCheck2 size={11} /> Cargada
                                                                </span>
                                                            ) : (
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
                                                                    <FileX2 size={11} /> Sin minuta
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{f.persona?.whatsapp || '-'}</td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div className="flex items-center gap-1">
                                                                <button onClick={() => handleEditar(f)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-indigo-400' : 'hover:bg-gray-100 text-gray-500 hover:text-indigo-600'}`} title="Editar"><Edit size={15} /></button>
                                                                <button onClick={() => handleAbrirModalFoto(f.id, `${f.persona?.nombres} ${f.persona?.apellidos}`, f.persona?.foto_url)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-sky-400' : 'hover:bg-gray-100 text-gray-500 hover:text-sky-600'}`} title="Cambiar foto"><Camera size={15} /></button>
                                                                {f.tiene_minuta ? (
                                                                    <button onClick={() => handleDescargarMinuta(f.id)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-emerald-500 hover:text-emerald-400' : 'hover:bg-gray-100 text-emerald-600 hover:text-emerald-700'}`} title="Ver / Descargar minuta"><Download size={15} /></button>
                                                                ) : (
                                                                    <button onClick={() => handleAbrirModalMinuta(f.id, `${f.persona?.nombres} ${f.persona?.apellidos}`)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-amber-400' : 'hover:bg-gray-100 text-gray-500 hover:text-amber-600'}`} title="Cargar minuta"><Upload size={15} /></button>
                                                                )}
                                                                <button onClick={() => openModal(f.id, `${f.persona?.nombres} ${f.persona?.apellidos}`)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-red-400' : 'hover:bg-gray-100 text-gray-500 hover:text-red-600'}`} title="Desactivar"><Trash2 size={15} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {funcionarios.length === 0 && (
                                                    <tr>
                                                        <td colSpan="9" className={`px-6 py-12 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                            <Users size={48} className={`mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                                                            <p>No hay funcionarios registrados</p>
                                                            <p className="text-xs mt-1">Comienza creando un nuevo funcionario</p>
                                                        </td>
                                                    </tr>
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
                                        {funcionarios.map(f => (
                                            <div key={f.id} className={`p-4 ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                                                <div className="flex items-start justify-between mb-2">
                                                    <div className="flex items-center gap-3">
                                                        <button onClick={() => setFotoAmpliada(f.persona?.foto_url ?? '/images/imagendefault.png')} className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-gray-600">
                                                            <img src={f.persona?.foto_thumbnail_url ?? '/images/imagendefault.png'} alt=""
                                                                className="w-full h-full object-cover"
                                                                onError={e => { e.target.src = '/images/imagendefault.png'; }} />
                                                        </button>
                                                        <div>
                                                            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>{f.persona?.nombres} {f.persona?.apellidos}</h3>
                                                            <p className={`text-xs font-mono mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Cédula: {f.persona?.numero_identificacion}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => handleEditar(f)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-indigo-400' : 'hover:bg-gray-100 text-gray-500 hover:text-indigo-600'}`}><Edit size={16} /></button>
                                                        <button onClick={() => handleAbrirModalFoto(f.id, `${f.persona?.nombres} ${f.persona?.apellidos}`, f.persona?.foto_url)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-sky-400' : 'hover:bg-gray-100 text-gray-500 hover:text-sky-600'}`}><Camera size={16} /></button>
                                                        {f.tiene_minuta ? (
                                                            <button onClick={() => handleDescargarMinuta(f.id)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-emerald-500' : 'hover:bg-gray-100 text-emerald-600'}`} title="Ver minuta"><Download size={16} /></button>
                                                        ) : (
                                                            <button onClick={() => handleAbrirModalMinuta(f.id, `${f.persona?.nombres} ${f.persona?.apellidos}`)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-amber-400' : 'hover:bg-gray-100 text-gray-500 hover:text-amber-600'}`} title="Cargar minuta"><Upload size={16} /></button>
                                                        )}
                                                        <button onClick={() => openModal(f.id, `${f.persona?.nombres} ${f.persona?.apellidos}`)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-red-400' : 'hover:bg-gray-100 text-gray-500 hover:text-red-600'}`}><Trash2 size={16} /></button>
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5 mt-3 ml-1">
                                                    <div className="flex items-center gap-2 text-sm"><Mail size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} /><span className={isDark ? 'text-gray-400' : 'text-gray-600'}>{f.persona?.email}</span></div>
                                                    <div className="flex items-center gap-2 text-sm"><Building2 size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} /><span className={isDark ? 'text-gray-400' : 'text-gray-600'}>{f.dependencia?.nombre || '-'}</span></div>
                                                    {f.sector && <div className="flex items-center gap-2 text-sm"><Briefcase size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} /><span className={isDark ? 'text-gray-400' : 'text-gray-600'}>{f.sector.nombre}</span></div>}
                                                    {f.cargo && <div className="flex items-center gap-2 text-sm"><Award size={14} className={isDark ? 'text-gray-500' : 'text-gray-400'} /><span className={isDark ? 'text-gray-400' : 'text-gray-600'}>{f.cargo}</span></div>}
                                                    <div className="flex items-center gap-2 text-sm">
                                                        {f.tiene_minuta ? (
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                                                                <FileCheck2 size={11} /> Minuta cargada
                                                            </span>
                                                        ) : (
                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${isDark ? 'bg-gray-700 text-gray-500' : 'bg-gray-100 text-gray-400'}`}>
                                                                <FileX2 size={11} /> Sin minuta
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {funcionarios.length === 0 && (
                                            <div className={`p-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                <Users size={48} className={`mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                                                <p>No hay funcionarios registrados</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

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
                                Funcionario: <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>{modalFoto.nombre}</span>
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
                                    <input id="foto-modal-f" type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={handleFotoModalChange} />
                                    <button onClick={() => document.getElementById('foto-modal-f').click()}
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

            {/* Modal subir minuta */}
            {modalMinuta.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleCerrarModalMinuta} />
                    <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                        <div className={`px-6 py-4 border-b flex justify-between items-center ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <div className="flex items-center gap-2">
                                <Upload size={20} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
                                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Cargar Minuta de Contrato</h3>
                            </div>
                            <button onClick={handleCerrarModalMinuta} className={`p-1 rounded-lg ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                Funcionario: <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>{modalMinuta.nombre}</span>
                            </p>

                            {errorMinuta && (
                                <div className={`p-3 rounded-xl flex items-center gap-2 ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                                    <AlertCircle size={16} /><span className="text-sm">{errorMinuta}</span>
                                </div>
                            )}

                            <div className={`rounded-xl border-2 border-dashed p-6 text-center transition cursor-pointer ${minutaFile
                                ? isDark ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-emerald-400 bg-emerald-50'
                                : isDark ? 'border-gray-600 hover:border-gray-500' : 'border-gray-300 hover:border-gray-400'}`}
                                onClick={() => document.getElementById('minuta-input-f').click()}>
                                <input
                                    id="minuta-input-f"
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={e => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        const error = validarTamañoArchivo(file, 'minuta');
                                        if (error) {
                                            setErrorMinuta(error);
                                            e.target.value = '';
                                            return;
                                        }
                                        setErrorMinuta('');
                                        setMinutaFile(file);
                                    }}
                                />
                                {minutaFile ? (
                                    <div>
                                        <FileCheck2 size={32} className={`mx-auto mb-2 ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`} />
                                        <p className={`text-sm font-medium ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>{minutaFile.name}</p>
                                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{formatBytes(minutaFile.size)}</p>
                                    </div>
                                ) : (
                                    <div>
                                        <Upload size={32} className={`mx-auto mb-2 ${isDark ? 'text-gray-600' : 'text-gray-400'}`} />
                                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Haz clic para seleccionar</p>
                                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Solo PDF · Máximo 10 MB</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <button onClick={handleCerrarModalMinuta} className={`px-4 py-2 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Cancelar</button>
                            <button onClick={handleSubirMinuta} disabled={loadingMinuta || !minutaFile}
                                className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white transition disabled:opacity-50">
                                {loadingMinuta ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Subiendo...</> : <><Upload size={16} /> Cargar Minuta</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

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

            {/* Modal de confirmación */}
            {modalConfirm.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
                    <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                        <div className="p-6 text-center">
                            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-red-500/20' : 'bg-red-100'}`}>
                                <AlertTriangle size={24} className={isDark ? 'text-red-400' : 'text-red-600'} />
                            </div>
                            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>Desactivar funcionario</h3>
                            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                ¿Estás seguro de que deseas desactivar a <span className="font-semibold">"{modalConfirm.nombre}"</span>? Su acceso al sistema también será desactivado.
                            </p>
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

            <style jsx>{`
                .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scroll::-webkit-scrollbar-track { background: ${isDark ? '#1f2937' : '#f1f5f9'}; border-radius: 10px; }
                .custom-scroll::-webkit-scrollbar-thumb { background: ${isDark ? '#4b5563' : '#cbd5e1'}; border-radius: 10px; }
                .custom-scroll::-webkit-scrollbar-thumb:hover { background: ${isDark ? '#6b7280' : '#94a3b8'}; }
            `}</style>
        </Layout>
    );
}
