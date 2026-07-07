import { BadgeCheck, AlertTriangle, X } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export default function ModalConfirmLider({ contratista, loading, onConfirm, onClose }) {
    const { isDark } = useTheme();

    if (!contratista) return null;

    const nombre = `${contratista.persona?.nombre} ${contratista.persona?.apellido}`;
    const dep = contratista.dependencia?.nombre || 'esta dependencia';
    const quitando = contratista.es_lider;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => !loading && onClose()} />
            <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>

                {/* Header */}
                <div className={`px-6 py-4 border-b flex items-center justify-between ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${quitando ? isDark ? 'bg-gray-700' : 'bg-gray-100' : isDark ? 'bg-indigo-500/20' : 'bg-indigo-50'}`}>
                            <BadgeCheck size={18} className={quitando ? isDark ? 'text-gray-400' : 'text-gray-500' : isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                        </div>
                        <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            {quitando ? 'Quitar rol de líder' : 'Asignar como líder'}
                        </h3>
                    </div>
                    <button onClick={onClose} disabled={loading} className={`p-1 rounded-lg transition disabled:opacity-50 ${isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}>
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-3">
                    <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {quitando ? (
                            <>
                                ¿Confirma quitar el rol de líder a{' '}
                                <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{nombre}</span>
                                {' '}en la dependencia{' '}
                                <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{dep}</span>?
                            </>
                        ) : (
                            <>
                                ¿Confirma asignar a{' '}
                                <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{nombre}</span>
                                {' '}como líder de{' '}
                                <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>{dep}</span>?
                            </>
                        )}
                    </p>
                    {!quitando && (
                        <div className={`flex items-start gap-2 p-3 rounded-xl text-xs ${isDark ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300' : 'bg-amber-50 border border-amber-200 text-amber-700'}`}>
                            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                            <span>Si existe otro líder en esta dependencia, perderá ese rol automáticamente.</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={`px-6 py-4 border-t flex justify-end gap-3 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50 ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold transition disabled:opacity-50 ${quitando
                            ? isDark ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-700 hover:bg-gray-800 text-white'
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white'}`}>
                        {loading
                            ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> Procesando...</>
                            : <><BadgeCheck size={15} /> {quitando ? 'Quitar líder' : 'Confirmar'}</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
