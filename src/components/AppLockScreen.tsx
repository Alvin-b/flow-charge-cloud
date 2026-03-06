import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Fingerprint, Delete } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sounds } from "@/lib/sounds";
import { supabase } from "@/integrations/supabase/client";

interface AppLockScreenProps {
  onUnlock: () => void;
  biometricEnabled: boolean;
  onBiometricAuth: () => void;
}

const hashPin = async (pin: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + "powerflow_salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

const AppLockScreen = ({ onUnlock, biometricEnabled, onBiometricAuth }: AppLockScreenProps) => {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const [biometricAttempted, setBiometricAttempted] = useState(false);
  const [biometricFailed, setBiometricFailed] = useState(false);

  // Auto-trigger biometric immediately on mount if enabled
  useEffect(() => {
    if (biometricEnabled && !biometricAttempted) {
      setBiometricAttempted(true);
      handleBiometricAuth();
    }
  }, [biometricEnabled, biometricAttempted]);

  const handleBiometricAuth = async () => {
    try {
      await onBiometricAuth();
      // If we get here without error, biometric succeeded
      // onBiometricAuth should call onUnlock() on success
    } catch (err) {
      console.log("Biometric auth failed or cancelled:", err);
      setBiometricFailed(true);
      setError("Biometric failed. Please use PIN.");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handlePress = async (digit: string) => {
    if (pin.length >= 4) return;
    Sounds.keypress();
    const next = pin + digit;
    setPin(next);

    if (next.length === 4) {
      const hash = await hashPin(next);
      const { data: isValid } = await supabase.rpc("verify_pin", { p_pin_hash: hash });
      if (isValid) {
        Sounds.success();
        // Dismiss any pending biometric prompt by unmounting immediately
        onUnlock();
        return;
      } else {
        Sounds.error();
        setShaking(true);
        setError("Wrong PIN. Try again.");
        setTimeout(() => {
          setPin("");
          setShaking(false);
          setError("");
        }, 600);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError("");
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div className="min-h-screen gradient-navy flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-56 h-56 rounded-full bg-accent/5 blur-3xl" />

      {/* Logo */}
      <div className="flex items-center gap-2 mb-10 animate-fade-in">
        <div className="w-10 h-10 rounded-xl gradient-cyan flex items-center justify-center glow-cyan">
          <Zap className="w-6 h-6 text-[hsl(var(--navy))]" strokeWidth={2.5} />
        </div>
        <span className="text-xl font-bold text-foreground">
          Power<span className="text-primary">Flow</span>
        </span>
      </div>

      {/* Title */}
      <div className="text-center mb-8 animate-fade-in-up">
        <h1 className="text-2xl font-bold text-foreground mb-1">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Enter your PIN to unlock</p>
      </div>

      {/* PIN dots */}
      <div className={cn("flex gap-4 mb-3", shaking && "animate-shake")}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "w-4 h-4 rounded-full transition-all duration-200",
              i < pin.length
                ? error
                  ? "bg-destructive scale-110"
                  : "bg-primary scale-110 glow-cyan"
                : "bg-border"
            )}
          />
        ))}
      </div>

      {error && <p className="text-sm text-destructive mb-2 animate-fade-in">{error}</p>}
      {!error && <div className="h-6 mb-2" />}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-4 w-72 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        {keys.map((key, i) => (
          <button
            key={i}
            onClick={() =>
              key === "⌫" ? handleDelete() : key !== "" ? handlePress(key) : undefined
            }
            className={cn(
              "h-16 rounded-2xl font-semibold text-xl transition-all duration-150 active:scale-95",
              key === ""
                ? "invisible"
                : key === "⌫"
                ? "glass-card text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-border/30"
                : "glass-card text-foreground hover:bg-primary/10 hover:border-primary/30 border border-border/30 hover:text-primary"
            )}
          >
            {key === "⌫" ? <Delete className="w-5 h-5 mx-auto" /> : key}
          </button>
        ))}
      </div>

      {/* Biometric button */}
      {biometricEnabled && (
        <button
          onClick={handleBiometricAuth}
          className="mt-8 flex items-center gap-2 text-primary hover:text-primary/80 transition-colors animate-fade-in-up"
          style={{ animationDelay: "0.2s" }}
        >
          <Fingerprint className="w-6 h-6" />
          <span className="text-sm font-medium">
            {biometricFailed ? "Try Biometric Again" : "Use Biometric"}
          </span>
        </button>
      )}

      {/* Forgot PIN */}
      <button
        onClick={() => navigate("/auth/forgot-pin")}
        className="mt-4 text-sm text-muted-foreground hover:text-primary transition-colors animate-fade-in-up"
        style={{ animationDelay: "0.3s" }}
      >
        Forgot PIN?
      </button>
    </div>
  );
};

export default AppLockScreen;
