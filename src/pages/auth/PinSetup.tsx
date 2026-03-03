import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Fingerprint, Delete } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const hashPin = async (pin: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + "powerflow_salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

const PinSetup = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"create" | "confirm">("create");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const currentPin = step === "create" ? pin : confirmPin;
  const setCurrentPin = step === "create" ? setPin : setConfirmPin;

  const handlePress = async (digit: string) => {
    if (currentPin.length < 4) {
      const next = currentPin + digit;
      setCurrentPin(next);
      if (next.length === 4) {
        setTimeout(async () => {
          if (step === "create") {
            setStep("confirm");
          } else {
            if (next === pin) {
              // Save pin hash to profile
              setLoading(true);
              try {
                const pinHash = await hashPin(pin);
                if (user) {
                  const { error: upsertError } = await supabase
                    .from("profiles")
                    .upsert({ user_id: user.id, pin_hash: pinHash }, { onConflict: "user_id" });
                  if (upsertError) throw upsertError;
                  await refreshProfile();
                }
                // after updating the profile we can inspect the auth context
                // directly; refreshProfile has already populated the latest values.
                if (profile?.is_admin) {
                  navigate("/admin", { replace: true });
                } else {
                  navigate("/", { replace: true });
                }
              } catch (err: any) {
                toast({ title: "Error saving PIN", description: err.message, variant: "destructive" });
              } finally {
                setLoading(false);
              }
            } else {
              setError("PINs don't match. Try again.");
              setConfirmPin("");
              setTimeout(() => setError(""), 2000);
            }
          }
        }, 200);
      }
    }
  };

  const handleDelete = () => setCurrentPin(currentPin.slice(0, -1));

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"];

  return (
    <div className="min-h-screen gradient-navy flex flex-col px-6">
      <div className="absolute top-0 left-0 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />

      <div className="pt-14 flex items-center gap-3 animate-fade-in">
        <button
          onClick={() => {
            if (step === "confirm") { setStep("create"); setConfirmPin(""); }
            else navigate(-1);
          }}
          className="p-2 rounded-xl hover:bg-muted/30 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-cyan flex items-center justify-center">
            <Zap className="w-4 h-4 text-[hsl(var(--navy))]" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-foreground">Power<span className="text-primary">Flow</span></span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center -mt-8">
        {/* Step indicator */}
        <div className="flex gap-2 mb-8 animate-fade-in">
          <div className={`w-8 h-1 rounded-full transition-colors ${step === "create" ? "bg-primary" : "bg-success"}`} />
          <div className={`w-8 h-1 rounded-full transition-colors ${step === "confirm" ? "bg-primary" : "bg-border"}`} />
        </div>

        <div className="text-center mb-10 animate-fade-in-up">
          <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center mx-auto mb-4 border border-primary/20">
            <Fingerprint className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {step === "create" ? "Create your PIN" : "Confirm your PIN"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {step === "create"
              ? "Choose a 4-digit PIN to secure your wallet"
              : "Enter your PIN again to confirm"}
          </p>
        </div>

        {/* PIN dots */}
        <div className="flex gap-4 mb-2 animate-scale-in">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full transition-all duration-200 ${
                i < currentPin.length ? "bg-primary scale-110 glow-cyan" : "bg-border"
              }`}
            />
          ))}
        </div>

        {error && <p className="text-sm text-destructive mt-3 mb-2 animate-fade-in">{error}</p>}
        {loading && (
          <div className="mt-3">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-4 mt-8 w-72 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          {keys.map((key, i) => (
            <button
              key={i}
              disabled={loading}
              onClick={() => (key === "⌫" ? handleDelete() : key !== "" ? handlePress(key) : undefined)}
              className={`h-16 rounded-2xl font-semibold text-xl transition-all duration-150 active:scale-95 disabled:opacity-50 ${
                key === ""
                  ? "invisible"
                  : key === "⌫"
                  ? "glass-card text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-border/30"
                  : "glass-card text-foreground hover:bg-primary/10 hover:border-primary/30 border border-border/30 hover:text-primary"
              }`}
            >
              {key === "⌫" ? <Delete className="w-5 h-5 mx-auto" /> : key}
            </button>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-8 text-center animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          You can enable biometric authentication in Settings after setup
        </p>
      </div>
    </div>
  );
};

export default PinSetup;
