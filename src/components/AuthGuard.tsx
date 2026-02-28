import { ReactNode, useState, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import AppLockScreen from "@/components/AppLockScreen";

const UNLOCK_KEY = "powerflow-unlocked";
const BIOMETRIC_KEY = "powerflow-biometric-enabled";
const CREDENTIAL_KEY = "powerflow-webauthn-credential";

const AuthGuard = ({ children }: { children: ReactNode }) => {
  const { user, profile, loading } = useAuth();
  const [unlocked, setUnlocked] = useState(() => sessionStorage.getItem(UNLOCK_KEY) === "true");

  const handleUnlock = useCallback(() => {
    sessionStorage.setItem(UNLOCK_KEY, "true");
    setUnlocked(true);
  }, []);

  const handleBiometricAuth = useCallback(async () => {
    try {
      const storedCred = localStorage.getItem(CREDENTIAL_KEY);
      if (!storedCred || !("credentials" in navigator) || !("PublicKeyCredential" in window)) return;

      const { id: credentialId } = JSON.parse(storedCred);
      const challenge = crypto.getRandomValues(new Uint8Array(32));

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          allowCredentials: [{
            id: Uint8Array.from(atob(credentialId), c => c.charCodeAt(0)),
            type: "public-key" as const,
            transports: ["internal" as AuthenticatorTransport],
          }],
          userVerification: "required",
          timeout: 60000,
        },
      });

      if (assertion) {
        handleUnlock();
      }
    } catch {
      // Biometric failed or cancelled — user must use PIN
    }
  }, [handleUnlock]);

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

  // Show lock screen if not unlocked this session
  if (!unlocked) {
    const biometricEnabled = localStorage.getItem(BIOMETRIC_KEY) === "true";
    return (
      <AppLockScreen
        pinHash={profile.pin_hash}
        onUnlock={handleUnlock}
        biometricEnabled={biometricEnabled}
        onBiometricAuth={handleBiometricAuth}
      />
    );
  }

  return <>{children}</>;
};

export default AuthGuard;
