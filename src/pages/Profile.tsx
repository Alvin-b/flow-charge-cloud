import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight, Moon, Sun, Fingerprint, Shield, Bell, HelpCircle, LogOut,
  Zap, User, Mail, Phone, Edit3, Crown, ExternalLink
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import BottomNav from "@/components/BottomNav";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const Profile = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { profile, signOut } = useAuth();
  const [biometric, setBiometric] = useState(false);
  const [meterCount, setMeterCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      const [metersRes, walletRes] = await Promise.all([
        supabase.from("meters").select("id", { count: "exact", head: true }),
        supabase.from("wallets").select("balance_kwh").maybeSingle(),
      ]);
      setMeterCount(metersRes.count ?? 0);
      setWalletBalance(walletRes.data?.balance_kwh ?? 0);
    };
    fetchStats();
  }, []);

  const initials = (profile?.full_name || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth/register", { replace: true });
  };

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="animate-fade-in-up">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-2.5 px-1">{title}</p>
      <div className="glass-card-elevated rounded-2xl overflow-hidden border border-border/10">{children}</div>
    </div>
  );

  const MenuItem = ({ icon: Icon, label, right, onClick, danger = false, subtitle }: {
    icon: React.ElementType; label: string; right?: React.ReactNode; onClick?: () => void; danger?: boolean; subtitle?: string;
  }) => (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/10 transition-colors border-b border-border/10 last:border-0 text-left card-interactive">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center",
        danger ? "bg-destructive/15" : "bg-primary/8"
      )}>
        <Icon className={cn("w-4 h-4", danger ? "text-destructive" : "text-primary")} />
      </div>
      <div className="flex-1 min-w-0">
        <span className={cn("text-sm font-medium block", danger ? "text-destructive" : "text-foreground")}>{label}</span>
        {subtitle && <span className="text-[10px] text-muted-foreground">{subtitle}</span>}
      </div>
      {right ?? <ChevronRight className="w-4 h-4 text-muted-foreground/50" />}
    </button>
  );

  return (
    <div className="min-h-screen gradient-navy pb-28 relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh pointer-events-none" />
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-primary/4 blur-[100px] pointer-events-none" />

      <div className="relative px-5 pt-14 pb-2 animate-fade-in">
        <h1 className="text-xl font-bold text-foreground tracking-tight">Profile</h1>
        <p className="text-xs text-muted-foreground">Manage your account & preferences</p>
      </div>

      <div className="relative px-5 space-y-5 mt-3">
        {/* Profile hero card */}
        <div className="glass-card-elevated rounded-3xl p-6 border border-border/10 animate-fade-in-up relative overflow-hidden">
          <div className="absolute inset-0 shimmer-overlay pointer-events-none opacity-50" />
          <div className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl gradient-cyan flex items-center justify-center text-2xl font-bold text-[hsl(var(--navy))] shadow-lg shadow-primary/25">
                  {initials}
                </div>
                <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full gradient-cyan flex items-center justify-center border-2 border-background shadow-md">
                  <Edit3 className="w-3 h-3 text-[hsl(var(--navy))]" />
                </button>
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-success border-2 border-background" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-lg font-bold text-foreground">{profile?.full_name || "User"}</h2>
                  <Crown className="w-4 h-4 text-accent" />
                </div>
                {profile?.phone && (
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Mail className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{profile.phone}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-5 grid grid-cols-3 gap-2.5">
              {[
                { label: "Balance", val: `${walletBalance} kWh`, color: "text-primary" },
                { label: "Meters", val: `${meterCount} linked`, color: "text-accent" },
                { label: "PIN", val: profile?.pin_hash ? "Set ✓" : "Not set", color: profile?.pin_hash ? "text-success" : "text-destructive" },
              ].map(({ label, val, color }) => (
                <div key={label} className="bg-white/5 rounded-xl p-3 border border-white/5 text-center">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className={cn("text-sm font-bold mt-1", color)}>{val}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Section title="Security">
          <MenuItem icon={Shield} label="Change PIN" subtitle="Update your transaction PIN" onClick={() => navigate("/auth/pin")} />
          <MenuItem
            icon={Fingerprint}
            label="Biometric Auth"
            subtitle="Use fingerprint or Face ID"
            right={<Switch checked={biometric} onCheckedChange={setBiometric} className="data-[state=checked]:bg-primary" />}
          />
        </Section>

        <Section title="Linked Meters">
          <MenuItem 
            icon={Zap} 
            label="Manage Meters" 
            subtitle={`${meterCount} meter${meterCount !== 1 ? "s" : ""} connected`}
            onClick={() => navigate("/meters")} 
          />
        </Section>

        <Section title="Appearance">
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/10">
            <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center">
              {theme === "dark" ? <Moon className="w-4 h-4 text-primary" /> : <Sun className="w-4 h-4 text-accent" />}
            </div>
            <div className="flex-1">
              <span className="text-sm font-medium text-foreground block">{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
              <span className="text-[10px] text-muted-foreground">Switch app theme</span>
            </div>
            <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} className="data-[state=checked]:bg-primary" />
          </div>
        </Section>

        <Section title="Support">
          <MenuItem icon={HelpCircle} label="FAQ & Help" subtitle="Common questions answered" />
          <MenuItem icon={ExternalLink} label="Contact Support" subtitle="Get help from our team" />
        </Section>

        <Section title="Account">
          <MenuItem icon={LogOut} label="Sign Out" danger onClick={handleLogout} right={null} />
        </Section>

        <div className="text-center pb-4 pt-2">
          <p className="text-xs text-muted-foreground/50">PowerFlow v1.0.0</p>
          <p className="text-[10px] text-muted-foreground/30 mt-0.5">Made with ⚡ in Kenya</p>
        </div>
      </div>

      <BottomNav active="/profile" />
    </div>
  );
};

export default Profile;
