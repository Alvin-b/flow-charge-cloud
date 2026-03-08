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
    // could show spinner if desired
    return null;
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  if (!profile?.is_admin) {
    // regular users are not allowed in admin area
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
