import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface AdminGuardProps {
  children: ReactNode;
}

/**
 * Guard that only allows users marked as `is_admin` to access its children.
 *
 * This component deliberately does *not* enforce the PIN/unlock flow because
 * the admin portal may be managed by a separate credential or staff device.
 * If you want to require a PIN for admins as well, wrap this component with
 * `AuthGuard` or add the same logic here.
 */
export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  // Profile is still null (shouldn't happen after loading=false, but guard anyway)
  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile.is_admin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
