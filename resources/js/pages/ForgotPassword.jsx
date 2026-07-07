// resources/js/pages/ForgotPassword.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useTheme } from '../hooks/useTheme';

export default function ForgotPassword() {
    const navigate = useNavigate();
    const { isDark } = useTheme();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            await api.post('/forgot-password', { email });
            setSuccess('Se ha enviado un enlace de restablecimiento a tu correo electrónico.');
            setEmail('');
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al procesar tu solicitud. Intenta de nuevo.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
            isDark
                ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
                : 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200'
        }`}>
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
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                            </svg>
                        </div>
                        <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            Recuperar Contraseña
                        </h1>
                        <p className={`text-sm ${isDark ? 'text-indigo-200' : 'text-gray-500'}`}>
                            Ingresa tu correo electrónico para recibir un enlace
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
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
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
                                    Enviando...
                                </span>
                            ) : 'Enviar enlace'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className={`text-sm ${isDark ? 'text-indigo-300' : 'text-gray-600'}`}>
                            ¿Recordaste tu contraseña?
                            <a href="/login" className={`ml-1 font-medium transition ${isDark ? 'text-indigo-300 hover:text-white' : 'text-indigo-600 hover:text-indigo-700'}`}>
                                Volver al Login
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
