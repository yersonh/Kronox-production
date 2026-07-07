import React from 'react';
import { CheckCircle, X } from 'lucide-react';

const SuccessModal = ({
    isOpen,
    onClose,
    title = '¡Creación Exitosa!',
    message = 'El registro ha sido creado correctamente.',
    itemName = '',
    subMessage = '',
    isDark = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop con blur */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className={`relative w-full max-w-sm transform overflow-hidden rounded-3xl shadow-2xl transition-all border animate-in fade-in zoom-in duration-300 ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
                }`}>

                {/* Botón Cerrar (X) */}
                <button
                    onClick={onClose}
                    className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                        }`}
                >
                    <X size={20} />
                </button>

                <div className="p-8 text-center">
                    {/* Icono animado con gradiente */}
                    <div className="mb-6 relative flex justify-center">
                        <div className="absolute inset-0 animate-ping rounded-full bg-emerald-500/20 scale-150 opacity-20" />
                        <div className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20 ${isDark ? 'bg-emerald-500/10' : 'bg-emerald-50'
                            }`}>
                            <CheckCircle size={40} className="text-emerald-500" />
                        </div>
                    </div>

                    {/* Texto */}
                    <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {title}
                    </h3>

                    <div className="space-y-3">
                        <p className={`text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {message}
                        </p>

                        {itemName && (
                            <div className={`inline-block px-4 py-2 rounded-2xl font-mono text-sm font-semibold mt-1 ${isDark ? 'bg-gray-900 text-emerald-400 border border-emerald-500/20' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                }`}>
                                {itemName}
                            </div>
                        )}

                        {subMessage && (
                            <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {subMessage}
                            </p>
                        )}
                    </div>

                    {/* Botón Aceptar */}
                    <button
                        onClick={onClose}
                        className="mt-8 w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        Aceptar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SuccessModal;
