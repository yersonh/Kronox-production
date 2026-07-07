import React, { useState } from 'react';
import { useTheme } from '../hooks/useTheme';
import { X } from 'lucide-react';

export default function DependenciasCell({ dependencias, max = 2 }) {
    const { isDark } = useTheme();
    const [mostrarModal, setMostrarModal] = useState(false);

    if (!Array.isArray(dependencias) || dependencias.length === 0) {
        return <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>—</span>;
    }

    const mostradas = dependencias.slice(0, max);
    const resto = dependencias.length - max;

    return (
        <>
            <button
                onClick={() => setMostrarModal(true)}
                className={`text-left hover:underline transition ${isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-600 hover:text-gray-700'}`}
            >
                {mostradas.map(d => d.nombre).join(', ')}
                {resto > 0 && (
                    <span className={`font-medium ml-1 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
                        +{resto}
                    </span>
                )}
            </button>

            {mostrarModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className={`w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>
                        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                Dependencias ({dependencias.length})
                            </h3>
                            <button
                                onClick={() => setMostrarModal(false)}
                                className={`text-xl leading-none px-2 py-1 rounded-lg ${isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'}`}
                            >
                                ×
                            </button>
                        </div>
                        <div className={`px-6 py-4 space-y-2 max-h-96 overflow-y-auto ${isDark ? 'bg-gray-800' : 'bg-white'}`}>
                            {dependencias.map((dep, idx) => (
                                <div
                                    key={idx}
                                    className={`px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-gray-700/50 text-gray-300' : 'bg-gray-50 text-gray-700'}`}
                                >
                                    {dep.nombre}
                                </div>
                            ))}
                        </div>
                        <div className={`px-6 py-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <button
                                onClick={() => setMostrarModal(false)}
                                className={`w-full py-2 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
