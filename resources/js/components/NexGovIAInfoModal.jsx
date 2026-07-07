import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { X, Globe, Shield, Zap } from 'lucide-react';

export default function NexGovIAInfoModal({ isOpen, onClose }) {
    const { isDark } = useTheme();

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm transition-opacity"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
        >
            <div
                className={`
                    w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in duration-300
                    max-h-[90vh] flex flex-col
                    ${isDark ? 'bg-slate-900 border border-slate-800' : 'bg-white border border-gray-100'}
                `}
            >
                {/* Header con Degradado Marino Corporativo Profundo */}
                <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 min-h-[9rem] py-6 px-6 sm:px-8 flex items-center pr-14 shrink-0 border-b border-slate-800">
                    <div className="absolute inset-0 opacity-15">
                        <svg width="100%" height="100%" fill="none">
                            <pattern id="pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                                <circle cx="2" cy="2" r="1" fill="white" />
                            </pattern>
                            <rect width="100%" height="100%" fill="url(#pattern)" />
                        </svg>
                    </div>

                    {/* Sutil resplandor dorado de fondo detrás del logo */}
                    <div className="absolute -left-10 -top-10 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition z-10 border border-white/10"
                    >
                        <X size={18} />
                    </button>

                    <div className="flex items-center gap-5 w-full relative z-10">
                        {/* Panel circular del logo más grande y con anillo de brillo */}
                        <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white flex items-center justify-center p-2.5 shadow-xl shrink-0 ring-4 ring-white/10 transform hover:scale-105 transition-transform duration-300">
                            <img 
                                src="/images/logoEmpresa.png" 
                                alt="Logo Empresa" 
                                className="w-full h-full object-contain" 
                            />
                        </div>
                        <div>
                            <p className="text-white text-xs sm:text-sm font-semibold leading-relaxed">
                                Plataforma desarrollada por <span className="text-amber-400">NexGovIA S.A.S.®</span>
                            </p>
                            <p className="text-slate-300 text-[11px] sm:text-xs leading-relaxed mt-0.5">
                                Asesores <span className="text-indigo-300 font-semibold">e-Governance Solutions</span> para Entidades Públicas.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 sm:p-8 overflow-y-auto flex-1 custom-scrollbar">
                    <style>{`
                        .custom-scrollbar::-webkit-scrollbar {
                            width: 6px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-track {
                            background: transparent;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb {
                            background: ${isDark ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.8)'};
                            border-radius: 9999px;
                        }
                        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                            background: ${isDark ? 'rgba(100, 116, 139, 0.7)' : 'rgba(148, 163, 184, 1)'};
                        }
                        /* Soporte para Firefox */
                        .custom-scrollbar {
                            scrollbar-width: thin;
                            scrollbar-color: ${isDark ? 'rgba(71, 85, 105, 0.5) transparent' : 'rgba(203, 213, 225, 0.8) transparent'};
                        }
                    `}</style>
                    <div className={`mb-6 text-sm leading-relaxed ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                        <p className="mb-4">
                            NexGovIA es una firma líder en consultoría y desarrollo tecnológico, especializada en la implementación de soluciones de Inteligencia Artificial para la administración pública, mediante la automatización de procesos de sus actividades administrativas incursas en cumplimientos normativos.
                        </p>
                        <p>
                            Diseñamos ecosistemas digitales que permiten a las organizaciones gubernamentales operar con mayor transparencia, agilidad y eficiencia, conectando mejor con las necesidades del ciudadano moderno.
                        </p>
                    </div>

                    {/* Features Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 sm:mb-8">
                        <div className={`p-4 rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-indigo-50/50'}`}>
                            <div className="text-indigo-500 mb-2"><Globe size={20} /></div>
                            <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>Alcance</h4>
                            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Sistemas escalables a nivel nacional.</p>
                        </div>
                        <div className={`p-4 rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-indigo-50/50'}`}>
                            <div className="text-purple-500 mb-2"><Shield size={20} /></div>
                            <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>Seguridad</h4>
                            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Protección de datos de alto nivel.</p>
                        </div>
                        <div className={`p-4 rounded-2xl ${isDark ? 'bg-slate-800/50' : 'bg-indigo-50/50'}`}>
                            <div className="text-amber-500 mb-2"><Zap size={20} /></div>
                            <h4 className={`text-xs font-bold uppercase tracking-wider mb-1 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>IA</h4>
                            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Automatización inteligente de procesos.</p>
                        </div>
                    </div>
                    <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3">
                        <p className={`text-sm font-medium ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                            Conoce más sobre nosotros en:
                        </p>
                        <a
                            href="https://nexgovia.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`
                                flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 font-bold text-xs
                                ${isDark
                                    ? 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/30 hover:shadow-[0_0_10px_rgba(99,102,241,0.1)]'
                                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-100 hover:shadow-sm'}
                            `}
                        >
                            <Globe size={14} />
                            nexgovia.com
                        </a>
                    </div>
                    {/* Footer / CTA */}
                    <div className="flex flex-col gap-4">
                        <button
                            onClick={onClose}
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-850 hover:from-indigo-700 hover:to-indigo-900 text-white font-semibold transition-all duration-300 shadow-lg shadow-indigo-950/20 hover:shadow-indigo-950/40"
                        >
                            Entendido
                        </button>
                        <p className={`text-center text-[10px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                            © 2026 NexGovIA • Transformando el futuro de la gestión pública
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
