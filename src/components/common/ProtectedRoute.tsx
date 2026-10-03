import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ChangePasswordModal } from '../auth/ChangePasswordModal';
import { Scale } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const { currentUser, userProfile, isDemo, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-brand-900 border border-brand-800 flex items-center justify-center text-amber-300 animate-pulse">
          <Scale className="w-6 h-6" />
        </div>
        <p className="text-xs uppercase font-medium tracking-wider text-slate-500">
          Cargando entorno seguro...
        </p>
      </div>
    );
  }

  // Si no hay usuario autenticado y tampoco se ha activado el modo demostración
  if (!currentUser && !isDemo) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si se requiere rol de administrador y el usuario no lo es (o está en demo)
  if (requireAdmin) {
    if (isDemo || userProfile?.role !== 'admin') {
      return <Navigate to="/" replace />;
    }
  }

  return (
    <>
      {userProfile?.mustChangePassword && <ChangePasswordModal />}
      {children}
    </>
  );
};
