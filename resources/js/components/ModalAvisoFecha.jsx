import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { AlertTriangle, X } from 'lucide-react';

export default function ModalAvisoFecha({ isOpen, onClose }) {
    const { isDark } = useTheme();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all animate-in fade-in duration-200">
            <div className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden transform transition-all animate-in zoom-in duration-300 ${
                isDark ? 'bg-gray-800 border border-gray-700 shadow-amber-900/20' : 'bg-white shadow-amber-200/50'
            }`}>
                {/* Header/Close */}
                <div className="flex justify-end px-4 pt-4">
                    <button
                        onClick={onClose}
                        className={`p-1.5 rounded-lg transition ${
                            isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'
                        }`}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div className="px-8 pb-8 pt-2 flex flex-col items-center text-center">
                    <div className={`p-4 rounded-full mb-4 ${
                        isDark ? 'bg-amber-500/20' : 'bg-amber-100'
                    }`}>
                        <AlertTriangle size={40} className={isDark ? 'text-amber-400' : 'text-amber-600'} />
                    </div>
                    
                    <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Fecha no permitida
                    </h3>
                    
                    <p className={`text-sm mb-8 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        No es posible crear eventos en fechas anteriores al día actual. Por favor, selecciona una fecha vigente.
                    </p>

                    <button
                        onClick={onClose}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-sm font-bold transition-all shadow-lg shadow-amber-500/25 active:scale-95"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}
