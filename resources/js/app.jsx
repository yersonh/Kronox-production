import '@vitejs/plugin-react/preamble';
import './bootstrap';
import '../css/app.css';
import { createRoot } from 'react-dom/client';
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

function FaviconLoader() {
    useEffect(() => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const size = 64;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d');
            ctx.beginPath();
            ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(img, 0, 0, size, size);
            let link = document.querySelector("link[rel~='icon']");
            if (!link) {
                link = document.createElement('link');
                link.rel = 'icon';
                document.head.appendChild(link);
            }
            link.type = 'image/png';
            link.href = canvas.toDataURL('image/png');
        };
        img.src = '/api/entidad-config/logo';
    }, []);
    return null;
}
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Calendario from './pages/Calendario';
import EventosList from './pages/eventos/EventosList';
import EventoForm from './pages/eventos/EventoForm';
import TareasList from './pages/tareas/TareasList';
import TareaForm from './pages/tareas/TareaForm';
import Dependencias from './pages/admin/Dependencias';
import Sectores from './pages/admin/Sectores';
import Contratistas from './pages/admin/Contratistas';
import Prioridades from './pages/admin/Prioridades';
import NivelesCargo from './pages/admin/NivelesCargo';
import TiposEvento from './pages/admin/TiposEvento';
import Salas from './pages/admin/Salas';
import Funcionarios from './pages/admin/Funcionarios';
import Usuarios from './pages/admin/Usuarios';
import EntidadConfig from './pages/admin/EntidadConfig';
import CalendarioFuncionario from './pages/CalendarioFuncionario';
import MisEventos from './pages/MisEventos';
import MisTareas from './pages/MisTareas';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import MapaEventos from './pages/admin/MapaEventos';
import ReportesLider from './pages/ReportesLider';
import Compromisos from './pages/Compromisos';
import AuxiliarInforme from './pages/AuxiliarInforme';
import Auditoria from './pages/admin/Auditoria';
import Estadisticas from './pages/admin/Estadisticas';
import Panorama from './pages/admin/Panorama';
import MapaCalor from './pages/admin/MapaCalor';
import GestionContratos from './pages/GestionContratos';
import CambiarContrasena from './pages/CambiarContrasena';
import Perfil from './pages/Perfil';

function App() {
    return (
        <>
        <FaviconLoader />
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/cambiar-contrasena" element={<PrivateRoute><CambiarContrasena /></PrivateRoute>} />
                <Route path="/" element={<Navigate to="/dashboard" />} />
                <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/calendario" element={<PrivateRoute><Calendario /></PrivateRoute>} />
                <Route path="/eventos" element={<PrivateRoute><EventosList /></PrivateRoute>} />
                <Route path="/eventos/nuevo" element={<PrivateRoute><EventoForm /></PrivateRoute>} />
                <Route path="/eventos/:id/editar" element={<PrivateRoute><EventoForm /></PrivateRoute>} />
                <Route path="/tareas" element={<PrivateRoute><TareasList /></PrivateRoute>} />
                <Route path="/tareas/nueva" element={<PrivateRoute><TareaForm /></PrivateRoute>} />
                <Route path="/tareas/:id/editar" element={<PrivateRoute><TareaForm /></PrivateRoute>} />
                <Route path="/admin/dependencias" element={<PrivateRoute><Dependencias /></PrivateRoute>} />
                <Route path="/admin/sectores" element={<PrivateRoute><Sectores /></PrivateRoute>} />
                <Route path="/admin/contratistas" element={<PrivateRoute><Contratistas /></PrivateRoute>} />
                <Route path="/admin/prioridades" element={<PrivateRoute><Prioridades /></PrivateRoute>} />
                <Route path="/admin/niveles-cargo" element={<PrivateRoute><NivelesCargo /></PrivateRoute>} />
                <Route path="/admin/tipos-evento" element={<PrivateRoute><TiposEvento /></PrivateRoute>} />
                <Route path="/admin/salas" element={<PrivateRoute><Salas /></PrivateRoute>} />
                <Route path="/admin/funcionarios" element={<PrivateRoute><Funcionarios /></PrivateRoute>} />
                <Route path="/admin/usuarios" element={<PrivateRoute><Usuarios /></PrivateRoute>} />
                <Route path="/admin/entidad" element={<PrivateRoute><EntidadConfig /></PrivateRoute>} />
                <Route path="/mapa-eventos" element={<PrivateRoute><MapaEventos /></PrivateRoute>} />
                <Route path="/perfil" element={<PrivateRoute><Perfil /></PrivateRoute>} />
                <Route path="/mi-calendario" element={<PrivateRoute><CalendarioFuncionario /></PrivateRoute>} />
                <Route path="/mis-eventos" element={<PrivateRoute><MisEventos /></PrivateRoute>} />
                <Route path="/mis-tareas" element={<PrivateRoute><MisTareas /></PrivateRoute>} />
                <Route path="/reportes-lider" element={<PrivateRoute><ReportesLider /></PrivateRoute>} />
                <Route path="/compromisos" element={<PrivateRoute><Compromisos /></PrivateRoute>} />
                <Route path="/auxiliar-informe" element={<PrivateRoute><AuxiliarInforme /></PrivateRoute>} />
                <Route path="/admin/auditoria" element={<PrivateRoute><Auditoria /></PrivateRoute>} />
                <Route path="/admin/estadisticas" element={<PrivateRoute><Estadisticas /></PrivateRoute>} />
                <Route path="/admin/panorama" element={<PrivateRoute><Panorama /></PrivateRoute>} />
                <Route path="/admin/mapa-calor" element={<PrivateRoute><MapaCalor /></PrivateRoute>} />
                <Route path="/gestion-contratos" element={<PrivateRoute><GestionContratos /></PrivateRoute>} />
            </Routes>
        </BrowserRouter>
        </>
    );
}

const container = document.getElementById('app');
if (!container._reactRoot) {
    container._reactRoot = createRoot(container);
}
container._reactRoot.render(<App />);