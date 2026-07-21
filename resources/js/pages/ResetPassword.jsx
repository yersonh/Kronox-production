// resources/js/pages/ResetPassword.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { useTheme } from '../hooks/useTheme';

export default function ResetPassword() {
    const navigate = useNavigate();
    const { isDark } = useTheme();
    const [searchParams] = useSearchParams();
    const [form, setForm] = useState({ password: '', password_confirmation: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [validating, setValidating] = useState(true);

    const token = searchParams.get('token');
    const email = searchParams.get('email');

    useEffect(() => {
        if (!token || !email) {
            setError('Parámetros inválidos. Solicita un nuevo enlace de recuperación.');
            setValidating(false);
        } else {
            setValidating(false);
        }
    }, [token, email]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (form.password !== form.password_confirmation) {
            setError('Las contraseñas no coinciden.');
            setLoading(false);
            return;
        }

        try {
            await api.post('/reset-password', {
                email,
                token,
                password: form.password,
                password_confirmation: form.password_confirmation,
            });

            setTimeout(() => navigate('/login?reset=success'), 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al restablecer la contraseña. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    if (validating) {
        return (
            <div className={`min-h-screen relative flex items-center justify-center p-4 ${
                isDark
                    ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
                    : 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200'
            }`}>
                <div className="absolute inset-0 z-0">
                    <img src="/images/fondo3.png" alt="" className="w-full h-full object-cover opacity-60" />
                </div>
                <div className="relative text-center">
                    <svg className="animate-spin h-12 w-12 text-indigo-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                </div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen relative flex items-center justify-center p-4 transition-colors duration-300 ${
            isDark
                ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
                : 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200'
        }`}>
            <div className="absolute inset-0 z-0">
                <img src="/images/fondo3.png" alt="" className="w-full h-full object-cover opacity-60" />
            </div>

            {isDark && (
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                </div>
            )}

            <div className="relative w-full max-w-md">
                <div className={`
                    rounded-2xl shadow-2xl p-8 transition-all duration-300
                    ${isDark
                        ? 'bg-white/10 backdrop-blur-xl border border-white/20'
                        : 'bg-white border border-gray-200 shadow-lg'
                    }
                `}>
                    <div className="text-center mb-8">
                        <div className={`
                            inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4
                            ${isDark
                                ? 'bg-gradient-to-br from-indigo-500 to-purple-600'
                                : 'bg-gradient-to-br from-indigo-600 to-purple-600'
                            }
                        `}>
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6-4h12a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2zm10-4V6a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            Nueva Contraseña
                        </h1>
                        <p className={`text-sm ${isDark ? 'text-indigo-200' : 'text-gray-500'}`}>
                            Ingresa tu nueva contraseña
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

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-indigo-200' : 'text-gray-700'}`}>
                                Nueva contraseña
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className={`h-5 w-5 ${isDark ? 'text-indigo-300' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6-4h12a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2zm10-4V6a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <input
                                    type="password"
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className={`
                                        w-full rounded-xl pl-10 pr-3 py-3 transition
                                        ${isDark
                                            ? 'bg-white/5 border border-white/10 text-white placeholder-indigo-300/50 focus:ring-2 focus:ring-indigo-500'
                                            : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                                        }
                                    `}
                                    placeholder="••••••••"
                                    minLength={8}
                                    required
                                />
                            </div>
                            <p className={`text-xs mt-1 ${isDark ? 'text-indigo-300' : 'text-gray-500'}`}>
                                Mínimo 8 caracteres
                            </p>
                        </div>

                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-indigo-200' : 'text-gray-700'}`}>
                                Confirmar contraseña
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className={`h-5 w-5 ${isDark ? 'text-indigo-300' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6-4h12a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2v-6a2 2 0 012-2zm10-4V6a4 4 0 00-8 0v4h8z" />
                                    </svg>
                                </div>
                                <input
                                    type="password"
                                    value={form.password_confirmation}
                                    onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
                                    className={`
                                        w-full rounded-xl pl-10 pr-3 py-3 transition
                                        ${isDark
                                            ? 'bg-white/5 border border-white/10 text-white placeholder-indigo-300/50 focus:ring-2 focus:ring-indigo-500'
                                            : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
                                        }
                                    `}
                                    placeholder="••••••••"
                                    minLength={8}
                                    required
                                />
                            </div>
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
                                    Actualizando...
                                </span>
                            ) : 'Actualizar contraseña'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className={`text-sm ${isDark ? 'text-indigo-300' : 'text-gray-600'}`}>
                            ¿Ya tienes acceso?
                            <a href="/login" className={`ml-1 font-medium transition ${isDark ? 'text-indigo-300 hover:text-white' : 'text-indigo-600 hover:text-indigo-700'}`}>
                                Ir al Login
                            </a>
                        </p>
                    </div>

                    <div className="mt-8 text-center">
                        <p className={`text-xs ${isDark ? 'text-indigo-300' : 'text-gray-400'}`}>
                            © 2026 Kronox. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </div>

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
