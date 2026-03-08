import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap, Mail, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.includes("@")) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen gradient-navy flex flex-col items-center justify-center px-6 gap-6">
        <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center animate-scale-in">
          <CheckCircle className="w-10 h-10 text-success" />
        </div>
        <div className="text-center animate-fade-in-up">
          <h2 className="text-2xl font-bold text-foreground mb-2">Check your email</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            We sent a password reset link to <span className="text-foreground font-medium">{email}</span>
          </p>
        </div>
        <Button onClick={() => navigate("/auth/login")}
          className="gradient-cyan text-[hsl(var(--navy))] font-bold rounded-xl px-8">
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
          <h1 className="text-3xl font-bold text-foreground mb-2">Forgot password?</h1>
          <p className="text-muted-foreground text-sm">Enter your email and we'll send you a reset link</p>
        </div>

        <div className="mt-10 space-y-4 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Email address</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                className="w-full pl-10 pr-4 py-3.5 glass-card rounded-xl border border-border/50 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors text-base"
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!email.includes("@") || loading}
            className="w-full h-14 gradient-cyan text-[hsl(var(--navy))] font-bold text-base rounded-xl glow-cyan hover:opacity-90 transition-all disabled:opacity-40"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Link"}
          </Button>
        </div>

        <button onClick={() => navigate("/auth/login")}
          className="mt-8 text-center text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← Back to login
        </button>
      </div>
    </div>
  );
};

export default ForgotPassword;
