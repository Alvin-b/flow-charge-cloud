import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Zap, User, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const countryCodes = [
  { code: "+254", flag: "🇰🇪", name: "Kenya" },
  { code: "+255", flag: "🇹🇿", name: "Tanzania" },
  { code: "+256", flag: "🇺🇬", name: "Uganda" },
  { code: "+250", flag: "🇷🇼", name: "Rwanda" },
  { code: "+1", flag: "🇺🇸", name: "USA" },
  { code: "+44", flag: "🇬🇧", name: "UK" },
];

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedCode, setSelectedCode] = useState(countryCodes[0]);
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  const fullPhone = `${selectedCode.code}${phone}`;

  const handleContinue = async () => {
    if (!fullName.trim() || phone.length < 9) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: fullPhone,
      });
      if (error) throw error;
      navigate("/auth/otp", {
        state: { phone: fullPhone, fullName: fullName.trim(), isRegistration: true },
      });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const canContinue = fullName.trim().length >= 2 && phone.length >= 9;

  return (
    <div className="min-h-screen gradient-navy flex flex-col">
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-32 left-0 w-56 h-56 rounded-full bg-accent/5 blur-3xl" />

      {/* Header */}
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
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Phone Number</label>
            <div className="flex gap-2 relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 px-3 py-3 glass-card rounded-xl text-foreground min-w-[90px] border border-border/50 hover:border-primary/30 transition-colors"
              >
                <span className="text-lg">{selectedCode.flag}</span>
                <span className="text-sm font-medium">{selectedCode.code}</span>
              </button>

              {showDropdown && (
                <div className="absolute top-full left-0 mt-2 w-52 glass-card rounded-xl border border-border/50 overflow-hidden z-50 animate-scale-in">
                  {countryCodes.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => { setSelectedCode(c); setShowDropdown(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-primary/10 transition-colors text-left"
                    >
                      <span className="text-lg">{c.flag}</span>
                      <span className="text-sm text-foreground">{c.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{c.code}</span>
                    </button>
                  ))}
                </div>
              )}

              <div className="relative flex-1">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="tel"
                  placeholder="700 000 000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  className="w-full pl-10 pr-4 py-3.5 glass-card rounded-xl border border-border/50 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors text-base font-medium tracking-wider"
                />
              </div>
            </div>
          </div>

          {/* Security notice */}
          <div className="glass-card rounded-xl p-4 border border-accent/20">
            <p className="text-xs text-muted-foreground leading-relaxed">
              🔒 <span className="text-foreground font-medium">Secure Verification:</span> We'll send an OTP to verify your phone number. Your account will be bound to this device.
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
              <>Send OTP <ArrowRight className="w-5 h-5 ml-1" /></>
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-8 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          Already have an account?{" "}
          <button onClick={() => navigate("/auth/phone")} className="text-primary font-medium hover:underline">
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
