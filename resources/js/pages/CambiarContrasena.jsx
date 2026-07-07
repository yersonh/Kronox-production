import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, CheckCircle2, Circle, ShieldCheck } from 'lucide-react';
import api from '../api/axios';
import storage from '../api/storage';
import { useTheme } from '../hooks/useTheme';

export default function CambiarContrasena() {
    const navigate = useNavigate();
    const { isDark } = useTheme();
    const [form, setForm] = useState({ password: '', password_confirmation: '' });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const requisitos = [
        { cumple: form.password.length >= 8, texto: 'Mín. 8 caracteres' },
        { cumple: /[A-Z]/.test(form.password), texto: '1 mayúscula' },
        { cumple: /[a-z]/.test(form.password), texto: '1 minúscula' },
        { cumple: /[0-9]/.test(form.password), texto: '1 número' },
        { cumple: /[!@#$%^&*()_\-,.?":{}|<>]/.test(form.password), texto: '1 carácter especial' },
    ];

    const todoCumple = requisitos.every(r => r.cumple);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!todoCumple) {
            setError('La contraseña no cumple todos los requisitos.');
            return;
        }
        if (form.password !== form.password_confirmation) {
            setError('Las contraseñas no coinciden.');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/cambiar-contrasena-inicial', form);
            const updatedUser = res.data.user;
            // Actualizar usuario en storage
            const token = storage.get('token');
            const storageType = localStorage.getItem('token') ? localStorage : sessionStorage;
            storageType.setItem('user', JSON.stringify(updatedUser));
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Error al actualizar la contraseña.');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = `w-full rounded-xl pr-12 pl-3 py-3 transition text-sm ${isDark
        ? 'bg-white/5 border border-white/10 text-white placeholder-indigo-300/50 focus:ring-2 focus:ring-indigo-500 focus:outline-none'
        : 'bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:outline-none'
    }`;

    return (
        <div className={`min-h-screen relative flex items-center justify-center p-4 transition-colors duration-300 ${isDark
            ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900'
            : 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200'
        }`}>
            <div className="absolute inset-0 z-0">
                <img src="/images/fondo3.png" alt="" className="w-full h-full object-cover opacity-60" />
            </div>

            <div className="relative w-full max-w-md z-10">
                <div className={`rounded-2xl shadow-2xl p-8 transition-all duration-300 ${isDark
                    ? 'bg-white/10 backdrop-blur-xl border border-white/20'
                    : 'bg-white border border-gray-200 shadow-lg'
                }`}>
                    {/* Encabezado */}
                    <div className="text-center mb-8">
                        <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl shadow-lg mb-4 ${isDark
                            ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                            : 'bg-gradient-to-br from-amber-500 to-orange-500'
                        }`}>
                            <ShieldCheck size={32} className="text-white" />
                        </div>
                        <h1 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            Cambio de contraseña requerido
                        </h1>
                        <p className={`text-sm ${isDark ? 'text-indigo-200' : 'text-gray-500'}`}>
                            Por seguridad, debe establecer una contraseña personal antes de continuar.
                        </p>
                    </div>

                    {error && (
                        <div className={`px-4 py-3 rounded-xl mb-5 text-sm flex items-center gap-2 ${isDark
                            ? 'bg-red-500/10 border border-red-500/20 text-red-200'
                            : 'bg-red-50 border border-red-200 text-red-700'
                        }`}>
                            <KeyRound size={16} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Nueva contraseña */}
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-indigo-200' : 'text-gray-700'}`}>
                                Nueva contraseña
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    className={inputClass}
                                    placeholder="Mínimo 8 caracteres"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                    {showPassword
                                        ? <EyeOff className={`h-5 w-5 ${isDark ? 'text-indigo-300' : 'text-gray-400'}`} />
                                        : <Eye className={`h-5 w-5 ${isDark ? 'text-indigo-300' : 'text-gray-400'}`} />
                                    }
                                </button>
                            </div>

                            {/* Requisitos */}
                            {form.password && (
                                <div className="mt-2 grid grid-cols-2 gap-1">
                                    {requisitos.map((req, i) => (
                                        <div key={i} className="flex items-center gap-1">
                                            {req.cumple
                                                ? <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
                                                : <Circle size={10} className={`shrink-0 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                                            }
                                            <span className={`text-xs ${req.cumple
                                                ? (isDark ? 'text-emerald-400' : 'text-emerald-600')
                                                : (isDark ? 'text-gray-500' : 'text-gray-400')
                                            }`}>
                                                {req.texto}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Confirmar contraseña */}
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-indigo-200' : 'text-gray-700'}`}>
                                Confirmar contraseña
                            </label>
                            <div className="relative">
                                <input
                                    type={showConfirm ? 'text' : 'password'}
                                    value={form.password_confirmation}
                                    onChange={e => setForm({ ...form, password_confirmation: e.target.value })}
                                    className={`${inputClass} ${form.password_confirmation && form.password !== form.password_confirmation
                                        ? 'border-red-500 focus:ring-red-500'
                                        : form.password_confirmation && form.password === form.password_confirmation
                                            ? 'border-emerald-500 focus:ring-emerald-500'
                                            : ''
                                    }`}
                                    placeholder="Repita la contraseña"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirm(!showConfirm)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                >
                                    {showConfirm
                                        ? <EyeOff className={`h-5 w-5 ${isDark ? 'text-indigo-300' : 'text-gray-400'}`} />
                                        : <Eye className={`h-5 w-5 ${isDark ? 'text-indigo-300' : 'text-gray-400'}`} />
                                    }
                                </button>
                            </div>
                            {form.password_confirmation && form.password !== form.password_confirmation && (
                                <p className="mt-1 text-xs text-red-500">Las contraseñas no coinciden</p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading || !todoCumple || form.password !== form.password_confirmation}
                            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium py-3 rounded-xl transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 shadow-lg"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Guardando...
                                </span>
                            ) : 'Establecer nueva contraseña'}
                        </button>
                    </form>

                    <p className={`mt-6 text-center text-xs ${isDark ? 'text-indigo-300/60' : 'text-gray-400'}`}>
                        © 2026 Kronox — Alcaldía de Monterrey
                    </p>
                </div>
            </div>
        </div>
    );
}
