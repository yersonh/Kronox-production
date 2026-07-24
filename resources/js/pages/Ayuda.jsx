import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import api from '../api/axios';
import { useTheme } from '../hooks/useTheme';
import { Download, HelpCircle, FileWarning, Loader2 } from 'lucide-react';

export default function Ayuda() {
    const { isDark } = useTheme();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [pdfUrl, setPdfUrl] = useState(null);

    useEffect(() => {
        let objectUrl = null;

        api.get('/manual-usuario', { responseType: 'blob' })
            .then(res => {
                objectUrl = URL.createObjectURL(res.data);
                setPdfUrl(objectUrl);
            })
            .catch(() => setError(true))
            .finally(() => setLoading(false));

        return () => {
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        };
    }, []);

    const descargar = () => {
        if (!pdfUrl) return;
        const a = document.createElement('a');
        a.href = pdfUrl;
        a.download = 'Manual_Usuario_Kronox.pdf';
        a.click();
    };

    return (
        <Layout>
            <div className="p-4 sm:p-6 lg:p-8 h-full flex flex-col">
                <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                            <HelpCircle className="text-indigo-600 dark:text-indigo-400" size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-gray-800 dark:text-white">Ayuda</h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Manual de usuario correspondiente a tu rol</p>
                        </div>
                    </div>

                    {pdfUrl && (
                        <button
                            onClick={descargar}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors"
                        >
                            <Download size={16} />
                            Descargar PDF
                        </button>
                    )}
                </div>

                <div className={`flex-1 rounded-xl border ${isDark ? 'border-white/10 bg-gray-800/40' : 'border-gray-200 bg-white'} overflow-hidden min-h-[70vh]`}>
                    {loading && (
                        <div className="h-full flex flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
                            <Loader2 className="animate-spin" size={28} />
                            <span>Cargando manual de usuario...</span>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6 text-gray-500 dark:text-gray-400">
                            <FileWarning size={32} />
                            <p className="font-medium text-gray-700 dark:text-gray-200">Manual no disponible</p>
                            <p className="text-sm max-w-sm">
                                Aún no hay un manual de usuario cargado para tu rol. Contacta al administrador del sistema.
                            </p>
                        </div>
                    )}

                    {!loading && !error && pdfUrl && (
                        <iframe
                            src={pdfUrl}
                            title="Manual de usuario"
                            className="w-full h-full min-h-[70vh]"
                        />
                    )}
                </div>
            </div>
        </Layout>
    );
}
