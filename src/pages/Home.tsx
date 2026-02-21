import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Zap, TrendingUp, TrendingDown, ArrowRight, Battery, Wifi, WifiOff, Lightbulb, AlertCircle } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Wallet {
  balance_kwh: number;
  max_kwh: number;
}

interface Meter {
  id: string;
  name: string;
  property_name: string | null;
  status: string;
  tuya_device_id: string;
  balance_kwh: number;
  max_kwh: number;
  rate_kwh_hr: number | null;
  last_sync: string | null;
  sms_fallback: boolean;
}

const EnergyGauge = ({ balance, max }: { balance: number; max: number }) => {
  const pct = max > 0 ? Math.min(100, Math.round((balance / max) * 100)) : 0;
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * pct) / 100;
  const isLow = pct < 20;
  const color = isLow ? "hsl(var(--destructive))" : "hsl(var(--primary))";

  return (
    <div className="flex flex-col items-center">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="10" />
        <circle
          cx="64" cy="64" r={r} fill="none"
          stroke={color}
          strokeWidth="10" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 64 64)"
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)", filter: `drop-shadow(0 0 6px ${color})` }}
        />
        <text x="64" y="58" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="20" fontWeight="700">{pct}%</text>
        <text x="64" y="73" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="9">of capacity</text>
        <text x="64" y="85" textAnchor="middle" fill={isLow ? "hsl(var(--destructive))" : "hsl(var(--primary))"} fontSize="9" fontWeight="600">
          {balance} kWh
        </text>
      </svg>
    </div>
  );
};

const Home = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { profile } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [meters, setMeters] = useState<Meter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [walletRes, metersRes] = await Promise.all([
        supabase.from("wallets").select("*").maybeSingle(),
        supabase.from("meters").select("*").order("created_at", { ascending: false }),
      ]);
      setWallet(walletRes.data ?? { balance_kwh: 0, max_kwh: 200 });
      setMeters(metersRes.data ?? []);
      setLoading(false);
    };
    fetchData();
  }, []);

  const balance = wallet?.balance_kwh ?? 0;
  const max = wallet?.max_kwh ?? 200;
  const pct = max > 0 ? Math.min(100, Math.round((balance / max) * 100)) : 0;
  const isLow = pct < 20;
  const dailyAvg = 7.2; // TODO: compute from real usage logs
  const daysLeft = dailyAvg > 0 ? Math.round(balance / dailyAvg) : 0;

  const firstName = profile?.full_name?.split(" ")[0] || "User";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning ☀️" : hour < 17 ? "Good afternoon 🌤️" : "Good evening 🌙";

  const activeMeter = meters[0];

  if (loading) {
    return (
      <div className="min-h-screen gradient-navy flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen pb-24 relative", theme === "dark" ? "gradient-navy" : "bg-background")}>
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute top-60 left-0 w-60 h-60 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center justify-between animate-fade-in">
        <div>
          <p className="text-muted-foreground text-sm">{greeting}</p>
          <h2 className="text-xl font-bold text-foreground">{firstName}</h2>
        </div>
        <button
          onClick={() => navigate("/notifications")}
          className="relative p-2.5 glass-card rounded-xl border border-border/30"
        >
          <Bell className="w-5 h-5 text-foreground" />
        </button>
      </div>

      <div className="px-5 space-y-4">
        {/* Wallet card */}
        <div
          className="relative overflow-hidden rounded-2xl p-5 animate-fade-in-up"
          style={{
            background: "linear-gradient(135deg, hsl(228, 50%, 14%) 0%, hsl(210, 60%, 18%) 50%, hsl(191, 50%, 16%) 100%)",
            border: "1px solid rgba(0, 212, 255, 0.15)",
            boxShadow: "0 8px 40px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <div className="absolute inset-0 opacity-20" style={{ background: "linear-gradient(105deg, transparent 40%, rgba(0,212,255,0.12) 50%, transparent 60%)" }} />

          <div className="relative flex items-center gap-5">
            <EnergyGauge balance={balance} max={max} />
            <div className="flex-1">
              <p className="text-xs text-primary/70 uppercase tracking-widest mb-1">Energy Wallet</p>
              <div className="flex items-end gap-1.5 mb-0.5">
                <span className={`text-5xl font-bold glow-cyan-text ${isLow ? "text-destructive" : "text-foreground"}`}>{pct}</span>
                <span className="text-primary font-semibold text-xl mb-1.5">%</span>
              </div>
              <p className="text-muted-foreground text-xs">{balance} kWh · ≈ KES {(balance * 20.43).toFixed(0)}</p>

              {isLow && (
                <div className="flex items-center gap-1.5 mt-2 bg-destructive/15 rounded-lg px-2.5 py-1.5 border border-destructive/20">
                  <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                  <p className="text-[10px] text-destructive font-medium">Low balance — recharge now</p>
                </div>
              )}

              <div className="flex gap-2 mt-3">
                <div className="glass rounded-lg px-2.5 py-1.5 border border-white/5">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Battery className="w-3 h-3 text-success" />
                    <span className="text-[9px] text-muted-foreground uppercase">Est.</span>
                  </div>
                  <span className="text-base font-bold text-success">{daysLeft}d</span>
                </div>
                <div className="glass rounded-lg px-2.5 py-1.5 border border-white/5">
                  <div className="flex items-center gap-1 mb-0.5">
                    <TrendingDown className="w-3 h-3 text-primary" />
                    <span className="text-[9px] text-muted-foreground uppercase">Avg</span>
                  </div>
                  <span className="text-base font-bold text-foreground">{dailyAvg} <span className="text-[9px]">kWh</span></span>
                </div>
                <div className="glass rounded-lg px-2.5 py-1.5 border border-white/5">
                  <div className="flex items-center gap-1 mb-0.5">
                    <TrendingUp className="w-3 h-3 text-accent" />
                    <span className="text-[9px] text-muted-foreground uppercase">Meters</span>
                  </div>
                  <span className="text-base font-bold text-accent">{meters.length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active meter or empty state */}
        {activeMeter ? (
          <div className="glass-card rounded-2xl p-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{activeMeter.name}</p>
                    <span className={`flex items-center gap-1 text-[10px] rounded-full px-2 py-0.5 ${
                      activeMeter.status === "online" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                    }`}>
                      {activeMeter.status === "online" ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                      {activeMeter.status === "online" ? "Online" : "Offline"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground/70 font-mono mt-0.5">{activeMeter.tuya_device_id.slice(0, 16)}…</p>
                  {activeMeter.property_name && (
                    <p className="text-xs text-muted-foreground mt-0.5">{activeMeter.property_name}</p>
                  )}
                </div>
              </div>
              <button onClick={() => navigate("/meters")} className="text-primary">
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => navigate("/meters")}
            className="glass-card rounded-2xl p-5 w-full text-center animate-fade-in-up border-2 border-dashed border-primary/20 hover:border-primary/40 transition-all"
            style={{ animationDelay: "0.1s" }}
          >
            <Zap className="w-8 h-8 text-primary/50 mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">No meters linked</p>
            <p className="text-xs text-muted-foreground mt-1">Tap to add your first Tuya smart meter</p>
          </button>
        )}

        {/* Smart insight */}
        <div className="flex gap-3 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          <div className="glass-card rounded-2xl p-4 flex-1 flex flex-col justify-between border-l-2 border-accent">
            <Lightbulb className="w-5 h-5 text-accent mb-2" />
            <p className="text-xs text-foreground leading-relaxed">
              You have <span className="text-accent font-bold">{meters.length} meter{meters.length !== 1 ? "s" : ""}</span> linked
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Power lasts <span className="text-success font-medium">{daysLeft} days</span> at current rate</p>
          </div>
          <div className="glass-card rounded-2xl p-4 flex-1 border-l-2 border-primary">
            <p className="text-[10px] text-muted-foreground mb-1">Wallet capacity</p>
            <p className="text-sm font-bold text-foreground">{max} kWh</p>
            <p className="text-[10px] text-primary mt-0.5">{balance} kWh used</p>
            <p className="text-[10px] text-muted-foreground mt-2">Remaining</p>
            <p className="text-sm font-bold text-foreground">{(max - balance).toFixed(1)} kWh</p>
          </div>
        </div>

        {/* Quick actions */}
        <div className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Recharge", icon: "💳", path: "/recharge", color: "bg-primary/15 border-primary/20" },
              { label: "Transfer", icon: "🔄", path: "/transfer", color: "bg-accent/15 border-accent/20" },
              { label: "Meters", icon: "⚡", path: "/meters", color: "bg-success/15 border-success/20" },
              { label: "Analytics", icon: "📊", path: "/analytics", color: "bg-purple-500/15 border-purple-500/20" },
            ].map(({ label, icon, path, color }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all active:scale-95 ${color}`}
              >
                <span className="text-2xl">{icon}</span>
                <span className="text-[10px] font-medium text-foreground">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <BottomNav active="/" />
    </div>
  );
};

export default Home;
