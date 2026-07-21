// resources/js/pages/VerifyEmailSuccess.jsx
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';

export default function VerifyEmailSuccess() {
    const navigate = useNavigate();
    const { isDark } = useTheme();

    useEffect(() => {
        const timer = setTimeout(() => {
            navigate('/login');
        }, 3000);

        return () => clearTimeout(timer);
    }, [navigate]);

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
                    <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-green-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
                </div>
            )}

            <div className="relative w-full max-w-md">
                <div className={`
                    rounded-2xl shadow-2xl p-8 text-center transition-all duration-300
                    ${isDark
                        ? 'bg-white/10 backdrop-blur-xl border border-white/20'
                        : 'bg-white border border-gray-200 shadow-lg'
                    }
                `}>
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-500/20 mb-6">
                        <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>

                    <h1 className={`text-3xl font-bold mb-2 ${isDark ? 'text-emerald-200' : 'text-emerald-700'}`}>
                        ¡Verificación Exitosa!
                    </h1>

                    <p className={`text-lg mb-6 ${isDark ? 'text-indigo-200' : 'text-gray-600'}`}>
                        ✅ Tu correo ha sido verificado correctamente
                    </p>

                    <p className={`text-sm mb-8 ${isDark ? 'text-indigo-300' : 'text-gray-500'}`}>
                        Ahora puedes acceder a todas las funcionalidades del sistema.
                    </p>

                    <div className="relative h-1 bg-gradient-to-r from-emerald-500 to-green-500 rounded-full mb-6 overflow-hidden">
                        <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-600 to-green-600 animate-pulse" style={{ width: '100%' }}></div>
                    </div>

                    <p className={`text-xs ${isDark ? 'text-indigo-300/60' : 'text-gray-400'}`}>
                        Redirigiendo al login en 3 segundos...
                    </p>

                    <div className="mt-8">
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-medium py-3 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg"
                        >
                            Ir al Login Ahora
                        </button>
                    </div>

                    <div className="mt-8 text-center">
                        <p className={`text-xs ${isDark ? 'text-indigo-300/50' : 'text-gray-400'}`}>
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
