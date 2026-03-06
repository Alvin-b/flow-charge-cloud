import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Mail, ShieldCheck, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ForgotPin = () => {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"confirm" | "otp">("confirm");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const profileEmail = profile?.email;

  const maskEmail = (e: string) => {
    const [local, domain] = e.split("@");
    if (!domain) return e;
    const masked = local.length <= 2 ? "*".repeat(local.length) : local[0] + "*".repeat(local.length - 2) + local[local.length - 1];
    return `${masked}@${domain}`;
  };

  const handleSendOtp = async () => {
    if (!profileEmail) {
      toast({ title: "No email on file", description: "Please contact support to reset your PIN.", variant: "destructive" });
      return;
    }

    if (email.toLowerCase().trim() !== profileEmail.toLowerCase().trim()) {
      toast({ title: "Email doesn't match", description: "The email you entered doesn't match our records.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email: profileEmail });
      if (error) throw error;
      toast({ title: "Verification code sent", description: "Check your email for a 6-digit code." });
      setStep("otp");
    } catch (err: any) {
      toast({ title: "Failed to send code", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: profileEmail!,
        token: otp,
        type: "email",
      });
      if (error) throw error;

      // OTP verified — reset PIN
      const { error: resetErr } = await supabase.rpc("reset_pin" as any);
      if (resetErr) throw resetErr;

      await refreshProfile();

      // Clear lock state so AuthGuard redirects to PinSetup
      sessionStorage.removeItem("powerflow-unlocked");

      toast({ title: "PIN reset successful", description: "Please set a new PIN." });
      navigate("/auth/pin", { replace: true });
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-navy flex flex-col px-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-0 right-0 w-56 h-56 rounded-full bg-accent/5 blur-3xl" />

      {/* Header */}
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

      <div className="flex-1 flex flex-col items-center justify-center -mt-8">
        {step === "confirm" ? (
          <div className="w-full max-w-sm animate-fade-in-up">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center mx-auto mb-4 border border-primary/20">
                <KeyRound className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Reset your PIN</h1>
              <p className="text-muted-foreground text-sm">
                We'll send a verification code to your email
                {profileEmail ? ` (${maskEmail(profileEmail)})` : ""}
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Confirm your email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 glass-card border-border/30 text-foreground"
                  />
                </div>
              </div>

              <Button
                onClick={handleSendOtp}
                disabled={loading || !email}
                className="w-full gradient-cyan text-[hsl(var(--navy))] font-semibold h-12 rounded-xl"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Send Verification Code"
                )}
              </Button>
            </div>

            {!profileEmail && (
              <p className="text-xs text-destructive mt-4 text-center">
                No email is linked to your account. Please contact support.
              </p>
            )}
          </div>
        ) : (
          <div className="w-full max-w-sm animate-fade-in-up">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center mx-auto mb-4 border border-primary/20">
                <ShieldCheck className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Enter verification code</h1>
              <p className="text-muted-foreground text-sm">
                We sent a 6-digit code to {maskEmail(profileEmail!)}
              </p>
            </div>

            <div className="space-y-4">
              <Input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="text-center text-2xl tracking-[0.5em] font-mono glass-card border-border/30 text-foreground h-14"
              />

              <Button
                onClick={handleVerifyOtp}
                disabled={loading || otp.length !== 6}
                className="w-full gradient-cyan text-[hsl(var(--navy))] font-semibold h-12 rounded-xl"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Verify & Reset PIN"
                )}
              </Button>

              <button
                onClick={() => { setStep("confirm"); setOtp(""); }}
                className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Didn't receive the code? Try again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPin;
