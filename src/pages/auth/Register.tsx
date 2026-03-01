import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Zap, User, Mail, Lock, Eye, EyeOff, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const canContinue = fullName.trim().length >= 2 && email.includes("@") && password.length >= 6;

  const handleContinue = async () => {
    if (!canContinue) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName.trim() },
        },
      });
      if (error) throw error;

      // Create profile
      if (data.user) {
        await supabase.from("profiles").upsert({
          user_id: data.user.id,
          full_name: fullName.trim(),
          phone: phone.trim() || null,
          email: email.trim(),
        }, { onConflict: "user_id" });
      }

      toast({
        title: "Check your email",
        description: "We sent a confirmation link to verify your account.",
      });
      navigate("/auth/login");
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
          <h1 className="text-3xl font-bold text-foreground mb-1">Create account</h1>
          <p className="text-muted-foreground text-sm">Sign up to manage your energy wallet</p>
        </div>

        <div className="mt-10 space-y-4 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          {/* Full name */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Full Name</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="e.g. James Kamau"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-3.5 glass-card rounded-xl border border-border/50 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors text-base"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Phone Number (M-Pesa)</label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="tel"
                placeholder="e.g. 0712345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-10 pr-4 py-3.5 glass-card rounded-xl border border-border/50 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors text-base"
              />
            </div>
          </div>

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
                placeholder="Min 6 characters"
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

          <div className="glass-card rounded-xl p-4 border border-accent/20">
            <p className="text-xs text-muted-foreground leading-relaxed">
              🔒 <span className="text-foreground font-medium">Secure Account:</span> We'll send a confirmation email to verify your address. Your wallet will be created automatically.
            </p>
          </div>

          <Button
            onClick={handleContinue}
            disabled={!canContinue || loading}
            className="w-full h-14 gradient-cyan text-[hsl(var(--navy))] font-bold text-base rounded-xl glow-cyan hover:opacity-90 transition-all duration-200 disabled:opacity-40"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-[hsl(var(--navy))] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>Create Account <ArrowRight className="w-5 h-5 ml-1" /></>
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          Already have an account?{" "}
          <button onClick={() => navigate("/auth/login")} className="text-primary font-medium hover:underline">
            Sign in
          </button>
        </p>

        <p className="text-center text-xs text-muted-foreground mt-3 animate-fade-in-up" style={{ animationDelay: "0.35s" }}>
          By continuing, you agree to our{" "}
          <span className="text-primary">Terms of Service</span> and{" "}
          <span className="text-primary">Privacy Policy</span>
        </p>
      </div>
    </div>
  );
};

export default Register;
