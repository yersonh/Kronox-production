import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { CheckCircle, X } from 'lucide-react';

export default function ModalExito({ titulo = '¡Listo!', mensaje, onClose, onAccion, textoAccion }) {
    const { isDark } = useTheme();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
                {/* Close */}
                <div className="flex justify-end px-4 pt-4">
                    <button
                        onClick={onClose}
                        className={`p-1.5 rounded-lg transition ${isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'}`}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-8 pb-8 pt-2 flex flex-col items-center text-center">
                    <div className={`p-4 rounded-full mb-4 ${isDark ? 'bg-emerald-500/20' : 'bg-emerald-100'}`}>
                        <CheckCircle size={36} className={isDark ? 'text-emerald-400' : 'text-emerald-600'} />
                    </div>
                    <h3 className={`text-lg font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {titulo}
                    </h3>
                    {mensaje && (
                        <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {mensaje}
                        </p>
                    )}
                    <div className="flex gap-3 w-full">
                        {onAccion && textoAccion && (
                            <button
                                onClick={onAccion}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-sm font-semibold transition"
                            >
                                {textoAccion}
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition border ${isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
