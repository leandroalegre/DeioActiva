import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isPathAllowedFor, scopedPathsFor } from '../../config/roles';
import { useAuth } from './AuthContext';

export function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Cargando...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Perfil acotado (ej. "reuniones"): cualquier otra ruta lo lleva a su seccion.
  if (!isPathAllowedFor(user.role.code, location.pathname)) {
    const home = scopedPathsFor(user.role.code)?.[0] ?? '/';
    return <Navigate to={home} replace />;
  }

  return <Outlet />;
}
