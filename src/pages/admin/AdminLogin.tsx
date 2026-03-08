import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Mail, Lock, Eye, EyeOff, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function AdminLogin() {
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

      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      if (!userId) throw new Error("Login failed");

      // Check admin status via user_roles + profiles
      const [{ data: roleRow }, { data: profileRow }] = await Promise.all([
        supabase
          .from("user_roles" as any)
          .select("role")
          .eq("user_id", userId)
          .eq("role", "admin")
          .maybeSingle(),
        supabase
          .from("profiles_safe" as any)
          .select("is_admin")
          .eq("user_id", userId)
          .maybeSingle() as any,
      ]);

      const isAdmin = !!roleRow || !!(profileRow as any)?.is_admin;

      if (!isAdmin) {
        await supabase.auth.signOut();
        toast({ title: "Access Denied", description: "This account does not have admin privileges.", variant: "destructive" });
        return;
      }

      navigate("/admin/dashboard", { replace: true });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <span className="text-lg font-bold text-foreground">
              Power<span className="text-primary">Flow</span> Admin
            </span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Admin Portal</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in with your admin credentials</p>
        </div>

        {/* Form */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4 shadow-lg">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="email"
                placeholder="admin@powerflow.co.ke"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                className="w-full pl-10 pr-12 py-3 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            onClick={handleLogin}
            disabled={!canContinue || loading}
            className="w-full h-12 font-semibold rounded-xl"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Sign In to Admin
              </>
            )}
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Not an admin?{" "}
          <button onClick={() => navigate("/auth/login")} className="text-primary font-medium hover:underline">
            Go to client app
          </button>
        </p>
      </div>
    </div>
  );
}
