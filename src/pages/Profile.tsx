import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Moon, Sun, Fingerprint, Shield, Bell, HelpCircle, LogOut, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import BottomNav from "@/components/BottomNav";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

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
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 px-1">{title}</p>
      <div className="glass-card rounded-2xl overflow-hidden border border-border/20">{children}</div>
    </div>
  );

  const MenuItem = ({ icon: Icon, label, right, onClick, danger = false }: {
    icon: React.ElementType; label: string; right?: React.ReactNode; onClick?: () => void; danger?: boolean;
  }) => (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-4 py-4 hover:bg-muted/20 transition-colors border-b border-border/20 last:border-0 text-left">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${danger ? "bg-destructive/15" : "bg-muted/30"}`}>
        <Icon className={`w-4.5 h-4.5 ${danger ? "text-destructive" : "text-muted-foreground"}`} />
      </div>
      <span className={`flex-1 text-sm font-medium ${danger ? "text-destructive" : "text-foreground"}`}>{label}</span>
      {right ?? <ChevronRight className="w-4 h-4 text-muted-foreground" />}
    </button>
  );

  return (
    <div className="min-h-screen gradient-navy pb-24">
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="px-5 pt-14 pb-4 animate-fade-in">
        <h1 className="text-xl font-bold text-foreground">Profile & Settings</h1>
      </div>

      <div className="px-5 space-y-5">
        {/* Profile card */}
        <div className="glass-card rounded-2xl p-5 border border-border/20 animate-fade-in-up">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl gradient-cyan flex items-center justify-center text-2xl font-bold text-[hsl(var(--navy))]">
                {initials}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success border-2 border-background" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-foreground">{profile?.full_name || "User"}</h2>
              <p className="text-sm text-muted-foreground">{profile?.phone || ""}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "Balance", val: `${walletBalance} kWh` },
              { label: "Meters", val: `${meterCount} linked` },
              { label: "PIN", val: profile?.pin_hash ? "Set ✓" : "Not set" },
            ].map(({ label, val }) => (
              <div key={label} className="glass rounded-xl p-2.5 border border-white/5 text-center">
                <p className="text-[9px] text-muted-foreground uppercase">{label}</p>
                <p className="text-xs font-bold text-foreground mt-0.5">{val}</p>
              </div>
            ))}
          </div>
        </div>

        <Section title="Security">
          <MenuItem icon={Shield} label="Change PIN" onClick={() => navigate("/auth/pin")} />
          <MenuItem
            icon={Fingerprint}
            label="Biometric Auth"
            right={<Switch checked={biometric} onCheckedChange={setBiometric} className="data-[state=checked]:bg-primary" />}
          />
        </Section>

        <Section title="Linked Meters">
          <MenuItem icon={Zap} label="Manage Meters" right={<span className="text-xs text-muted-foreground mr-2">{meterCount} linked</span>} onClick={() => navigate("/meters")} />
        </Section>

        <Section title="App Settings">
          <div className="flex items-center gap-3 px-4 py-4 border-b border-border/20">
            <div className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center">
              {theme === "dark" ? <Moon className="w-4.5 h-4.5 text-muted-foreground" /> : <Sun className="w-4.5 h-4.5 text-muted-foreground" />}
            </div>
            <span className="flex-1 text-sm font-medium text-foreground">{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
            <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} className="data-[state=checked]:bg-primary" />
          </div>
        </Section>

        <Section title="Support">
          <MenuItem icon={HelpCircle} label="FAQ & Help" />
          <MenuItem icon={HelpCircle} label="Contact Support" />
        </Section>

        <Section title="Account">
          <MenuItem icon={LogOut} label="Logout" danger onClick={handleLogout} right={null} />
        </Section>

        <p className="text-center text-xs text-muted-foreground pb-2">PowerFlow v1.0.0 · Made with ⚡ in Kenya</p>
      </div>

      <BottomNav active="/profile" />
    </div>
  );
};

export default Profile;
