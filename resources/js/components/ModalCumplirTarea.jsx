import React, { useState, useRef } from 'react';
import api from '../api/axios';
import { useTheme } from '../hooks/useTheme';
import { CheckCheck, FileText, ImagePlus, X, Upload, Loader2, FileCheck } from 'lucide-react';

export default function ModalCumplirTarea({ tipo, item, onClose, onCumplido }) {
    const { isDark } = useTheme();
    const [conclusiones, setConclusiones] = useState('');
    const [soporte, setSoporte] = useState(null);
    const [fotos, setFotos] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const inputFotos = useRef(null);
    const inputSoporte = useRef(null);

    const titulo = tipo === 'tarea' ? item.asunto : item.descripcion;
    const endpoint = tipo === 'tarea'
        ? `/tareas/${item.id}/cerrar`
        : `/compromisos/${item.id}/cumplir`;

    const handleFotos = (e) => {
        const archivos = Array.from(e.target.files);
        setFotos(prev => [...prev, ...archivos]);
        const nuevasPreviews = archivos.map(f => ({
            url: URL.createObjectURL(f),
            nombre: f.name,
        }));
        setPreviews(prev => [...prev, ...nuevasPreviews]);
        e.target.value = '';
    };

    const eliminarFoto = (idx) => {
        URL.revokeObjectURL(previews[idx].url);
        setFotos(prev => prev.filter((_, i) => i !== idx));
        setPreviews(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!conclusiones.trim()) {
            setError('Las conclusiones son obligatorias.');
            return;
        }
        setError('');
        setGuardando(true);
        try {
            const fd = new FormData();
            fd.append('conclusiones', conclusiones);
            if (soporte) fd.append('soporte_cumplimiento', soporte);
            fotos.forEach(f => fd.append('fotos[]', f));

            await api.post(endpoint, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            onCumplido();
        } catch (err) {
            setError(err.response?.data?.message ?? 'Error al guardar. Intenta de nuevo.');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
            <div className={`w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[90vh] ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'}`}>

                {/* Header */}
                <div className={`px-6 py-4 border-b flex items-start justify-between gap-3 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <CheckCheck size={18} className="text-emerald-500 flex-shrink-0" />
                            <h3 className={`font-semibold text-base ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                {tipo === 'tarea' ? 'Finalizar tarea' : 'Marcar compromiso como cumplido'}
                            </h3>
                        </div>
                        <p className={`text-sm truncate ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{titulo}</p>
                    </div>
                    <button onClick={onClose} className={`p-1.5 rounded-lg transition ${isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-100'}`}>
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="px-6 py-5 space-y-5">

                        {/* Conclusiones */}
                        <div>
                            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Conclusiones <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                value={conclusiones}
                                onChange={e => setConclusiones(e.target.value)}
                                rows={4}
                                placeholder="Describe el resultado y las conclusiones del trabajo realizado..."
                                className={`w-full px-3 py-2.5 rounded-xl text-sm border resize-none transition focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                                    isDark
                                        ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-500'
                                        : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'
                                }`}
                            />
                        </div>

                        {/* PDF Soporte */}
                        <div>
                            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Soporte de cumplimiento (PDF)
                            </label>
                            <input ref={inputSoporte} type="file" accept=".pdf" className="hidden" onChange={e => setSoporte(e.target.files[0] || null)} />
                            {soporte ? (
                                <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                                    <FileCheck size={16} className="text-emerald-500 flex-shrink-0" />
                                    <span className={`text-sm flex-1 truncate ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{soporte.name}</span>
                                    <button type="button" onClick={() => setSoporte(null)} className={`p-1 rounded transition ${isDark ? 'hover:bg-gray-600 text-gray-400' : 'hover:bg-gray-200 text-gray-400'}`}>
                                        <X size={13} />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => inputSoporte.current?.click()}
                                    className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed text-sm transition ${
                                        isDark
                                            ? 'border-gray-600 text-gray-400 hover:border-gray-500 hover:bg-gray-700/50'
                                            : 'border-gray-300 text-gray-500 hover:border-gray-400 hover:bg-gray-50'
                                    }`}
                                >
                                    <FileText size={15} /> Adjuntar PDF de soporte
                                </button>
                            )}
                        </div>

                        {/* Fotos evidencia */}
                        <div>
                            <label className={`block text-xs font-semibold mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                Fotos de evidencia
                            </label>
                            <input ref={inputFotos} type="file" accept="image/*" multiple className="hidden" onChange={handleFotos} />

                            {previews.length > 0 && (
                                <div className="grid grid-cols-4 gap-2 mb-2">
                                    {previews.map((p, i) => (
                                        <div key={i} className="relative group aspect-square">
                                            <img src={p.url} alt={p.nombre} className="w-full h-full object-cover rounded-lg" />
                                            <button
                                                type="button"
                                                onClick={() => eliminarFoto(i)}
                                                className="absolute top-1 right-1 p-0.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition"
                                            >
                                                <X size={11} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <button
                                type="button"
                                onClick={() => inputFotos.current?.click()}
                                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-dashed text-sm transition ${
                                    isDark
                                        ? 'border-gray-600 text-gray-400 hover:border-gray-500 hover:bg-gray-700/50'
                                        : 'border-gray-300 text-gray-500 hover:border-gray-400 hover:bg-gray-50'
                                }`}
                            >
                                <ImagePlus size={15} />
                                {previews.length > 0 ? `${previews.length} foto(s) — agregar más` : 'Agregar fotos de evidencia'}
                            </button>
                        </div>

                        {error && (
                            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>
                        )}
                    </div>

                    {/* Footer */}
                    <div className={`px-6 pb-6 pt-2 flex gap-3 border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={guardando}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-60"
                        >
                            {guardando ? <Loader2 size={15} className="animate-spin" /> : <CheckCheck size={15} />}
                            {guardando ? 'Guardando...' : 'Confirmar'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
