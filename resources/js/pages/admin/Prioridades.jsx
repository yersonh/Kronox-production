// resources/js/pages/admin/Prioridades.jsx
import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { useTheme } from '../../hooks/useTheme';
import { 
    Plus, Edit, Trash2, Flag, Calendar, 
    Palette, Save, X, AlertCircle, CheckCircle, XCircle
} from 'lucide-react';
import SuccessModal from '../../components/SuccessModal';

export default function Prioridades() {
    const { isDark } = useTheme();
    const [prioridades, setPrioridades] = useState([]);
    const [form, setForm] = useState({ nombre: '', dias_vencimiento: '', color: '#3B82F6' });
    const [editando, setEditando] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [modalSuccess, setModalSuccess] = useState({ show: false, name: '' });

    useEffect(() => { fetchPrioridades(); }, []);

    const fetchPrioridades = async () => {
        try {
            const res = await api.get('/prioridades');
            setPrioridades(res.data);
        } catch (err) {
            console.error('Error al cargar prioridades:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (editando) {
                await api.put(`/prioridades/${editando}`, form);
            } else {
                await api.post('/prioridades', form);
                setModalSuccess({ show: true, name: form.nombre });
            }
            setForm({ nombre: '', dias_vencimiento: '', color: '#3B82F6' });
            setEditando(null);
            fetchPrioridades();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    const handleEditar = (p) => {
        setEditando(p.id);
        setForm({ nombre: p.nombre, dias_vencimiento: p.dias_vencimiento, color: p.color || '#3B82F6' });
    };

    const handleEliminar = async (id) => {
        if (!confirm('¿Desactivar esta prioridad?')) return;
        try {
            await api.delete(`/prioridades/${id}`);
            fetchPrioridades();
        } catch (err) {
            console.error('Error al eliminar:', err);
        }
    };

    const handleCancelar = () => {
        setEditando(null);
        setForm({ nombre: '', dias_vencimiento: '', color: '#3B82F6' });
        setError('');
    };

    // Colores predefinidos para sugerencias
    const coloresSugeridos = [
        '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
    ];

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Flag size={24} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            Prioridades
                        </h2>
                    </div>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Gestiona los niveles de prioridad para las tareas
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Formulario */}
                    <div className={`rounded-2xl shadow-lg overflow-hidden transition ${
                        isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'
                    }`}>
                        <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <div className="flex items-center gap-2">
                                {editando ? (
                                    <Edit size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                ) : (
                                    <Plus size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                )}
                                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                    {editando ? 'Editar Prioridad' : 'Nueva Prioridad'}
                                </h3>
                            </div>
                        </div>
                        
                        <div className="p-6">
                            {error && (
                                <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${
                                    isDark 
                                        ? 'bg-red-500/10 border border-red-500/20 text-red-300' 
                                        : 'bg-red-50 border border-red-200 text-red-700'
                                }`}>
                                    <AlertCircle size={16} />
                                    <span className="text-sm">{error}</span>
                                </div>
                            )}
                            
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        <Flag size={14} />
                                        Nombre *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.nombre}
                                        onChange={e => setForm({ ...form, nombre: e.target.value })}
                                        className={`w-full rounded-xl px-4 py-2.5 text-sm transition ${
                                            isDark 
                                                ? 'bg-gray-900 border-gray-700 text-white focus:ring-2 focus:ring-indigo-500' 
                                                : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-indigo-500'
                                        } border focus:outline-none`}
                                        placeholder="Ej: Alta, Media, Baja"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        <Calendar size={14} />
                                        Días para vencimiento *
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={form.dias_vencimiento}
                                        onChange={e => setForm({ ...form, dias_vencimiento: e.target.value })}
                                        className={`w-full rounded-xl px-4 py-2.5 text-sm transition ${
                                            isDark 
                                                ? 'bg-gray-900 border-gray-700 text-white focus:ring-2 focus:ring-indigo-500' 
                                                : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-indigo-500'
                                        } border focus:outline-none`}
                                        placeholder="Ej: 3, 5, 7"
                                        required
                                    />
                                </div>
                                
                                <div>
                                    <label className={`block text-sm font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                                        <Palette size={14} />
                                        Color
                                    </label>
                                    <div className="flex gap-3 items-center">
                                        <input
                                            type="color"
                                            value={form.color}
                                            onChange={e => setForm({ ...form, color: e.target.value })}
                                            className={`w-12 h-12 rounded-xl cursor-pointer border-2 ${
                                                isDark ? 'border-gray-700' : 'border-gray-200'
                                            }`}
                                        />
                                        <input
                                            type="text"
                                            value={form.color}
                                            onChange={e => setForm({ ...form, color: e.target.value })}
                                            className={`flex-1 rounded-xl px-4 py-2.5 text-sm transition font-mono ${
                                                isDark 
                                                    ? 'bg-gray-900 border-gray-700 text-white focus:ring-2 focus:ring-indigo-500' 
                                                    : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-indigo-500'
                                            } border focus:outline-none`}
                                            placeholder="#RRGGBB"
                                        />
                                    </div>
                                    
                                    {/* Colores sugeridos */}
                                    <div className="flex gap-2 mt-3">
                                        {coloresSugeridos.map(color => (
                                            <button
                                                key={color}
                                                type="button"
                                                onClick={() => setForm({ ...form, color })}
                                                className={`w-8 h-8 rounded-lg border-2 transition hover:scale-110 ${
                                                    form.color === color 
                                                        ? 'ring-2 ring-offset-2 ring-indigo-500' 
                                                        : ''
                                                }`}
                                                style={{ backgroundColor: color }}
                                                title={color}
                                            />
                                        ))}
                                    </div>
                                </div>
                                
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                                    >
                                        {loading ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                                <span>Guardando...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Save size={16} />
                                                <span>{editando ? 'Actualizar' : 'Guardar'}</span>
                                            </>
                                        )}
                                    </button>
                                    
                                    {editando && (
                                        <button
                                            type="button"
                                            onClick={handleCancelar}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                                                isDark 
                                                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            }`}
                                        >
                                            <X size={16} />
                                            Cancelar
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Listado */}
                    <div className={`lg:col-span-2 rounded-2xl shadow-lg overflow-hidden transition ${
                        isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'
                    }`}>
                        <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <div className="flex items-center gap-2">
                                <Flag size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                    Listado de Prioridades
                                </h3>
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                                    isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
                                }`}>
                                    {prioridades.length} registros
                                </span>
                            </div>
                        </div>
                        
                        {/* Vista para desktop */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className={isDark ? 'bg-gray-900/50 border-b border-gray-700' : 'bg-gray-50 border-b border-gray-200'}>
                                    <tr>
                                        <th className={`text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            <div className="flex items-center gap-1">
                                                <Flag size={12} />
                                                Prioridad
                                            </div>
                                        </th>
                                        <th className={`text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            <div className="flex items-center gap-1">
                                                <Calendar size={12} />
                                                Días vencimiento
                                            </div>
                                        </th>
                                        <th className={`text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            <div className="flex items-center gap-1">
                                                <Palette size={12} />
                                                Color
                                            </div>
                                        </th>
                                        <th className={`text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            Estado
                                        </th>
                                        <th className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                            Acciones
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {prioridades.map(p => (
                                        <tr key={p.id} className={`transition ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                                            <td className={`px-6 py-3 font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                                <span className="inline-flex items-center gap-2">
                                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }}></span>
                                                    {p.nombre}
                                                </span>
                                            </td>
                                            <td className={`px-6 py-3 text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                {p.dias_vencimiento} días
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-lg text-xs font-mono ${
                                                    isDark ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                                                }`}>
                                                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }}></span>
                                                    {p.color}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                                    p.activo 
                                                        ? isDark
                                                            ? 'bg-emerald-500/20 text-emerald-300'
                                                            : 'bg-emerald-100 text-emerald-700'
                                                        : isDark
                                                            ? 'bg-red-500/20 text-red-300'
                                                            : 'bg-red-100 text-red-700'
                                                }`}>
                                                    {p.activo ? (
                                                        <CheckCircle size={10} />
                                                    ) : (
                                                        <XCircle size={10} />
                                                    )}
                                                    {p.activo ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleEditar(p)}
                                                        className={`p-1.5 rounded-lg transition ${
                                                            isDark 
                                                                ? 'hover:bg-gray-700 text-gray-400 hover:text-indigo-400' 
                                                                : 'hover:bg-gray-100 text-gray-500 hover:text-indigo-600'
                                                        }`}
                                                        title="Editar"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEliminar(p.id)}
                                                        className={`p-1.5 rounded-lg transition ${
                                                            isDark 
                                                                ? 'hover:bg-gray-700 text-gray-400 hover:text-red-400' 
                                                                : 'hover:bg-gray-100 text-gray-500 hover:text-red-600'
                                                        }`}
                                                        title="Desactivar"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {prioridades.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className={`px-6 py-12 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                <Flag size={48} className={`mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                                                <p>No hay prioridades registradas</p>
                                                <p className="text-xs mt-1">Comienza creando una nueva prioridad</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Vista para móvil - Cards */}
                        <div className="lg:hidden divide-y divide-gray-100 dark:divide-gray-700">
                            {prioridades.map(p => (
                                <div key={p.id} className={`p-4 ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }}></span>
                                                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                                    {p.nombre}
                                                </h3>
                                            </div>
                                            <div className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                <span className="inline-flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {p.dias_vencimiento} días para vencer
                                                </span>
                                            </div>
                                            <div className={`text-xs font-mono mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                Color: {p.color}
                                            </div>
                                        </div>
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                            p.activo 
                                                ? isDark
                                                    ? 'bg-emerald-500/20 text-emerald-300'
                                                    : 'bg-emerald-100 text-emerald-700'
                                                : isDark
                                                    ? 'bg-red-500/20 text-red-300'
                                                    : 'bg-red-100 text-red-700'
                                        }`}>
                                            {p.activo ? (
                                                <CheckCircle size={10} />
                                            ) : (
                                                <XCircle size={10} />
                                            )}
                                            {p.activo ? 'Activo' : 'Inactivo'}
                                        </span>
                                    </div>
                                    
                                    <div className="flex gap-3 mt-4 pt-2 border-t border-gray-100 dark:border-gray-700">
                                        <button
                                            onClick={() => handleEditar(p)}
                                            className={`flex items-center gap-1 text-sm font-medium transition ${
                                                isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'
                                            }`}
                                        >
                                            <Edit size={14} />
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleEliminar(p.id)}
                                            className={`flex items-center gap-1 text-sm font-medium transition ${
                                                isDark ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'
                                            }`}
                                        >
                                            <Trash2 size={14} />
                                            Desactivar
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {prioridades.length === 0 && (
                                <div className={`p-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                    <Flag size={48} className={`mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                                    <p>No hay prioridades registradas</p>
                                    <p className="text-xs mt-1">Comienza creando una nueva prioridad</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {/* Modal de éxito */}
            <SuccessModal 
                isOpen={modalSuccess.show}
                onClose={() => setModalSuccess({ show: false, name: '' })}
                title="¡Prioridad Creada!"
                message="La nueva prioridad ha sido registrada correctamente."
                itemName={modalSuccess.name}
                isDark={isDark}
            />
        </Layout>
    );
}