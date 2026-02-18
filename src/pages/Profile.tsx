import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, Moon, Sun, Fingerprint, Shield, Bell, HelpCircle, LogOut, Zap, ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import BottomNav from "@/components/BottomNav";
import { useTheme } from "@/components/ThemeProvider";

const Profile = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [biometric, setBiometric] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({
    lowBalance: true,
    meterOffline: true,
    paymentConfirmed: true,
    abnormalUsage: false,
    overconsumption: true,
  });

  const toggleNotif = (key: keyof typeof notifPrefs) =>
    setNotifPrefs((p) => ({ ...p, [key]: !p[key] }));

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
                JK
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-success border-2 border-background" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-foreground">James Kamau</h2>
                <span className="text-[10px] bg-primary/20 text-primary rounded-full px-2 py-0.5 font-bold">PRO</span>
              </div>
              <p className="text-sm text-muted-foreground">+254 712 345 678</p>
              <p className="text-xs text-muted-foreground mt-0.5">Member since Jan 2024</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: "Balance", val: "87.4 kWh" },
              { label: "Meters", val: "2 linked" },
              { label: "Transfers", val: "KES 4.2K" },
            ].map(({ label, val }) => (
              <div key={label} className="glass rounded-xl p-2.5 border border-white/5 text-center">
                <p className="text-[9px] text-muted-foreground uppercase">{label}</p>
                <p className="text-xs font-bold text-foreground mt-0.5">{val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Security */}
        <Section title="Security">
          <MenuItem icon={Shield} label="Change PIN" />
          <MenuItem
            icon={Fingerprint}
            label="Biometric Auth"
            right={
              <Switch
                checked={biometric}
                onCheckedChange={setBiometric}
                className="data-[state=checked]:bg-primary"
              />
            }
          />
          <MenuItem icon={Shield} label="Active Sessions" right={<span className="text-xs text-primary mr-2">2 devices</span>} />
        </Section>

        {/* Meters */}
        <Section title="Linked Meters">
          <MenuItem icon={Zap} label="Manage Meters" right={<span className="text-xs text-muted-foreground mr-2">2 linked</span>}
            onClick={() => navigate("/meters")} />
        </Section>

        {/* Notifications */}
        <Section title="Notification Preferences">
          {[
            { key: "lowBalance", icon: "🟡", label: "Low Balance Alert" },
            { key: "meterOffline", icon: "🔴", label: "Meter Offline" },
            { key: "paymentConfirmed", icon: "🟢", label: "Payment Confirmed" },
            { key: "abnormalUsage", icon: "🟠", label: "Abnormal Usage" },
            { key: "overconsumption", icon: "⚪", label: "Overconsumption Warning" },
          ].map(({ key, icon, label }) => (
            <div key={key} className="flex items-center gap-3 px-4 py-3.5 border-b border-border/20 last:border-0">
              <span className="text-lg">{icon}</span>
              <span className="flex-1 text-sm font-medium text-foreground">{label}</span>
              <Switch
                checked={notifPrefs[key as keyof typeof notifPrefs]}
                onCheckedChange={() => toggleNotif(key as keyof typeof notifPrefs)}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          ))}
        </Section>

        {/* App settings */}
        <Section title="App Settings">
          <div className="flex items-center gap-3 px-4 py-4 border-b border-border/20">
            <div className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center">
              {theme === "dark" ? <Moon className="w-4.5 h-4.5 text-muted-foreground" /> : <Sun className="w-4.5 h-4.5 text-muted-foreground" />}
            </div>
            <span className="flex-1 text-sm font-medium text-foreground">{theme === "dark" ? "Dark Mode" : "Light Mode"}</span>
            <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} className="data-[state=checked]:bg-primary" />
          </div>
          <div className="px-4 py-4">
            <p className="text-xs text-muted-foreground mb-2">Transaction Limits</p>
            <div className="space-y-1">
              <div className="flex justify-between"><span className="text-xs text-muted-foreground">Daily transfer limit</span><span className="text-xs font-medium text-foreground">50 kWh</span></div>
              <div className="flex justify-between"><span className="text-xs text-muted-foreground">Daily recharge limit</span><span className="text-xs font-medium text-foreground">KES 10,000</span></div>
            </div>
          </div>
        </Section>

        {/* Help */}
        <Section title="Support">
          <MenuItem icon={HelpCircle} label="FAQ & Help" />
          <MenuItem icon={HelpCircle} label="Contact Support" />
          <MenuItem icon={HelpCircle} label="Report an Issue" />
        </Section>

        {/* Logout */}
        <Section title="Account">
          <MenuItem
            icon={LogOut}
            label="Logout"
            danger
            onClick={() => navigate("/auth/phone")}
            right={null}
          />
        </Section>

        <p className="text-center text-xs text-muted-foreground pb-2">PowerFlow v1.0.0 · Made with ⚡ in Kenya</p>
      </div>

      <BottomNav active="/profile" />
    </div>
  );
};

export default Profile;
