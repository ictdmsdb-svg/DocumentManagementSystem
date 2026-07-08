import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface RoleGuardProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  fallbackPath?: string;
}

export function RoleGuard({
  children,
  requireAdmin = false,
  fallbackPath = '/unauthorized',
}: RoleGuardProps) {
  const { profile, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to={fallbackPath} replace />;
  }

  // Check if profile is active
  if (profile && !profile.is_active) {
    return <Navigate to="/pending-approval" replace />;
  }

  return <>{children}</>;
}

interface PermissionGuardProps {
  children: React.ReactNode;
  hasPermission: (() => Promise<boolean>) | boolean;
  fallback?: React.ReactNode;
}

export function PermissionGuard({
  children,
  hasPermission,
  fallback = null,
}: PermissionGuardProps) {
  const { isAdmin } = useAuth();

  // Admin always has access
  if (isAdmin) {
    return <>{children}</>;
  }

  // Check permission
  if (typeof hasPermission === 'boolean' && hasPermission) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

// Component for showing content only to admins
export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return null;
  }

  return <>{children}</>;
}
