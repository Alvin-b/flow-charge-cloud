import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

const OTPVerify = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const phone = (location.state as any)?.phone || "+254700000000";
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(30);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputs.current[0]?.focus();
    const interval = setInterval(() => setResendTimer((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) inputs.current[index + 1]?.focus();
    if (next.every((d) => d !== "") && next.join("") === "123456") {
      setTimeout(() => navigate("/auth/pin"), 300);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = () => {
    const code = otp.join("");
    if (code.length < 6) { setError("Enter the 6-digit code"); return; }
    // Mock: accept any 6-digit code
    navigate("/auth/pin");
  };

  return (
    <div className="min-h-screen gradient-navy flex flex-col px-6">
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />

      {/* Back */}
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
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border transition-all duration-200 bg-transparent text-foreground focus:outline-none ${
                digit
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border/50 focus:border-primary/50"
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-destructive mt-3 animate-fade-in">{error}</p>
        )}

        {/* Hint for demo */}
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">Demo: use any 6 digits (e.g. 123456)</p>
        </div>

        <div className="mt-8 space-y-4 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
          <Button
            onClick={handleVerify}
            className="w-full h-14 gradient-cyan text-[hsl(var(--navy))] font-bold text-base rounded-xl glow-cyan hover:opacity-90 transition-all"
          >
            Verify & Continue
          </Button>

          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
            {resendTimer > 0 ? (
              <span className="text-sm text-muted-foreground">Resend in {resendTimer}s</span>
            ) : (
              <button
                onClick={() => setResendTimer(30)}
                className="text-sm text-primary font-medium hover:underline"
              >
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
