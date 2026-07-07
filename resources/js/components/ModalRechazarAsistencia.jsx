import React, { useState } from 'react';
import { X, XCircle } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function ModalRechazarAsistencia({ evento, onClose, onConfirmar }) {
    const { isDark } = useTheme();
    const [motivo, setMotivo] = useState('');
    const [loading, setLoading] = useState(false);

    const handleConfirmar = async () => {
        setLoading(true);
        await onConfirmar(motivo);
        setLoading(false);
        onClose();
    };

    return (
        <>
            {/* Backdrop con blur */}
            <div
                className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl w-full max-w-md`}>
                    {/* Header */}
                    <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-red-100/20">
                                <XCircle size={20} className="text-red-500" />
                            </div>
                            <div>
                                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    Rechazar asistencia
                                </h3>
                                <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {evento?.tema}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className={`p-1 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-6 space-y-4">
                        <div>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                ¿Por qué no asistirás? (Opcional)
                            </label>
                            <textarea
                                value={motivo}
                                onChange={(e) => setMotivo(e.target.value)}
                                placeholder="Cuéntanos el motivo de tu inasistencia..."
                                maxLength={500}
                                rows={4}
                                className={`w-full px-4 py-3 rounded-lg border transition resize-none ${
                                    isDark
                                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                                        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-red-500 focus:ring-1 focus:ring-red-500/30'
                                } focus:outline-none`}
                            />
                            <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {motivo.length}/500 caracteres
                            </p>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className={`flex gap-3 p-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className={`flex-1 py-2.5 rounded-lg font-medium transition ${
                                isDark
                                    ? 'bg-gray-700 text-gray-200 hover:bg-gray-600 disabled:opacity-50'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
                            }`}
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleConfirmar}
                            disabled={loading}
                            className="flex-1 py-2.5 rounded-lg font-medium bg-red-600 hover:bg-red-700 text-white transition disabled:opacity-50"
                        >
                            {loading ? 'Guardando...' : 'Confirmar rechazo'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
