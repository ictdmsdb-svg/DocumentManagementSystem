import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireActive?: boolean;
  requireAdmin?: boolean;
}

export function ProtectedRoute({
  children,
  requireActive = true,
  requireAdmin = false,
}: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Require active user
  if (requireActive && profile && !profile.is_active) {
    return <Navigate to="/pending-approval" replace />;
  }

  // Require admin role
  if (requireAdmin && profile && profile.role !== 'admin') {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Already logged in and active
  if (user && profile?.is_active) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
