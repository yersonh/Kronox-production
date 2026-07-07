import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import api from '../../api/axios';
import MapaPicker from '../../components/MapaPicker';
import { useTheme } from '../../hooks/useTheme';
import {
    Landmark, Save, Upload, Building2, Phone, MapPin,
    Hash, Type, MessageSquare, AlertCircle, CheckCircle, ImageIcon, Mail
} from 'lucide-react';

export default function EntidadConfig() {
    const { isDark } = useTheme();
    const [form, setForm] = useState({
        nombre: '', nit: '', direccion: '', eslogan: '', telefono: '', email: '',
        latitude: null, longitude: null, ubicacion_descripcion: '',
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [error, setError] = useState('');
    const [exito, setExito] = useState(false);
    const [logoCacheBuster, setLogoCacheBuster] = useState(Date.now());
    const [logoExiste, setLogoExiste] = useState(false);

    useEffect(() => {
        fetchConfig();
        checkLogo();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await api.get('/entidad-config');
            const d = res.data;
            setForm({
                nombre:                d.nombre ?? '',
                nit:                   d.nit ?? '',
                direccion:             d.direccion ?? '',
                eslogan:               d.eslogan ?? '',
                telefono:              d.telefono ?? '',
                email:                 d.email ?? '',
                latitude:              d.latitude ? parseFloat(d.latitude) : null,
                longitude:             d.longitude ? parseFloat(d.longitude) : null,
                ubicacion_descripcion: d.ubicacion_descripcion ?? '',
            });
        } catch {
            setError('No se pudo cargar la configuración');
        } finally {
            setLoading(false);
        }
    };

    const checkLogo = async () => {
        try {
            await fetch('/api/entidad-config/logo', { method: 'HEAD' });
            setLogoExiste(true);
        } catch {
            setLogoExiste(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setExito(false);
        try {
            await api.put('/entidad-config', form);
            setExito(true);
            setTimeout(() => setExito(false), 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Error al guardar');
        } finally {
            setSaving(false);
        }
    };

    const handleLogoChange = async (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;
        setUploadingLogo(true);
        setError('');
        try {
            const fd = new FormData();
            fd.append('logo', archivo);
            await api.post('/entidad-config/logo', fd, { headers: { 'Content-Type': undefined } });
            setLogoExiste(true);
            setLogoCacheBuster(Date.now());
        } catch (err) {
            setError(err.response?.data?.message || 'Error al subir el logo');
        } finally {
            setUploadingLogo(false);
            e.target.value = '';
        }
    };

    const inputCls = `w-full rounded-xl px-3 py-2.5 text-sm border transition focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 ${
        isDark
            ? 'bg-gray-900 border-gray-700 text-white placeholder-gray-500'
            : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400'
    }`;

    const labelCls = `block text-xs font-medium mb-1.5 flex items-center gap-1.5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`;

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center py-32">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6 max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Landmark size={24} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                    <div>
                        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            Datos de la Entidad
                        </h2>
                        <p className={`text-sm mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Información institucional del sistema
                        </p>
                    </div>
                </div>

                {error && (
                    <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${
                        isDark ? 'bg-red-500/10 border border-red-500/20 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                        <AlertCircle size={15} className="flex-shrink-0" />
                        {error}
                    </div>
                )}

                {exito && (
                    <div className={`p-3 rounded-xl flex items-center gap-2 text-sm ${
                        isDark ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    }`}>
                        <CheckCircle size={15} className="flex-shrink-0" />
                        Configuración guardada correctamente
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Información general + Logo */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Campos principales */}
                        <div className={`lg:col-span-2 rounded-2xl p-6 border space-y-4 ${
                            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'
                        }`}>
                            <div className="flex items-center gap-2 mb-2">
                                <Building2 size={16} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                    Información general
                                </h3>
                            </div>

                            <div>
                                <label className={labelCls}><Type size={12} /> Nombre de la entidad *</label>
                                <input
                                    type="text"
                                    value={form.nombre}
                                    onChange={e => setForm({ ...form, nombre: e.target.value })}
                                    className={inputCls}
                                    placeholder="Ej: Alcaldía Municipal de..."
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}><Hash size={12} /> NIT</label>
                                    <input
                                        type="text"
                                        value={form.nit}
                                        onChange={e => setForm({ ...form, nit: e.target.value })}
                                        className={inputCls}
                                        placeholder="000.000.000-0"
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}><Phone size={12} /> Teléfono</label>
                                    <input
                                        type="text"
                                        value={form.telefono}
                                        onChange={e => setForm({ ...form, telefono: e.target.value })}
                                        className={inputCls}
                                        placeholder="(+57) 300 000 0000"
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}><Mail size={12} /> Correo electrónico</label>
                                    <input
                                        type="email"
                                        value={form.email}
                                        onChange={e => setForm({ ...form, email: e.target.value })}
                                        className={inputCls}
                                        placeholder="contacto@entidad.gov.co"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className={labelCls}><MapPin size={12} /> Dirección</label>
                                <input
                                    type="text"
                                    value={form.direccion}
                                    onChange={e => setForm({ ...form, direccion: e.target.value })}
                                    className={inputCls}
                                    placeholder="Calle 1 # 1-01, Ciudad"
                                />
                            </div>

                            <div>
                                <label className={labelCls}><MessageSquare size={12} /> Eslogan</label>
                                <input
                                    type="text"
                                    value={form.eslogan}
                                    onChange={e => setForm({ ...form, eslogan: e.target.value })}
                                    className={inputCls}
                                    placeholder="Ej: Trabajando por el bienestar de nuestra comunidad"
                                />
                            </div>
                        </div>

                        {/* Logo */}
                        <div className={`rounded-2xl p-6 border flex flex-col items-center gap-4 ${
                            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'
                        }`}>
                            <div className="flex items-center gap-2 w-full mb-1">
                                <ImageIcon size={16} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                                <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                    Logo institucional
                                </h3>
                            </div>

                            {/* Preview */}
                            <div className={`w-full aspect-square max-w-[180px] rounded-2xl flex items-center justify-center overflow-hidden border-2 border-dashed ${
                                isDark ? 'border-gray-600 bg-gray-900/50' : 'border-gray-200 bg-gray-50'
                            }`}>
                                {logoExiste ? (
                                    <img
                                        src={`/api/entidad-config/logo?t=${logoCacheBuster}`}
                                        alt="Logo entidad"
                                        className="w-full h-full object-contain p-3"
                                        onError={() => setLogoExiste(false)}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center gap-2 p-4">
                                        <ImageIcon size={36} className={isDark ? 'text-gray-600' : 'text-gray-300'} />
                                        <p className={`text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                            Sin logo
                                        </p>
                                    </div>
                                )}
                            </div>

                            <label className={`flex items-center justify-center gap-2 w-full cursor-pointer px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                                isDark
                                    ? 'bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 border border-indigo-500/20'
                                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                            }`}>
                                {uploadingLogo ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                                        Subiendo...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={15} />
                                        {logoExiste ? 'Reemplazar logo' : 'Subir logo'}
                                    </>
                                )}
                                <input
                                    type="file"
                                    accept=".jpg,.jpeg,.png,.webp,.svg"
                                    className="hidden"
                                    onChange={handleLogoChange}
                                    disabled={uploadingLogo}
                                />
                            </label>
                            <p className={`text-xs text-center ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                JPG, PNG, WEBP o SVG · máx. 2 MB
                            </p>
                        </div>
                    </div>

                    {/* Ubicación GPS */}
                    <div className={`rounded-2xl p-6 border ${
                        isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100 shadow-sm'
                    }`}>
                        <div className="flex items-center gap-2 mb-4">
                            <MapPin size={16} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
                            <h3 className={`font-semibold text-sm ${isDark ? 'text-white' : 'text-gray-800'}`}>
                                Ubicación GPS de la sede principal
                            </h3>
                        </div>
                        <div className="isolate">
                            <MapaPicker
                                value={{
                                    lat:      form.latitude,
                                    lng:      form.longitude,
                                    direccion: form.ubicacion_descripcion,
                                }}
                                onChange={coords => setForm({
                                    ...form,
                                    latitude:              coords.lat,
                                    longitude:             coords.lng,
                                    ubicacion_descripcion: coords.direccion,
                                })}
                            />
                        </div>
                    </div>

                    {/* Botón guardar */}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-sm font-semibold shadow-md disabled:opacity-50 transition"
                        >
                            {saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                    Guardando...
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    Guardar cambios
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
}
