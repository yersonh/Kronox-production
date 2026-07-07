import React, { useState } from 'react';
import { X, CalendarClock, AlertCircle, Clock } from 'lucide-react';
import api from '../api/axios';
import { useTheme } from '../hooks/useTheme';

export default function ModalAplazarEvento({ evento, onClose, onAplazado }) {
    const { isDark } = useTheme();
    const [fechaHora, setFechaHora] = useState(evento.fecha_hora?.slice(0, 16) ?? '');
    const [fechaHoraFin, setFechaHoraFin] = useState(evento.fecha_hora_fin?.slice(0, 16) ?? '');
    const [razon, setRazon] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!fechaHora || !razon.trim()) {
            setError('Completa la nueva fecha y la razón del aplazamiento');
            return;
        }
        setLoading(true);
        setError('');
        try {
            await api.post(`/eventos/${evento.id}/aplazar`, {
                fecha_hora:      fechaHora,
                fecha_hora_fin:  fechaHoraFin || null,
                razon_aplazamiento: razon.trim(),
            });
            onAplazado();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al aplazar el evento');
        } finally {
            setLoading(false);
        }
    };

    const inputCls = `w-full rounded-xl px-3 py-2.5 text-sm border transition focus:outline-none focus:ring-2 focus:ring-amber-500 ${
        isDark
            ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
            : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
    }`;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className={`relative w-full max-w-md rounded-2xl shadow-2xl flex flex-col ${
                isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
                {/* Header */}
                <div className={`px-6 py-4 flex items-center justify-between rounded-t-2xl ${
                    isDark
                        ? 'bg-gradient-to-r from-amber-900/60 to-orange-900/40 border-b border-gray-700'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500'
                }`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isDark ? 'bg-amber-500/20' : 'bg-white/20'}`}>
                            <CalendarClock size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-white font-semibold text-base">Aplazar evento</h2>
                            <p className="text-white/70 text-xs mt-0.5 truncate max-w-[220px]">
                                {evento.tema}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-full w-8 h-8 flex items-center justify-center transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${
                            isDark
                                ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                                : 'bg-red-50 border border-red-200 text-red-700'
                        }`}>
                            <AlertCircle size={15} className="flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                <Clock size={12} /> Nueva fecha inicio *
                            </label>
                            <input
                                type="datetime-local"
                                value={fechaHora}
                                onChange={e => setFechaHora(e.target.value)}
                                className={inputCls}
                                required
                            />
                        </div>
                        <div>
                            <label className={`block text-xs font-medium mb-1.5 flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                <Clock size={12} /> Nueva fecha fin
                            </label>
                            <input
                                type="datetime-local"
                                value={fechaHoraFin}
                                onChange={e => setFechaHoraFin(e.target.value)}
                                min={fechaHora || undefined}
                                className={inputCls}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Razón del aplazamiento *
                        </label>
                        <textarea
                            value={razon}
                            onChange={e => setRazon(e.target.value)}
                            rows={4}
                            placeholder="Explica brevemente por qué se aplaza este evento..."
                            className={`${inputCls} resize-none`}
                            required
                        />
                        <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                            Esta razón quedará registrada y se notificará a los invitados.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`flex-1 py-2.5 text-sm font-medium rounded-xl transition ${
                                isDark
                                    ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                                    : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                            }`}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white disabled:opacity-50 transition"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                    Aplazando...
                                </>
                            ) : (
                                <>
                                    <CalendarClock size={15} />
                                    Aplazar evento
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
