import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { TareasPage } from '../pages/TareasPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';
import { ModulosPage } from '../pages/ModulosPage';
import { UsuariosPage } from '../pages/UsuariosPage';
import { RoadmapPage } from '../pages/RoadmapPage';
import { GanttPage } from '../pages/GanttPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/modulos" element={<ModulosPage />} />
          <Route path="/tareas" element={<TareasPage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/gantt" element={<GanttPage />} />
          <Route path="/usuarios" element={<UsuariosPage />} />
          <Route path="/configuracion" element={<PlaceholderPage title="Configuración" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
