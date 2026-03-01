import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight, Moon, Sun, Fingerprint, Shield, Bell, HelpCircle, LogOut,
  Zap, User, Mail, Phone, Edit3, Crown, ExternalLink, X, Check, Loader2
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Sounds } from "@/lib/sounds";

const Profile = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { profile, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [biometric, setBiometric] = useState(() => localStorage.getItem("powerflow-biometric-enabled") === "true");
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [meterCount, setMeterCount] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);

  // Edit profile state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [metersRes, walletRes] = await Promise.all([
          supabase.from("meters").select("id", { count: "exact", head: true }),
          supabase.from("wallets").select("balance_kwh").maybeSingle(),
        ]);
        setMeterCount(metersRes.count ?? 0);
        setWalletBalance(walletRes.data?.balance_kwh ?? 0);
      } catch {
        // Non-critical — profile page still works
      }
    };
    fetchStats();
    // Check WebAuthn platform authenticator support
    if ("PublicKeyCredential" in window) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable?.().then(setBiometricSupported).catch(() => {});
    }
  }, []);

  const openEditProfile = () => {
    setEditName(profile?.full_name || "");
    setEditPhone(profile?.phone || "");
    setEditEmail(profile?.email || "");
    setEditOpen(true);
  };

  const saveProfile = async () => {
    if (!editName.trim()) {
      toast({ title: "Name required", description: "Please enter your full name", variant: "destructive" });
      return;
    }
    setEditSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editName.trim(),
          phone: editPhone.trim() || null,
          email: editEmail.trim() || null,
        })
        .eq("user_id", profile!.user_id);
      if (error) throw error;
      await refreshProfile();
      Sounds.success();
      toast({ title: "Profile updated" });
      setEditOpen(false);
    } catch (err: any) {
      Sounds.error();
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

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
                <button onClick={openEditProfile} className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full gradient-cyan flex items-center justify-center border-2 border-background shadow-md">
                  <Edit3 className="w-3 h-3 text-[hsl(var(--navy))]" />
                </button>
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-success border-2 border-background" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="text-lg font-bold text-foreground">{profile?.full_name || "Set your name"}</h2>
                  <Crown className="w-4 h-4 text-accent" />
                </div>
                {profile?.phone && (
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Phone className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{profile.phone}</p>
                  </div>
                )}
                {profile?.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">{profile.email}</p>
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

        <Section title="Account">
          <MenuItem icon={User} label="Edit Profile" subtitle="Update name, phone, email" onClick={openEditProfile} />
        </Section>

        <Section title="Security">
          <MenuItem icon={Shield} label="Change PIN" subtitle="Update your transaction PIN" onClick={() => navigate("/auth/pin")} />
          <MenuItem
            icon={Fingerprint}
            label="Biometric Auth"
            subtitle={biometricSupported ? "Use fingerprint or Face ID" : "Not supported on this device"}
            right={<Switch
              checked={biometric}
              disabled={!biometricSupported}
              onCheckedChange={async (v) => {
                if (v) {
                  try {
                    const userId = (await supabase.auth.getUser()).data.user?.id;
                    if (!userId) return;
                    const challenge = crypto.getRandomValues(new Uint8Array(32));
                    const credential = await navigator.credentials.create({
                      publicKey: {
                        rp: { name: "PowerFlow", id: window.location.hostname },
                        user: {
                          id: new TextEncoder().encode(userId),
                          name: profile?.phone || "user",
                          displayName: profile?.full_name || "PowerFlow User",
                        },
                        challenge,
                        pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
                        authenticatorSelection: {
                          authenticatorAttachment: "platform",
                          userVerification: "required",
                          residentKey: "preferred",
                        },
                        timeout: 60000,
                      },
                    }) as PublicKeyCredential;
                    if (credential) {
                      const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
                      localStorage.setItem("powerflow-webauthn-credential", JSON.stringify({ id: credId }));
                      localStorage.setItem("powerflow-biometric-enabled", "true");
                      setBiometric(true);
                    }
                  } catch {
                    // User cancelled or not supported
                  }
                } else {
                  localStorage.removeItem("powerflow-webauthn-credential");
                  localStorage.setItem("powerflow-biometric-enabled", "false");
                  setBiometric(false);
                }
              }}
              className="data-[state=checked]:bg-primary"
            />}
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

      {/* ── Edit Profile Modal ── */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditOpen(false)} />
          <div className="relative w-full glass-card rounded-t-3xl p-6 border-t border-primary/15 animate-slide-up max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Edit Profile</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Update your personal information</p>
              </div>
              <button onClick={() => setEditOpen(false)} className="p-2 rounded-xl hover:bg-muted/30">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. James Kamau"
                    className="w-full pl-11 pr-4 py-3.5 glass-card rounded-xl border border-border/50 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-base"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="e.g. 0712345678"
                    type="tel"
                    className="w-full pl-11 pr-4 py-3.5 glass-card rounded-xl border border-border/50 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-base"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">Used for M-Pesa payments and transfers</p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="you@example.com"
                    type="email"
                    className="w-full pl-11 pr-4 py-3.5 glass-card rounded-xl border border-border/50 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-base"
                  />
                </div>
              </div>

              <Button
                onClick={saveProfile}
                disabled={!editName.trim() || editSaving}
                className="w-full h-12 gradient-cyan text-[hsl(var(--navy))] font-bold rounded-xl disabled:opacity-40 mt-2"
              >
                {editSaving ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Check className="w-4 h-4" /> Save Changes
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="/profile" />
    </div>
  );
};

export default Profile;
