import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Zap, Mail, RefreshCw, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const EmailConfirmWait = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const state = location.state as { email?: string; password?: string } | null;
  const email = state?.email || "";
  const password = state?.password || "";
  const [confirmed, setConfirmed] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [resending, setResending] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!email || !password) {
      navigate("/auth/register", { replace: true });
      return;
    }

    // Poll every 3 seconds: try to sign in — if it works, email is confirmed
    pollRef.current = setInterval(async () => {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (!error && data.session) {
          // Email confirmed! Session is now active.
          setConfirmed(true);
          if (pollRef.current) clearInterval(pollRef.current);
          // Small delay to show the success state, then AuthProvider takes over
          setTimeout(() => {
            navigate("/", { replace: true });
          }, 1200);
        }
      } catch {
        // Not confirmed yet — keep polling
      }
    }, 3000);

    const timer = setInterval(() => setResendTimer((t) => (t > 0 ? t - 1 : 0)), 1000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      clearInterval(timer);
    };
  }, [email, password, navigate]);

  const handleResend = async () => {
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      if (error) throw error;
      setResendTimer(30);
      toast({ title: "Email resent", description: "Check your inbox for the confirmation link." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen gradient-navy flex flex-col relative overflow-hidden">
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-32 left-0 w-56 h-56 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

      <div className="pt-12 px-6 flex items-center gap-3 animate-fade-in-up">
        <div className="w-9 h-9 rounded-xl gradient-cyan flex items-center justify-center glow-cyan shrink-0">
          <Zap className="w-5 h-5 text-[hsl(var(--navy))]" strokeWidth={2.5} />
        </div>
        <span className="text-lg font-bold text-foreground">
          Power<span className="text-primary">Flow</span>
        </span>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-8">
        {confirmed ? (
          <div className="text-center animate-scale-in">
            <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Email Confirmed!</h1>
            <p className="text-muted-foreground text-sm">Setting up your account…</p>
          </div>
        ) : (
          <>
            <div className="text-center animate-fade-in-up">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Mail className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Check your email</h1>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                We sent a confirmation link to{" "}
                <span className="text-foreground font-medium">{email}</span>
              </p>
            </div>

            {/* Waiting indicator */}
            <div className="mt-8 flex items-center gap-3 glass-card rounded-2xl px-5 py-4 border border-primary/20 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
              <p className="text-sm text-muted-foreground">
                Waiting for you to confirm your email…
              </p>
            </div>

            <p className="text-xs text-muted-foreground mt-6 text-center max-w-xs animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              Open the email and tap the confirmation link. This page will automatically continue once confirmed.
            </p>

            {/* Resend */}
            <div className="mt-8 flex items-center gap-2 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
              {resendTimer > 0 ? (
                <span className="text-sm text-muted-foreground">Resend in {resendTimer}s</span>
              ) : (
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="text-sm text-primary font-medium hover:underline disabled:opacity-50"
                >
                  {resending ? "Sending…" : "Resend confirmation email"}
                </button>
              )}
            </div>

            {/* Skip to login */}
            <button
              onClick={() => navigate("/auth/login")}
              className="mt-6 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
            >
              Already confirmed? Sign in manually
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default EmailConfirmWait;
