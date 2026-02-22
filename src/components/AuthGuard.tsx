import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const AuthGuard = ({ children }: { children: ReactNode }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen gradient-navy flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth/login" replace />;

  // If logged in but no PIN set yet, redirect to PIN setup
  if (!profile?.pin_hash) return <Navigate to="/auth/pin" replace />;

  return <>{children}</>;
};

export default AuthGuard;
