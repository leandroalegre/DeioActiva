import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { LoginPage } from '../pages/LoginPage';
import { DashboardPage } from '../pages/DashboardPage';
import { TareasPage } from '../pages/TareasPage';
import { PlaceholderPage } from '../pages/PlaceholderPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/modulos" element={<PlaceholderPage title="Módulos" />} />
          <Route path="/tareas" element={<TareasPage />} />
          <Route path="/roadmap" element={<PlaceholderPage title="Roadmap" />} />
          <Route path="/gantt" element={<PlaceholderPage title="Gantt" />} />
          <Route path="/usuarios" element={<PlaceholderPage title="Usuarios" />} />
          <Route path="/configuracion" element={<PlaceholderPage title="Configuración" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
