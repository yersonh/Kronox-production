// resources/js/pages/admin/NivelesCargo.jsx
import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import { useTheme } from '../../hooks/useTheme';
import {
    Plus, Edit, Trash2, Save, X, AlertCircle,
    AlertTriangle, Award, CheckCircle, XCircle
} from 'lucide-react';
import SuccessModal from '../../components/SuccessModal';

export default function NivelesCargo() {
    const { isDark } = useTheme();
    const [niveles, setNiveles] = useState([]);
    const [form, setForm] = useState({ nombre: '' });
    const [editando, setEditando] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [modalConfirm, setModalConfirm] = useState({ show: false, id: null, nombre: '', accion: 'desactivar' });
    const [modalSuccess, setModalSuccess] = useState({ show: false, name: '' });
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        fetchNiveles();
        const checkScreenSize = () => setIsMobile(window.innerWidth < 1024);
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
        return () => window.removeEventListener('resize', checkScreenSize);
    }, []);

    const fetchNiveles = async () => {
        try {
            const res = await api.get('/niveles-cargo');
            setNiveles(res.data);
        } catch (err) {
            console.error('Error al cargar niveles de cargo:', err);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (editando) {
                await api.patch(`/niveles-cargo/${editando}`, form);
            } else {
                await api.post('/niveles-cargo', form);
                setModalSuccess({ show: true, name: form.nombre });
            }
            resetForm();
            fetchNiveles();
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    const handleEditar = (nivel) => {
        setEditando(nivel.id);
        setForm({ nombre: nivel.nombre });
    };

    const handleEliminar = async () => {
        const { id, accion } = modalConfirm;
        setLoading(true);
        try {
            if (accion === 'desactivar') {
                await api.delete(`/niveles-cargo/${id}`);
            } else {
                await api.patch(`/niveles-cargo/${id}`, { activo: true });
            }
            closeModal();
            fetchNiveles();
        } catch (err) {
            setError(err.response?.data?.message || `Error al ${accion === 'desactivar' ? 'desactivar' : 'reactivar'}`);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (id, nombre, accion = 'desactivar') => {
        setError('');
        setModalConfirm({ show: true, id, nombre, accion });
    };

    const closeModal = () => {
        setModalConfirm({ show: false, id: null, nombre: '', accion: 'desactivar' });
        setError('');
    };

    const resetForm = () => {
        setEditando(null);
        setForm({ nombre: '' });
        setError('');
    };

    const inputClass = `w-full rounded-xl px-4 py-2.5 text-sm transition border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
        isDark ? 'bg-gray-900 border-gray-700 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'
    }`;

    const labelClass = `block text-sm font-medium mb-1.5 flex items-center gap-1.5 ${
        isDark ? 'text-gray-300' : 'text-gray-700'
    }`;

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Award size={24} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            Niveles de Cargo
                        </h2>
                    </div>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        Gestiona los niveles de cargo para los funcionarios
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Formulario */}
                    <div className={`rounded-2xl shadow-lg overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'}`}>
                        <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <div className="flex items-center gap-2">
                                {editando
                                    ? <Edit size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                    : <Plus size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />}
                                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                    {editando ? 'Editar Nivel' : 'Nuevo Nivel'}
                                </h3>
                            </div>
                        </div>

                        <div className="p-6">
                            {error && (
                                <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 ${isDark ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                                    <AlertCircle size={16} />
                                    <span className="text-sm">{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className={labelClass}>
                                        <Award size={14} />
                                        Nombre del Nivel *
                                    </label>
                                    <input
                                        type="text"
                                        value={form.nombre}
                                        onChange={e => setForm({ nombre: e.target.value })}
                                        className={inputClass}
                                        placeholder="Ej: Directivo, Profesional, Técnico"
                                        required
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                                    >
                                        {loading
                                            ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /><span>Guardando...</span></>
                                            : <><Save size={16} /><span>{editando ? 'Actualizar' : 'Guardar'}</span></>}
                                    </button>
                                    {editando && (
                                        <button
                                            type="button"
                                            onClick={resetForm}
                                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                                        >
                                            <X size={16} />Cancelar
                                        </button>
                                    )}
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Listado */}
                    <div className={`lg:col-span-2 rounded-2xl shadow-lg overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-100'}`}>
                        <div className={`px-6 py-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                            <div className="flex items-center gap-2">
                                <Award size={18} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                    Listado de Niveles
                                </h3>
                                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                                    {niveles.length} registros
                                </span>
                            </div>
                        </div>

                        {/* Desktop */}
                        {!isMobile && (
                            <div className="overflow-x-auto">
                                <div className="max-h-[400px] overflow-y-auto custom-scroll">
                                    <table className="w-full text-sm">
                                        <thead className={`sticky top-0 ${isDark ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
                                            <tr className={isDark ? 'bg-gray-900/50 border-b border-gray-700' : 'bg-gray-50 border-b border-gray-200'}>
                                                <th className={`text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                                    <div className="flex items-center gap-1"><Award size={12} />Nivel</div>
                                                </th>
                                                <th className={`text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Estado</th>
                                                <th className={`px-6 py-3 text-xs font-semibold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {niveles.map(n => (
                                                <tr key={n.id} className={`transition ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                                                    <td className={`px-6 py-3 font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>{n.nombre}</td>
                                                    <td className="px-6 py-3">
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                                            n.activo
                                                                ? isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                                                                : isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700'
                                                        }`}>
                                                            {n.activo ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                                            {n.activo ? 'Activo' : 'Inactivo'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => handleEditar(n)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-indigo-400' : 'hover:bg-gray-100 text-gray-500 hover:text-indigo-600'}`} title="Editar"><Edit size={16} /></button>
                                                            {n.activo ? (
                                                                <button onClick={() => openModal(n.id, n.nombre, 'desactivar')} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-red-400' : 'hover:bg-gray-100 text-gray-500 hover:text-red-600'}`} title="Desactivar"><Trash2 size={16} /></button>
                                                            ) : (
                                                                <button onClick={() => openModal(n.id, n.nombre, 'reactivar')} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-green-400' : 'hover:bg-gray-100 text-gray-500 hover:text-green-600'}`} title="Reactivar"><CheckCircle size={16} /></button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {niveles.length === 0 && (
                                                <tr>
                                                    <td colSpan="3" className={`px-6 py-12 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                                        <Award size={48} className={`mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                                                        <p>No hay niveles de cargo registrados</p>
                                                        <p className="text-xs mt-1">Comienza creando un nuevo nivel</p>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Móvil */}
                        {isMobile && (
                            <div className="max-h-[400px] overflow-y-auto custom-scroll">
                                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {niveles.map(n => (
                                        <div key={n.id} className={`p-4 ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'}`}>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>{n.nombre}</h3>
                                                    <span className={`inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                                                        n.activo
                                                            ? isDark ? 'bg-emerald-500/20 text-emerald-300' : 'bg-emerald-100 text-emerald-700'
                                                            : isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                        {n.activo ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                                        {n.activo ? 'Activo' : 'Inactivo'}
                                                    </span>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleEditar(n)} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-indigo-400' : 'hover:bg-gray-100 text-gray-500 hover:text-indigo-600'}`}><Edit size={16} /></button>
                                                    {n.activo ? (
                                                        <button onClick={() => openModal(n.id, n.nombre, 'desactivar')} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-red-400' : 'hover:bg-gray-100 text-gray-500 hover:text-red-600'}`}><Trash2 size={16} /></button>
                                                    ) : (
                                                        <button onClick={() => openModal(n.id, n.nombre, 'reactivar')} className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-gray-700 text-gray-400 hover:text-green-400' : 'hover:bg-gray-100 text-gray-500 hover:text-green-600'}`}><CheckCircle size={16} /></button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {niveles.length === 0 && (
                                        <div className={`p-8 text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                            <Award size={48} className={`mx-auto mb-3 ${isDark ? 'text-gray-700' : 'text-gray-300'}`} />
                                            <p>No hay niveles de cargo registrados</p>
                                            <p className="text-xs mt-1">Comienza creando un nuevo nivel</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de éxito */}
            <SuccessModal 
                isOpen={modalSuccess.show}
                onClose={() => setModalSuccess({ show: false, name: '' })}
                title="¡Nivel de Cargo Creado!"
                message="El nuevo nivel de cargo ha sido registrado correctamente."
                itemName={modalSuccess.name}
                isDark={isDark}
            />

            {/* Modal de confirmación */}
            {modalConfirm.show && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeModal} />
                    <div className={`relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                        <div className="p-6 text-center">
                            <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${modalConfirm.accion === 'desactivar' ? (isDark ? 'bg-red-500/20' : 'bg-red-100') : (isDark ? 'bg-green-500/20' : 'bg-green-100')}`}>
                                {modalConfirm.accion === 'desactivar'
                                    ? <AlertTriangle size={24} className={isDark ? 'text-red-400' : 'text-red-600'} />
                                    : <CheckCircle size={24} className={isDark ? 'text-green-400' : 'text-green-600'} />}
                            </div>
                            <h3 className={`text-lg font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                {modalConfirm.accion === 'desactivar' ? 'Desactivar nivel' : 'Reactivar nivel'}
                            </h3>
                            <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                ¿Estás seguro de que deseas {modalConfirm.accion === 'desactivar' ? 'desactivar' : 'reactivar'} el nivel <span className="font-semibold">"{modalConfirm.nombre}"</span>?
                            </p>
                            {error && <div className={`mb-4 p-2 rounded-lg text-sm ${isDark ? 'bg-red-500/20 text-red-300' : 'bg-red-50 text-red-600'}`}>{error}</div>}
                            <div className="flex gap-3">
                                <button onClick={closeModal} className={`flex-1 px-4 py-2 rounded-xl text-sm font-medium transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Cancelar</button>
                                <button onClick={handleEliminar} disabled={loading} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition disabled:opacity-50 ${modalConfirm.accion === 'desactivar' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                                    {loading
                                        ? <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> {modalConfirm.accion === 'desactivar' ? 'Desactivando...' : 'Reactivando...'}</>
                                        : <>{modalConfirm.accion === 'desactivar' ? <Trash2 size={16} /> : <CheckCircle size={16} />} {modalConfirm.accion === 'desactivar' ? 'Desactivar' : 'Reactivar'}</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scroll::-webkit-scrollbar-track { background: ${isDark ? '#1f2937' : '#f1f5f9'}; border-radius: 10px; }
                .custom-scroll::-webkit-scrollbar-thumb { background: ${isDark ? '#4b5563' : '#cbd5e1'}; border-radius: 10px; }
                .custom-scroll::-webkit-scrollbar-thumb:hover { background: ${isDark ? '#6b7280' : '#94a3b8'}; }
            `}</style>
        </Layout>
    );
}