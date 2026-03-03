import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Zap, RefreshCw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const OTPVerify = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const state = location.state as { phone: string; fullName?: string; isRegistration?: boolean } | null;
  const phone = state?.phone || "";
  const fullName = state?.fullName || "";
  const isRegistration = state?.isRegistration ?? false;

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(30);
  const [loading, setLoading] = useState(false);
  const [autoDetecting, setAutoDetecting] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (!phone) {
      navigate("/auth/register");
      return;
    }
    inputs.current[0]?.focus();
    const interval = setInterval(() => setResendTimer((t) => (t > 0 ? t - 1 : 0)), 1000);

    // Web OTP API for auto-detection
    if ("OTPCredential" in window) {
      setAutoDetecting(true);
      const ac = new AbortController();
      (navigator.credentials.get as any)({
        otp: { transport: ["sms"] },
        signal: ac.signal,
      })
        .then((cred: any) => {
          if (cred && cred.code) {
            const digits = cred.code.slice(0, 6).split("");
            const padded = [...digits, ...Array(6 - digits.length).fill("")];
            setOtp(padded);
            setAutoDetecting(false);
            handleVerifyCode(cred.code);
          }
        })
        .catch(() => setAutoDetecting(false));

      return () => {
        clearInterval(interval);
        ac.abort();
      };
    }

    return () => clearInterval(interval);
  }, [phone]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) inputs.current[index + 1]?.focus();
    if (next.every((d) => d !== "")) {
      handleVerifyCode(next.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
    // Handle paste
    if (e.key === "v" && (e.ctrlKey || e.metaKey)) return;
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      const digits = pasted.split("");
      const next = [...Array(6)].map((_, i) => digits[i] || "");
      setOtp(next);
      if (pasted.length === 6) handleVerifyCode(pasted);
      else inputs.current[pasted.length]?.focus();
    }
  };

  const handleVerifyCode = async (code: string) => {
    if (code.length < 6) { setError("Enter the 6-digit code"); return; }
    if (!phone) return;
    setLoading(true);
    setError("");
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone,
        token: code,
        type: "sms",
      });
      if (verifyError) throw verifyError;

      // If registration, create profile
      if (isRegistration && data.user) {
        const { error: profileError } = await supabase.rpc("upsert_profile", {
          p_full_name: fullName,
          p_phone: phone,
          p_email: null,
        });
        if (profileError) console.error("Profile create error:", profileError);
      }

      navigate("/auth/pin", { replace: true });
    } catch (err: any) {
      setError(err.message || "Invalid code. Try again.");
      setOtp(["", "", "", "", "", ""]);
      setTimeout(() => inputs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) throw error;
      setResendTimer(30);
      toast({ title: "OTP sent", description: "A new code has been sent to your phone." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleVerify = () => handleVerifyCode(otp.join(""));

  return (
    <div className="min-h-screen gradient-navy flex flex-col px-6">
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />

      <div className="pt-14 flex items-center gap-3 animate-fade-in">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted/30 transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-cyan flex items-center justify-center">
            <Zap className="w-4 h-4 text-[hsl(var(--navy))]" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-foreground">Power<span className="text-primary">Flow</span></span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center -mt-12">
        <div className="animate-fade-in-up">
          <h1 className="text-3xl font-bold text-foreground mb-2">Verify your number</h1>
          <p className="text-muted-foreground text-sm">
            We sent a 6-digit code to{" "}
            <span className="text-foreground font-medium">{phone}</span>
          </p>
        </div>

        {/* Auto-detect badge */}
        {autoDetecting && (
          <div className="mt-4 flex items-center gap-2 glass-card rounded-xl px-4 py-3 border border-primary/20 animate-fade-in">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-primary font-medium">Waiting for SMS to auto-fill…</p>
          </div>
        )}

        {/* OTP inputs */}
        <div className="mt-10 flex justify-center gap-3 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => (inputs.current[i] = el)}
              type="tel"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              autoComplete={i === 0 ? "one-time-code" : "off"}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={i === 0 ? handlePaste : undefined}
              className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border transition-all duration-200 bg-transparent text-foreground focus:outline-none ${
                digit
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 focus:border-primary/50"
              } ${loading ? "opacity-50" : ""}`}
              disabled={loading}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-destructive mt-3 animate-fade-in">{error}</p>
        )}

        <div className="mt-8 space-y-4 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
          <Button
            onClick={handleVerify}
            disabled={loading || otp.some(d => !d)}
            className="w-full h-14 gradient-cyan text-[hsl(var(--navy))] font-bold text-base rounded-xl glow-cyan hover:opacity-90 transition-all"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-[hsl(var(--navy))] border-t-transparent rounded-full animate-spin" />
            ) : (
              <><ShieldCheck className="w-5 h-5 mr-2" /> Verify & Continue</>
            )}
          </Button>

          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
            {resendTimer > 0 ? (
              <span className="text-sm text-muted-foreground">Resend in {resendTimer}s</span>
            ) : (
              <button onClick={handleResend} className="text-sm text-primary font-medium hover:underline">
                Resend OTP
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPVerify;
