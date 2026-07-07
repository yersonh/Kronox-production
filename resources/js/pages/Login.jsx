// resources/js/pages/Login.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { useTheme } from '../hooks/useTheme';

import NexGovIAInfoModal from '../components/NexGovIAInfoModal';

export default function Login() {
    const navigate = useNavigate();
    const { isDark } = useTheme();
    const [searchParams, setSearchParams] = useSearchParams();
    const [form, setForm] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [isModalNexGovOpen, setIsModalNexGovOpen] = useState(false);
    const [logoError, setLogoError] = useState(false);

    useEffect(() => {
        const verified = searchParams.get('verified');
        const reset = searchParams.get('reset');
        if (verified === 'success') {
            setSuccess('¡Correo verificado exitosamente! Ya puedes iniciar sesión.');
            setSearchParams({});
        } else if (verified === 'invalid') {
            setError('El enlace de verificación es inválido o ha expirado.');
            setSearchParams({});
        } else if (verified === 'already') {
            setSuccess('Tu correo ya estaba verificado.');
            setSearchParams({});
        } else if (reset === 'success') {
            setSuccess('¡Contraseña actualizada exitosamente! Inicia sesión con tu nueva contraseña.');
            setSearchParams({});
        }
    }, [searchParams, setSearchParams]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await api.post('/login', form);
            const storage = rememberMe ? localStorage : sessionStorage;
            storage.setItem('token', res.data.token);
            storage.setItem('user', JSON.stringify(res.data.user));
            if (res.data.user.must_change_password) {
                navigate('/cambiar-contrasena');
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            const msg = err.response?.data?.message;
            if (err.response?.status === 403 && msg) {
                setError(msg);
            } else {
                setError('Credenciales incorrectas. Intenta de nuevo.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen relative flex items-center justify-center p-4 transition-colors duration-300 ${isDark
            ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
            : 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200'
            }`}>

            {/* Background Image Layer */}
            <div className="absolute inset-0 z-0">
                <img
                    src="/images/fondo3.png"
                    alt="Background"
                    className="w-full h-full object-cover transition-opacity duration-1000 opacity-60"
                />

            </div>

            <div className="relative w-full max-w-md">
                {/* Card */}
                <div className={`
                    rounded-2xl shadow-2xl p-8 transition-all duration-300
                    ${isDark
                        ? 'bg-white/10 backdrop-blur-xl border border-white/20'
                        : 'bg-white border border-gray-200 shadow-lg'
                    }
                `}>
                    {/* Logo and Title */}
                    <div className="text-center mb-8">
                        {!logoError ? (
                            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full shadow-2xl mb-4 bg-white p-1 border border-slate-200/50 overflow-hidden ring-4 ring-white/30 transform hover:scale-105 hover:ring-indigo-500/20 transition-all duration-300">
                                <img
                                    src="/api/entidad-config/logo"
                                    alt="Logo Entidad"
                                    className="w-full h-full object-contain"
                                    onError={() => setLogoError(true)}
                                />
                            </div>
                        ) : (
                            <div className={`
                                inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4
                                ${isDark
                                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
                                    : 'bg-gradient-to-br from-indigo-600 to-purple-600'
                                }
                            `}>
                                <svg width="50" height="50" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <rect width="28" height="28" rx="8" fill="white" fillOpacity="0.2" />
                                    <rect x="6" y="8" width="16" height="14" rx="2" fill="white" fillOpacity="0.2" />
                                    <rect x="6" y="8" width="16" height="14" rx="2" stroke="white" strokeWidth="1.5" />
                                    <line x1="6" y1="12" x2="22" y2="12" stroke="white" strokeWidth="1.5" />
                                    <line x1="10" y1="6" x2="10" y2="10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                                    <line x1="18" y1="6" x2="18" y2="10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                                    <rect x="9" y="15" width="3" height="3" rx="0.5" fill="white" />
                                    <rect x="13" y="15" width="3" height="3" rx="0.5" fill="white" fillOpacity="0.7" />
                                    <rect x="17" y="15" width="3" height="3" rx="0.5" fill="white" fillOpacity="0.5" />
                                </svg>
                            </div>
                        )}
                        <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            Kronox Agenda
                        </h1>
                        <p className={`text-sm ${isDark ? 'text-indigo-200' : 'text-gray-500'}`}>
                            Sistema inteligente de agenda
                        </p>
                    </div>

                    {error && (
                        <div className={`
                            px-4 py-3 rounded-xl mb-6 text-sm flex items-center
                            ${isDark
                                ? 'bg-red-500/10 border border-red-500/20 text-red-200'
                                : 'bg-red-50 border border-red-200 text-red-700'
                            }
                        `}>
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className={`
                            px-4 py-3 rounded-xl mb-6 text-sm flex items-center
                            ${isDark
                                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-200'
                                : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                            }
                        `}>
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-indigo-200' : 'text-gray-700'}`}>
                                Correo electrónico
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className={`h-5 w-5 ${isDark ? 'text-indigo-300' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                    </svg>
                                </div>
                                <input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className={`
                                        w-full rounded-xl pl-10 pr-3 py-3 transition
                                        ${isDark
                                            ? 'bg-white/5 border border-white/10 text-white placeholder-indigo-300/50 focus:ring-2 focus:ring-indigo-500'
                                            : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                                        }
                                    `}
                                    placeholder="correo@empresa.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-indigo-200' : 'text-gray-700'}`}>
                                Contraseña
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className={`h-5 w-5 ${isDark ? 'text-indigo-300' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6-4h12a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2zm10-4V6a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className={`
                                        w-full rounded-xl pl-10 pr-12 py-3 transition
                                        ${isDark
                                            ? 'bg-white/5 border border-white/10 text-white placeholder-indigo-300/50 focus:ring-2 focus:ring-indigo-500'
                                            : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                                        }
                                    `}
                                    placeholder="••••••••"
                                    required
                                />
                                {/* Botón del ojo */}
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                    {showPassword ? (
                                        // Ojo abierto (visible)
                                        <svg className={`h-5 w-5 ${isDark ? 'text-indigo-300 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    ) : (
                                        // Ojo cerrado (oculto)
                                        <svg className={`h-5 w-5 ${isDark ? 'text-indigo-300 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className={`
                                        w-4 h-4 rounded focus:ring-indigo-500
                                        ${isDark
                                            ? 'bg-white/5 border-white/10'
                                            : 'bg-white border-gray-300'
                                        }
                                    `}
                                />
                                <span className={`ml-2 text-sm ${isDark ? 'text-indigo-200' : 'text-gray-600'}`}>
                                    Recordarme
                                </span>
                            </label>
                            <a href="/forgot-password" className={`text-sm transition ${isDark ? 'text-indigo-300 hover:text-white' : 'text-indigo-600 hover:text-indigo-700'}`}>
                                ¿Olvidaste tu contraseña?
                            </a>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium py-3 rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Ingresando...
                                </span>
                            ) : 'Ingresar al sistema'}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 text-center">
                        <p className={`text-xs ${isDark ? 'text-indigo-300' : 'text-gray-400'}`}>
                            © 2026 Kronox. Todos los derechos reservados. Desarrollado por{' '}
                            <button
                                onClick={() => setIsModalNexGovOpen(true)}
                                className={`font-bold hover:underline transition-colors ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
                            >
                                NexGovIA
                            </button>
                        </p>
                    </div>
                </div>
            </div>

            <NexGovIAInfoModal
                isOpen={isModalNexGovOpen}
                onClose={() => setIsModalNexGovOpen(false)}
            />


            <style jsx="true">{`
                @keyframes blob {
                    0% { transform: translate(0px, 0px) scale(1); }
                    33% { transform: translate(30px, -50px) scale(1.1); }
                    66% { transform: translate(-20px, 20px) scale(0.9); }
                    100% { transform: translate(0px, 0px) scale(1); }
                }
                .animate-blob {
                    animation: blob 7s infinite;
                }
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
            `}</style>
        </div>
    );
}