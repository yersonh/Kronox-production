// resources/js/pages/admin/Usuarios.jsx
import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { useTheme } from '../../hooks/useTheme';
import {
    Edit, Trash2, Save, X,
    AlertCircle, AlertTriangle, Shield, Users,
    Search, ChevronDown, ChevronLeft, ChevronRight, CircleCheck, CircleX,
    KeyRound, Eye, EyeOff
} from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

const ROLES = [
    { value: 'super_admin',          label: 'Super Admin',          color: 'purple' },
    { value: 'admin',                label: 'Admin',                color: 'indigo' },
    { value: 'digitador',            label: 'Digitador',            color: 'blue'   },
    { value: 'funcionario',          label: 'Funcionario',          color: 'green'  },
    { value: 'contratista',          label: 'Contratista',          color: 'orange' },
    { value: 'supervisor_contratos', label: 'Supervisor Contratos', color: 'teal'   },
];

const ROL_BADGE = {
    super_admin:          'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
    admin:                'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300',
    digitador:            'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
    funcionario:          'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
    contratista:          'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
    supervisor_contratos: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
};

const esSuperAdmin = (usuario) => usuario?.rol === 'super_admin';

export default function Usuarios() {
    const { isDark } = useTheme();
    const [usuarios, setUsuarios] = useState([]);
    const [filtroSearch, setFiltroSearch] = useState('');
    const [filtroRol, setFiltroRol] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, per_page: 20, total: 0 });
    const debouncedSearch = useDebounce(filtroSearch);
    const [form, setForm] = useState({ rol: '' });
    const [editando, setEditando] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mostrarForm, setMostrarForm] = useState(false);
    const [modalConfirm, setModalConfirm] = useState({ show: false, id: null, nombre: '', accion: 'desactivar' });
    const [modalPassword, setModalPassword] = useState({ show: false, id: null, nombre: '' });
    const [passwordForm, setPasswordForm] = useState({ password: '', password_confirmation: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const inputClass = `w-full rounded-xl px-4 py-2.5 text-sm transition border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`;
    const labelClass = `block text-sm font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`;

    useEffect(() => {
        const checkScreenSize = () => setIsMobile(window.innerWidth < 1024);
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    useEffect(() => {
        fetchUsuarios(1);
    }, [debouncedSearch, filtroRol, filtroEstado]);

    const fetchUsuarios = async (page = 1) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', page);
            params.append('per_page', pagination.per_page);
            if (debouncedSearch) params.append('search', debouncedSearch);
            if (filtroRol) params.append('rol', filtroRol);
            if (filtroEstado) params.append('estado', filtroEstado);
            const res = await api.get(`/usuarios?${params.toString()}`);
            setUsuarios(res.data.data);
            setPagination(prev => ({ ...prev, current_page: res.data.current_page, last_page: res.data.last_page, total: res.data.total }));
        } catch (err) {
            console.error('Error al cargar usuarios:', err);
        } finally {
            setLoading(false);
        }
    };

    const goToPage = (page) => {
        if (page >= 1 && page <= pagination.last_page) fetchUsuarios(page);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.put(`/usuarios/${editando}`, { rol: form.rol });
            resetForm();
            fetchUsuarios();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    const handleEditar = (u) => {
        setEditando(u.id);
        setForm({ rol: u.rol });
        setMostrarForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleEliminar = async () => {
        const { id, accion } = modalConfirm;
        setLoading(true);
        try {
            if (accion === 'desactivar') {
                await api.delete(`/usuarios/${id}`);
            } else if (accion === 'reactivar') {
                await api.post(`/usuarios/${id}/reactivar`);
            }
            closeModal();
            fetchUsuarios();
        } catch (err) {
            setError(err.response?.data?.message || `Error al ${accion === 'desactivar' ? 'desactivar' : 'reactivar'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await api.post(`/usuarios/${modalPassword.id}/reset-password`, passwordForm);
            closeModalPassword();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al resetear contraseña');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (id, nombre, accion = 'desactivar') => {
        const usuario = usuarios.find(u => u.id === id);
        if (esSuperAdmin(usuario)) return;
        setError('');
        setModalConfirm({ show: true, id, nombre, accion });
    };

    const closeModal = () => {
        setModalConfirm({ show: false, id: null, nombre: '', accion: 'desactivar' });
        setError('');
    };

    const openModalPassword = (id, nombre) => {
        setError('');
        setPasswordForm({ password: '', password_confirmation: '' });
        setShowPassword(false);
        setShowPasswordConfirm(false);
        setModalPassword({ show: true, id, nombre });
    };

    const closeModalPassword = () => {
        setModalPassword({ show: false, id: null, nombre: '' });
        setPasswordForm({ password: '', password_confirmation: '' });
        setError('');
    };

    const resetForm = () => {
        setMostrarForm(false);
        setEditando(null);
        setForm({ rol: '' });
        setError('');
    };

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Shield size={24} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                            <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>Usuarios</h2>
                        </div>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Gestiona los usuarios y sus roles de acceso
                        </p>
                    </div>
                    {mostrarForm && (
                        <button onClick={resetForm}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                            <X size={18} /> Cancelar
                        </button>
                    )}
                </div>

                {/* Filtros */}
                <div className={`rounded-2xl p-4 ${isDark ? 'bg-gray-800/50 border border-gray-700' : 'bg-white border border-gray-200 shadow-sm'}`}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                <Search size={12} />Buscar
                            </label>
                            <div className="relative">
                                <Search size={16} className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                                <input
                                    type="text"
                                    value={filtroSearch}
                                    onChange={e => setFiltroSearch(e.target.value)}
                                    placeholder="Buscar por nombre o email..."
                                    className={`w-full pl-10 pr-3 py-2 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                        isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                                    }`}
                                />
                                {filtroSearch && (
                                    <button onClick={() => setFiltroSearch('')} className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                <ChevronDown size={12} />Rol
                            </label>
                            <select
                                value={filtroRol}
                                onChange={e => setFiltroRol(e.target.value)}
                                className={`w-full rounded-xl px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                    isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                                }`}
                            >
                                <option value="">Todos los roles</option>
                                <option value="super_admin">Super Admin</option>
                                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                <CircleCheck size={12} />Estado
                            </label>
                            <select
                                value={filtroEstado}
                                onChange={e => setFiltroEstado(e.target.value)}
                                className={`w-full rounded-xl px-3 py-2 text-sm border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                    isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
                                }`}
                            >
                                <option value="">Todos</option>
                                <option value="activo">Activos</option>
                                <option value="inactivo">Inactivos</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Formulario editar rol */}
                {mostrarForm && editando && (
                    <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'}`}>
                        <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <div className="flex items-center gap-2">
                                <Edit size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Cambiar Rol de Usuario</h3>
                            </div>
                        </div>
                        <div className="p-6">
                            {error && (
                                <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                                    <AlertCircle size={16} /><span className="text-sm">{error}</span>
                                </div>
                            )}
                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className={labelClass}><Shield size={14} />Nuevo Rol *</label>
                                    <select value={form.rol} onChange={e => setForm({ ...form, rol: e.target.value })} className={inputClass} required>
                                        <option value="">Seleccionar rol</option>
                                        {ROLES.filter(r => r.value !== 'super_admin').map(r => (
                                            <option key={r.value} value={r.value}>{r.label}</option>
                                        ))}
                                    </select>
                                    <p className={`mt-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                        Los usuarios se crean desde las vistas de Funcionarios o Contratistas.
                                    </p>
                                </div>
                                <div className="flex justify-end gap-3 pt-2">
                                    <button type="button" onClick={resetForm} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                                        <X size={16} />Cancelar
                                    </button>
                                    <button type="submit" disabled={loading} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white transition-all disabled:opacity-50">
                                        {loading
                                            ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /><span>Guardando...</span></>
                                            : <><Save size={16} /><span>Actualizar Rol</span></>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Listado */}
                <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'}`}>
                    <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                        <div className="flex items-center gap-2">
                            <Users size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Listado de Usuarios</h3>
                            <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>{pagination.total} registros</span>
                        </div>
                        {!loading && pagination.total > 0 && (
                            <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Mostrando {usuarios.length} de {pagination.total}</span>
                        )}
                    </div>

                    {loading && usuarios.length === 0 ? (
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
                                                    {['Nombre', 'Email', 'Rol', 'Estado', 'Acciones'].map(h => (
                                                        <th key={h} className={`text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                {usuarios.map(u => {
                                                    const isSuper = esSuperAdmin(u);
                                                    return (
                                                        <tr key={u.id} className={`transition ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                                                            <td className={`px-6 py-3 font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                                                <div className="flex items-center gap-2.5">
                                                                    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-indigo-100 dark:bg-indigo-500/20">
                                                                        <img
                                                                            src={u.foto_thumbnail_url}
                                                                            alt=""
                                                                            className="w-full h-full object-cover"
                                                                            onError={e => { e.target.src = '/images/imagendefault.png'; }}
                                                                        />
                                                                    </div>
                                                                    {u.name}
                                                                </div>
                                                            </td>
                                                            <td className={`px-6 py-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{u.email}</td>
                                                            <td className="px-6 py-3">
                                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ROL_BADGE[u.rol] || ''}`}>
                                                                    {u.rol === 'super_admin' ? 'Super Admin' : (ROLES.find(r => r.value === u.rol)?.label || u.rol)}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-3">
                                                                {u.activo ? (
                                                                    <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                                                                        <CircleCheck size={14} /><span className="text-xs">Activo</span>
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                                                                        <CircleX size={14} /><span className="text-xs">Inactivo</span>
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-3">
                                                                {isSuper ? (
                                                                    <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Sin acciones</span>
                                                                ) : (
                                                                    <div className="flex items-center gap-1">
                                                                        <button onClick={() => handleEditar(u)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-indigo-400' : 'hover:bg-gray-100 text-gray-500 hover:text-indigo-600'}`} title="Editar rol">
                                                                            <Edit size={16} />
                                                                        </button>
                                                                        <button onClick={() => openModalPassword(u.id, u.name)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-amber-400' : 'hover:bg-gray-100 text-gray-500 hover:text-amber-600'}`} title="Resetear contraseña">
                                                                            <KeyRound size={16} />
                                                                        </button>
                                                                        {u.activo ? (
                                                                            <button onClick={() => openModal(u.id, u.name, 'desactivar')} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-red-400' : 'hover:bg-gray-100 text-gray-500 hover:text-red-600'}`} title="Desactivar">
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                        ) : (
                                                                            <button onClick={() => openModal(u.id, u.name, 'reactivar')} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-green-400' : 'hover:bg-gray-100 text-gray-500 hover:text-green-600'}`} title="Reactivar">
                                                                                <CircleCheck size={16} />
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {usuarios.length === 0 && (
                                                    <tr>
                                                        <td colSpan="5" className={`px-6 py-12 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                            <Users size={48} className={`mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                                                            <p>No hay usuarios registrados</p>
                                                            <p className="text-xs mt-1">Comienza creando un nuevo usuario</p>
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
                                        {usuarios.map(u => {
                                            const isSuper = esSuperAdmin(u);
                                            return (
                                                <div key={u.id} className={`p-4 ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-indigo-100 dark:bg-indigo-500/20">
                                                                <img
                                                                    src={u.foto_thumbnail_url}
                                                                    alt=""
                                                                    className="w-full h-full object-cover"
                                                                    onError={e => { e.target.src = '/images/imagendefault.png'; }}
                                                                />
                                                            </div>
                                                            <div>
                                                                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>{u.name}</h3>
                                                                <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{u.email}</p>
                                                            </div>
                                                        </div>
                                                        {!isSuper && (
                                                            <div className="flex gap-1">
                                                                <button onClick={() => handleEditar(u)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-indigo-400' : 'hover:bg-gray-100 text-gray-500 hover:text-indigo-600'}`}>
                                                                    <Edit size={16} />
                                                                </button>
                                                                <button onClick={() => openModalPassword(u.id, u.name)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-amber-400' : 'hover:bg-gray-100 text-gray-500 hover:text-amber-600'}`}>
                                                                    <KeyRound size={16} />
                                                                </button>
                                                                {u.activo ? (
                                                                    <button onClick={() => openModal(u.id, u.name, 'desactivar')} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-red-400' : 'hover:bg-gray-100 text-gray-500 hover:text-red-600'}`}>
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                ) : (
                                                                    <button onClick={() => openModal(u.id, u.name, 'reactivar')} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-green-400' : 'hover:bg-gray-100 text-gray-500 hover:text-green-600'}`}>
                                                                        <CircleCheck size={16} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${ROL_BADGE[u.rol] || ''}`}>
                                                            {u.rol === 'super_admin' ? 'Super Admin' : (ROLES.find(r => r.value === u.rol)?.label || u.rol)}
                                                        </span>
                                                        {u.activo ? (
                                                            <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                                                                <CircleCheck size={12} /> Activo
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                                                                <CircleX size={12} /> Inactivo
                                                            </span>
                                                        )}
                                                        {isSuper && <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>· Protegido</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {usuarios.length === 0 && (
                                            <div className={`p-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                <Users size={48} className={`mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                                                <p>No hay usuarios registrados</p>
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

            {/* Modal desactivar/reactivar */}
            {modalConfirm.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
                    <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                        <div className="p-6 text-center">
                            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${modalConfirm.accion === 'desactivar' ? (isDark ? 'bg-red-500/20' : 'bg-red-100') : (isDark ? 'bg-green-500/20' : 'bg-green-100')}`}>
                                {modalConfirm.accion === 'desactivar'
                                    ? <AlertTriangle size={24} className={isDark ? 'text-red-400' : 'text-red-600'} />
                                    : <CircleCheck size={24} className={isDark ? 'text-green-400' : 'text-green-600'} />}
                            </div>
                            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                {modalConfirm.accion === 'desactivar' ? 'Desactivar usuario' : 'Reactivar usuario'}
                            </h3>
                            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                ¿Estás seguro de que deseas {modalConfirm.accion === 'desactivar' ? 'desactivar' : 'reactivar'} al usuario <span className="font-semibold">"{modalConfirm.nombre}"</span>?
                            </p>
                            {error && <div className={`mb-4 p-2 rounded-lg text-sm ${isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-50 text-red-600'}`}>{error}</div>}
                            <div className="flex gap-3">
                                <button onClick={closeModal} className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Cancelar</button>
                                <button onClick={handleEliminar} disabled={loading} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition disabled:opacity-50 ${modalConfirm.accion === 'desactivar' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                                    {loading
                                        ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Procesando...</>
                                        : <>{modalConfirm.accion === 'desactivar' ? <Trash2 size={16} /> : <CircleCheck size={16} />} {modalConfirm.accion === 'desactivar' ? 'Desactivar' : 'Reactivar'}</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal resetear contraseña */}
            {modalPassword.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModalPassword} />
                    <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                        <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <div className="flex items-center gap-2">
                                <KeyRound size={18} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
                                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>Resetear Contraseña</h3>
                            </div>
                        </div>
                        <div className="p-6">
                            <p className={`text-sm mb-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                Nueva contraseña para <span className="font-semibold">{modalPassword.nombre}</span>
                            </p>
                            {error && (
                                <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                                    <AlertCircle size={16} /><span className="text-sm">{error}</span>
                                </div>
                            )}
                            <form onSubmit={handleResetPassword} className="space-y-4">
                                <div>
                                    <label className={labelClass}><KeyRound size={14} />Nueva contraseña *</label>
                                    <div className="relative">
                                        <input type={showPassword ? 'text' : 'password'} value={passwordForm.password}
                                            onChange={e => setPasswordForm({ ...passwordForm, password: e.target.value })}
                                            className={inputClass} placeholder="Mínimo 8 caracteres" required />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)}
                                            className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className={labelClass}><KeyRound size={14} />Confirmar contraseña *</label>
                                    <div className="relative">
                                        <input type={showPasswordConfirm ? 'text' : 'password'} value={passwordForm.password_confirmation}
                                            onChange={e => setPasswordForm({ ...passwordForm, password_confirmation: e.target.value })}
                                            className={inputClass} placeholder="Repite la contraseña" required />
                                        <button type="button" onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                                            className={`absolute right-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}>
                                            {showPasswordConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={closeModalPassword} className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Cancelar</button>
                                    <button type="submit" disabled={loading} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white transition disabled:opacity-50">
                                        {loading
                                            ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Guardando...</>
                                            : <><KeyRound size={16} /> Resetear</>}
                                    </button>
                                </div>
                            </form>
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