import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Zap, Lock, Eye, EyeOff, CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // Check if this is a recovery flow from the URL hash
    const hash = window.location.hash;
    if (hash.includes("type=recovery")) {
      setIsRecovery(true);
    }

    // Listen for PASSWORD_RECOVERY event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async () => {
    if (password.length < 6) {
      toast({ title: "Too short", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Mismatch", description: "Passwords do not match", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      toast({ title: "Password updated!", description: "You can now sign in with your new password." });
      setTimeout(() => navigate("/auth/login", { replace: true }), 2000);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen gradient-navy flex flex-col items-center justify-center px-6 gap-6">
        <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center animate-scale-in">
          <CheckCircle className="w-10 h-10 text-success" />
        </div>
        <div className="text-center animate-fade-in-up">
          <h2 className="text-2xl font-bold text-foreground mb-2">Password Updated!</h2>
          <p className="text-muted-foreground text-sm">Redirecting to sign in…</p>
        </div>
      </div>
    );
  }

  if (!isRecovery) {
    return (
      <div className="min-h-screen gradient-navy flex flex-col items-center justify-center px-6 gap-6">
        <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
          <Lock className="w-10 h-10 text-destructive" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Invalid Link</h2>
          <p className="text-muted-foreground text-sm max-w-xs">This password reset link is invalid or has expired. Please request a new one.</p>
        </div>
        <Button onClick={() => navigate("/auth/login")} className="gradient-cyan text-[hsl(var(--navy))] font-bold rounded-xl">
          Back to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-navy flex flex-col">
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />

      <div className="pt-14 px-6 flex items-center gap-3 animate-fade-in">
        <button onClick={() => navigate("/auth/login")} className="p-2 rounded-xl hover:bg-muted/30 transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg gradient-cyan flex items-center justify-center">
            <Zap className="w-4 h-4 text-[hsl(var(--navy))]" strokeWidth={2.5} />
          </div>
          <span className="font-bold text-foreground">Power<span className="text-primary">Flow</span></span>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 -mt-8">
        <div className="animate-fade-in-up">
          <h1 className="text-3xl font-bold text-foreground mb-2">Set new password</h1>
          <p className="text-muted-foreground text-sm">Choose a strong password for your account</p>
        </div>

        <div className="mt-10 space-y-4 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">New Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3.5 glass-card rounded-xl border border-border/50 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors text-base"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3.5 glass-card rounded-xl border border-border/50 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors text-base"
              />
            </div>
          </div>

          <Button
            onClick={handleReset}
            disabled={!password || !confirmPassword || loading}
            className="w-full h-14 gradient-cyan text-[hsl(var(--navy))] font-bold text-base rounded-xl glow-cyan hover:opacity-90 transition-all disabled:opacity-40"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-[hsl(var(--navy))] border-t-transparent rounded-full animate-spin" />
            ) : (
              "Update Password"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
