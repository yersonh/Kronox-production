// resources/js/components/Layout.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Calendar, ClipboardList, CheckSquare, User,
    Building2, FolderOpen, Users, Target, LogOut, Menu, X, AlertTriangle,
    UserCog, Layers, MapPin, Landmark, FileText, FileBarChart2, ShieldAlert, PieChart,
    ScrollText, Gauge, Flame
} from 'lucide-react';
import api from '../api/axios';
import storage from '../api/storage';
import { useTheme } from '../hooks/useTheme';

export default function Layout({ children }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(() => JSON.parse(storage.get('user') || '{}'));
    const { isDark } = useTheme();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [avatarError, setAvatarError] = useState(false);
    const [logoError, setLogoError] = useState(false);
    const [entidad, setEntidad] = useState({ nombre: '', eslogan: '' });

    useEffect(() => {
        api.get('/me').then(res => {
            const fresh = res.data;
            setUser(fresh);
            setAvatarError(false);
            if (localStorage.getItem('user')) {
                localStorage.setItem('user', JSON.stringify(fresh));
            } else {
                sessionStorage.setItem('user', JSON.stringify(fresh));
            }
        }).catch(() => { });

        api.get('/entidad-config').then(res => {
            setEntidad({ nombre: res.data.nombre ?? '', eslogan: res.data.eslogan ?? '' });
        }).catch(() => { });
    }, []);

    const handleLogout = async () => {
        setLoading(true);
        try {
            await api.post('/logout');
        } catch (err) {
            console.error('Error al cerrar sesión:', err);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            navigate('/login');
            setLoading(false);
            setShowLogoutModal(false);
        }
    };

    const isActive = (path) => {
        return location.pathname === path
            ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-r-2 border-indigo-600'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200';
    };

    const navItems = [
        { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, roles: ['digitador', 'super_admin', 'contratista', 'funcionario', 'admin'] },
        { path: '/calendario', label: 'Calendario', icon: <Calendar size={18} />, roles: ['digitador'] },
        { path: '/eventos', label: 'Eventos', icon: <ClipboardList size={18} />, roles: ['digitador'] },
        { path: '/tareas', label: 'Tareas', icon: <CheckSquare size={18} />, roles: ['digitador'] },
        { path: '/compromisos', label: 'Compromisos', icon: <ClipboardList size={18} />, roles: ['digitador'] },
        { path: '/perfil', label: 'Mi Perfil', icon: <User size={18} />, roles: ['contratista', 'funcionario'] },
        { path: '/mi-calendario', label: 'Mi Calendario', icon: <Calendar size={18} />, roles: ['contratista', 'funcionario'] },
        { path: '/mis-eventos', label: 'Mis Eventos', icon: <ClipboardList size={18} />, roles: ['contratista', 'funcionario'] },
        { path: '/mis-tareas', label: 'Mis Tareas', icon: <CheckSquare size={18} />, roles: ['contratista', 'funcionario'] },
        { path: '/mapa-eventos', label: 'Mapa de Eventos', icon: <MapPin size={18} />, roles: ['super_admin', 'digitador', 'funcionario', 'contratista'] },
        { path: '/reportes-lider', label: 'Reporte incidencias', icon: <FileText size={18} />, roles: ['contratista', 'funcionario', 'super_admin'] },
        { path: '/auxiliar-informe', label: 'Auxiliar Informe', icon: <FileBarChart2 size={18} />, roles: ['contratista'] },
        { path: '/gestion-contratos', label: 'Gestión Contratos', icon: <ScrollText size={18} />, roles: ['supervisor_contratos'] },
        { path: '/admin/contratistas', label: 'Contratistas', icon: <Users size={18} />, roles: ['supervisor_contratos'] },
    ];

    const parametrizacionItems = [
        { path: '/admin/dependencias', label: 'Dependencias', icon: <Building2 size={18} /> },
        { path: '/admin/sectores', label: 'Sectores', icon: <FolderOpen size={18} /> },
        { path: '/admin/niveles-cargo', label: 'Niveles de Cargo', icon: <Layers size={18} /> },
        { path: '/admin/tipos-evento', label: 'Tipos de Evento', icon: <ClipboardList size={18} /> },
        { path: '/admin/salas', label: 'Salas', icon: <Building2 size={18} /> },
        { path: '/admin/prioridades', label: 'Prioridades', icon: <Target size={18} /> },
        { path: '/admin/entidad', label: 'Datos de la Entidad', icon: <Landmark size={18} /> },
    ];

    const adminItems = [
        { path: '/admin/contratistas', label: 'Contratistas', icon: <Users size={18} /> },
        { path: '/admin/funcionarios', label: 'Funcionarios', icon: <UserCog size={18} /> },
        { path: '/admin/usuarios', label: 'Usuarios', icon: <UserCog size={18} /> },
    ];

    const superAdminItems = [
        { path: '/admin/panorama', label: 'Panorama', icon: <Gauge size={18} /> },
        { path: '/admin/estadisticas', label: 'Estadísticas', icon: <PieChart size={18} /> },
        { path: '/admin/mapa-calor', label: 'Mapa de Calor', icon: <Flame size={18} /> },
        { path: '/admin/auditoria', label: 'Auditoría', icon: <ShieldAlert size={18} /> },
    ];

    const userRole = user.rol;

    const persona = user.persona;
    const dependenciaNombre = persona?.funcionario?.dependencia?.nombre
        ?? persona?.contratista?.dependencia?.nombre
        ?? null;
    const sectorNombre = persona?.funcionario?.sector?.nombre
        ?? persona?.contratista?.sector?.nombre
        ?? null;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
            {/* Mobile menu button */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white"
                aria-label="Abrir menú"
            >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Overlay para móvil */}
            {sidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside className={`
                fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 
                border-r border-gray-200 dark:border-gray-700 flex flex-col shadow-sm
                transform transition-transform duration-300 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                {/* Logo y Perfil */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1 shadow-xl shrink-0 ring-4 ring-white/10 transform hover:scale-105 transition-transform duration-300">
                            <img
                                src="/images/logoEmpresa.png"
                                alt="Logo Empresa"
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div>
                            <h1 className="text-gray-800 dark:text-white font-bold text-lg tracking-wide leading-none">Kronox Agenda</h1>
                            <p className="text-gray-500 dark:text-gray-400 text-xs mt-0.5">Agenda Corporativa</p>
                        </div>
                    </div>

                    {/* Información del usuario */}
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm flex-shrink-0">
                            {user.foto_url && !avatarError ? (
                                <img
                                    src={user.foto_url}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    onError={() => setAvatarError(true)}
                                />
                            ) : (
                                user.name?.charAt(0).toUpperCase() || 'U'
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-gray-800 dark:text-white text-xs font-medium truncate">{user.name || 'Usuario'}</p>
                            <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                                {user.rol?.replace('_', ' ') || 'sin rol'}
                            </span>
                            {dependenciaNombre && (
                                <div className="mt-0.5 space-y-0.5">
                                    <p className="flex items-center gap-1 truncate" title={dependenciaNombre}>
                                        <Building2 size={9} className="text-indigo-400 dark:text-indigo-500 flex-shrink-0" />
                                        <span className="text-[10px] text-indigo-500 dark:text-indigo-400 truncate">{dependenciaNombre}</span>
                                    </p>
                                    {sectorNombre && (
                                        <p className="flex items-center gap-1 truncate" title={sectorNombre}>
                                            <Building2 size={9} className="text-indigo-400 dark:text-indigo-500 flex-shrink-0" />
                                            <span className="text-[10px] text-indigo-500 dark:text-indigo-400 truncate">{sectorNombre}</span>
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Navegación */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navItems.map((item) => {
                        if (item.roles.includes(userRole)) {
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${isActive(item.path)}`}
                                >
                                    {item.icon}
                                    {item.label}
                                </Link>
                            );
                        }
                        return null;
                    })}

                    {/* Sección de Administración (solo admin) */}
                    {userRole === 'admin' && (
                        <>
                            <div className="pt-4 mt-2">
                                <p className="text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wider px-3 mb-2">
                                    Parametrización
                                </p>
                            </div>
                            {parametrizacionItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${isActive(item.path)}`}
                                >
                                    {item.icon}
                                    {item.label}
                                </Link>
                            ))}

                            <div className="pt-4 mt-2">
                                <p className="text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wider px-3 mb-2">
                                    Administración
                                </p>
                            </div>
                            {adminItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${isActive(item.path)}`}
                                >
                                    {item.icon}
                                    {item.label}
                                </Link>
                            ))}
                        </>
                    )}

                    {/* Sección exclusiva Super Admin */}
                    {userRole === 'super_admin' && (
                        <>
                            <div className="pt-4 mt-2">
                                <p className="text-gray-400 dark:text-gray-500 text-xs uppercase tracking-wider px-3 mb-2">
                                    Super Admin
                                </p>
                            </div>
                            {superAdminItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 ${isActive(item.path)}`}
                                >
                                    {item.icon}
                                    {item.label}
                                </Link>
                            ))}
                        </>
                    )}
                </nav>

                {/* Botón cerrar sesión - Rojo distintivo */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="w-full flex items-center gap-3 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 font-medium"
                    >
                        <LogOut size={18} />
                        <span>Cerrar sesión</span>
                    </button>
                </div>
            </aside>

            {/* Modal de confirmación para cerrar sesión */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Overlay */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setShowLogoutModal(false)}
                    />

                    {/* Modal */}
                    <div className={`relative w-full max-w-md rounded-2xl shadow-2xl transition-all transform ${isDark
                        ? 'bg-gray-800 border border-gray-700'
                        : 'bg-white border border-gray-200'
                        }`}>
                        <div className="p-6 text-center">
                            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDark ? 'bg-red-500/20' : 'bg-red-100'
                                }`}>
                                <AlertTriangle size={24} className={isDark ? 'text-red-400' : 'text-red-600'} />
                            </div>
                            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                ¿Cerrar sesión?
                            </h3>
                            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                ¿Estás seguro de que deseas cerrar sesión? Perderás el acceso hasta que vuelvas a iniciar sesión.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowLogoutModal(false)}
                                    className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition ${isDark
                                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleLogout}
                                    disabled={loading}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                            <span>Cerrando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <LogOut size={16} />
                                            <span>Cerrar sesión</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 p-4 lg:p-6 overflow-auto">
                <div className="max-w-7xl mx-auto">
                    {/* Header entidad */}
                    {(entidad.nombre || !logoError) && (
                        <div className={`flex items-center justify-between gap-4 px-5 py-3 rounded-2xl mb-6 border ${
                            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'
                        }`}>
                            <div className="min-w-0">
                                {entidad.nombre && (
                                    <p className={`font-bold text-base leading-tight truncate ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                        {entidad.nombre}
                                    </p>
                                )}
                                {entidad.eslogan && (
                                    <p className={`text-xs mt-0.5 truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {entidad.eslogan}
                                    </p>
                                )}
                            </div>
                            {!logoError && (
                                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-white p-0.5 shadow-xl border border-slate-200/50 overflow-hidden ring-4 ring-white/30 transform hover:scale-105 hover:ring-indigo-500/20 transition-all duration-300">
                                    <img
                                        src="/api/entidad-config/logo"
                                        alt="Logo entidad"
                                        className="w-full h-full object-contain"
                                        onError={() => setLogoError(true)}
                                    />
                                </div>
                            )}
                        </div>
                    )}
                    {children}
                </div>
            </main>
        </div>
    );
}