import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Zap, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const canContinue = email.includes("@") && password.length >= 6;

  const handleLogin = async () => {
    if (!canContinue) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      // AuthProvider's onAuthStateChange will handle session + profile loading.
      // Just navigate — AuthGuard will wait for loading to finish.
      navigate("/", { replace: true });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen gradient-navy flex flex-col">
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-32 left-0 w-56 h-56 rounded-full bg-accent/5 blur-3xl" />

      <div className="pt-16 px-6 flex items-center gap-3 animate-fade-in-up">
        <div className="w-9 h-9 rounded-xl gradient-cyan flex items-center justify-center glow-cyan">
          <Zap className="w-5 h-5 text-[hsl(var(--navy))]" strokeWidth={2.5} />
        </div>
        <span className="text-lg font-bold text-foreground">
          Power<span className="text-primary">Flow</span>
        </span>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6 -mt-8">
        <div className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back</h1>
          <p className="text-muted-foreground">Sign in to your energy wallet</p>
        </div>

        <div className="mt-10 space-y-4 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          {/* Email */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3.5 glass-card rounded-xl border border-border/50 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors text-base"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3.5 glass-card rounded-xl border border-border/50 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors text-base"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex justify-end">
            <button onClick={() => navigate("/auth/forgot-password")}
              className="text-xs text-primary hover:underline transition-colors">
              Forgot password?
            </button>
          </div>

          <Button
            onClick={handleLogin}
            disabled={!canContinue || loading}
            className="w-full h-14 gradient-cyan text-[hsl(var(--navy))] font-bold text-base rounded-xl glow-cyan hover:opacity-90 transition-all duration-200 disabled:opacity-40"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-[hsl(var(--navy))] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>Sign In <ArrowRight className="w-5 h-5 ml-1" /></>
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          Don't have an account?{" "}
          <button onClick={() => navigate("/auth/register")} className="text-primary font-medium hover:underline">
            Sign up
          </button>
        </p>
      </div>
    </div>
  );
};

export default Login;
