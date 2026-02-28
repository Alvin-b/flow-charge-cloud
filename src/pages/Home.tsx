import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, Zap, TrendingUp, TrendingDown, ArrowRight, Battery,
  CreditCard, ArrowLeftRight, BarChart3, Activity, ChevronRight, Bolt, 
  Sparkles, Clock, Shield
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { meterApi, consumptionApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Wallet {
  balance_kwh: number;
  max_kwh: number;
}

interface ActiveConnection {
  connection_id: string;
  meter_id: string;
  meter_code: string;
  meter_name: string;
  property_name: string | null;
  meter_balance: number;
  wallet_balance: number;
  connected_at: string;
}

interface Transaction {
  id: string;
  type: string;
  amount_kwh: number;
  amount_kes: number;
  status: string;
  created_at: string;
  metadata: any;
}

interface Summary {
  week_total: number;
  daily_avg: number;
  peak_hour: string;
  change_percent: number;
}

/* ── Animated Energy Ring ── */
const EnergyRing = ({ pct, isLow }: { pct: number; isLow: boolean }) => {
  const r = 58;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * pct) / 100;
  const color = isLow ? "hsl(var(--destructive))" : "hsl(var(--primary))";
  const glowColor = isLow ? "rgba(220, 50, 50, 0.4)" : "rgba(0, 212, 255, 0.4)";

  return (
    <div className="relative">
      <svg width="148" height="148" viewBox="0 0 148 148" className="drop-shadow-lg">
        {/* Background track */}
        <circle cx="74" cy="74" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="8" opacity="0.3" />
        {/* Tick marks */}
        {Array.from({ length: 36 }).map((_, i) => {
          const angle = (i * 10 - 90) * (Math.PI / 180);
          const x1 = 74 + (r + 4) * Math.cos(angle);
          const y1 = 74 + (r + 4) * Math.sin(angle);
          const x2 = 74 + (r + 7) * Math.cos(angle);
          const y2 = 74 + (r + 7) * Math.sin(angle);
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={i * (100 / 36) <= pct ? color : "hsl(var(--border))"}
              strokeWidth="1.5" strokeLinecap="round" opacity={i * (100 / 36) <= pct ? 0.6 : 0.15}
            />
          );
        })}
        {/* Progress arc */}
        <circle
          cx="74" cy="74" r={r} fill="none"
          stroke={color}
          strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform="rotate(-90 74 74)"
          style={{
            transition: "stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)",
            filter: `drop-shadow(0 0 8px ${glowColor})`,
          }}
        />
        {/* Inner glow circle */}
        <circle cx="74" cy="74" r="42" fill="none" stroke={color} strokeWidth="0.5" opacity="0.15" />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="flex items-baseline gap-0.5">
          <span className={cn("text-4xl font-bold tracking-tight", isLow ? "text-destructive" : "text-foreground")}>{pct}</span>
          <span className="text-primary text-lg font-semibold">%</span>
        </div>
        <span className="text-[10px] text-muted-foreground tracking-widest uppercase mt-0.5">capacity</span>
      </div>
    </div>
  );
};

/* ── Live Pulse Dot ── */
const PulseDot = ({ color = "bg-success" }: { color?: string }) => (
  <span className="relative flex h-2.5 w-2.5">
    <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", color)} />
    <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", color)} />
  </span>
);

/* ── Stat Chip ── */
const StatChip = ({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color: string;
}) => (
  <div className="glass-card rounded-2xl p-3 flex-1 border border-border/10 card-interactive">
    <div className="flex items-center gap-1.5 mb-1.5">
      <Icon className={cn("w-3.5 h-3.5", color)} />
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</span>
    </div>
    <span className={cn("text-lg font-bold", color)}>{value}</span>
  </div>
);

const Home = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { profile } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [activeConn, setActiveConn] = useState<ActiveConnection | null>(null);
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const fetchData = async () => {
      const [walletRes, connRes, txRes, notifRes] = await Promise.all([
        supabase.from("wallets").select("*").maybeSingle(),
        meterApi.getActiveConnection().catch(() => ({ connection: null })),
        supabase.from("transactions").select("*").order("created_at", { ascending: false }).limit(5),
        supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false),
      ]);
      setWallet(walletRes.data ?? { balance_kwh: 0, max_kwh: 200 });
      setActiveConn(connRes.connection ?? null);
      setRecentTxs(txRes.data ?? []);
      setUnreadCount(notifRes.count ?? 0);
      // Fetch summary in background (non-blocking)
      consumptionApi.getSummary().then(setSummary).catch(() => {});
      setLoading(false);
    };
    fetchData();

    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const balance = wallet?.balance_kwh ?? 0;
  const max = wallet?.max_kwh ?? 200;
  const pct = max > 0 ? Math.min(100, Math.round((balance / max) * 100)) : 0;
  const isLow = pct < 20;
  const dailyAvg = summary?.daily_avg ?? 0;
  const daysLeft = dailyAvg > 0 ? Math.round(balance / dailyAvg) : 0;

  const firstName = profile?.full_name?.split(" ")[0] || "User";
  const hour = currentTime.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const greetingEmoji = hour < 12 ? "☀️" : hour < 17 ? "🌤️" : "🌙";

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  const quickActions = [
    { label: "Recharge", icon: CreditCard, path: "/recharge", gradient: "gradient-cyan", glow: "glow-cyan" },
    { label: "Transfer", icon: ArrowLeftRight, path: "/transfer", gradient: "gradient-purple", glow: "" },
    { label: "Meters", icon: Bolt, path: "/meters", gradient: "bg-success", glow: "" },
    { label: "Analytics", icon: BarChart3, path: "/analytics", gradient: "bg-accent", glow: "glow-amber" },
  ];

  if (loading) {
    return (
      <div className="min-h-screen gradient-navy flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl gradient-cyan flex items-center justify-center glow-cyan animate-float">
            <Zap className="w-8 h-8 text-[hsl(var(--navy))]" />
          </div>
          <div className="absolute -inset-2 rounded-3xl border border-primary/20 animate-spin-slow" />
        </div>
        <div className="flex gap-1.5 mt-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen pb-28 relative overflow-hidden", theme === "dark" ? "gradient-navy" : "bg-background")}>
      {/* Ambient background effects */}
      <div className="absolute inset-0 gradient-mesh pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/4 blur-[100px] pointer-events-none" />
      <div className="absolute top-80 -left-20 w-72 h-72 rounded-full bg-purple-500/3 blur-[80px] pointer-events-none" />

      {/* ── Header ── */}
      <div className="relative px-5 pt-14 pb-2 flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl gradient-cyan flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-sm font-bold text-[hsl(var(--navy))]">
              {(profile?.full_name || "U").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
            </span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              {greeting} {greetingEmoji}
            </p>
            <h2 className="text-lg font-bold text-foreground tracking-tight">{firstName}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 glass-card rounded-full px-3 py-1.5 border border-border/10">
            <PulseDot color={activeConn ? "bg-success" : "bg-destructive"} />
            <span className="text-[10px] font-medium text-muted-foreground">
              {activeConn ? "Connected" : "No meter"}
            </span>
          </div>
          <button
            onClick={() => navigate("/notifications")}
            className="relative p-2.5 glass-card rounded-xl border border-border/20 card-interactive"
          >
            <Bell className="w-5 h-5 text-foreground" />
            {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />}
          </button>
        </div>
      </div>

      <div className="relative px-5 space-y-5 mt-2">
        {/* ── Energy Wallet Card ── */}
        <div
          className="relative overflow-hidden rounded-3xl p-6 animate-fade-in-up noise-overlay"
          style={{
            background: "linear-gradient(145deg, hsl(228, 55%, 12%) 0%, hsl(215, 55%, 15%) 40%, hsl(200, 50%, 14%) 70%, hsl(191, 45%, 13%) 100%)",
            border: "1px solid rgba(0, 212, 255, 0.12)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}
        >
          {/* Shimmer overlay */}
          <div className="absolute inset-0 shimmer-overlay pointer-events-none" />

          <div className="relative z-10">
            {/* Top row */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                <span className="text-xs text-primary/80 font-semibold uppercase tracking-[0.2em]">Energy Wallet</span>
              </div>
              <div className="flex items-center gap-1.5 bg-white/5 rounded-full px-2.5 py-1 border border-white/5">
                <Shield className="w-3 h-3 text-success" />
                <span className="text-[9px] text-success font-medium">Secured</span>
              </div>
            </div>

            {/* Main content */}
            <div className="flex items-center gap-6">
              <EnergyRing pct={pct} isLow={isLow} />
              <div className="flex-1 min-w-0">
                <div className="mb-4">
                  <div className="flex items-end gap-1 mb-1">
                    <span className={cn("text-3xl font-bold tracking-tight", isLow ? "text-destructive" : "text-foreground")}>
                      {balance.toFixed(1)}
                    </span>
                    <span className="text-primary font-medium text-sm mb-0.5">kWh</span>
                  </div>
<p className="text-xs text-muted-foreground/80">≈ KES {(balance * 24).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>

                {isLow && (
                  <button
                    onClick={() => navigate("/recharge")}
                    className="flex items-center gap-2 bg-destructive/15 rounded-xl px-3 py-2 border border-destructive/20 mb-3 w-full card-interactive"
                  >
                    <Activity className="w-3.5 h-3.5 text-destructive animate-pulse" />
                    <span className="text-[11px] text-destructive font-semibold">Low balance — tap to recharge</span>
                    <ArrowRight className="w-3 h-3 text-destructive ml-auto" />
                  </button>
                )}

                {/* Mini stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/5 rounded-xl px-2.5 py-2 border border-white/5">
                    <div className="flex items-center gap-1 mb-0.5">
                      <Battery className="w-3 h-3 text-success" />
                    </div>
                    <span className="text-sm font-bold text-success block">{daysLeft}d</span>
                    <span className="text-[8px] text-muted-foreground/60 uppercase">left</span>
                  </div>
                  <div className="bg-white/5 rounded-xl px-2.5 py-2 border border-white/5">
                    <div className="flex items-center gap-1 mb-0.5">
                      <TrendingDown className="w-3 h-3 text-primary" />
                    </div>
                    <span className="text-sm font-bold text-foreground block">{dailyAvg.toFixed(1)}</span>
                    <span className="text-[8px] text-muted-foreground/60 uppercase">kWh/day</span>
                  </div>
                  <div className="bg-white/5 rounded-xl px-2.5 py-2 border border-white/5">
                  <div className="flex items-center gap-1 mb-0.5">
                      <Bolt className="w-3 h-3 text-accent" />
                    </div>
                    <span className="text-sm font-bold text-accent block">{activeConn ? 1 : 0}</span>
                    <span className="text-[8px] text-muted-foreground/60 uppercase">meters</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground tracking-tight">Quick Actions</h3>
            <Sparkles className="w-4 h-4 text-primary/40" />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map(({ label, icon: Icon, path, gradient, glow }) => (
              <button
                key={label}
                onClick={() => navigate(path)}
                className="flex flex-col items-center gap-2.5 card-interactive"
              >
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg", gradient, glow)}>
                  <Icon className="w-6 h-6 text-[hsl(var(--navy))]" strokeWidth={2} />
                </div>
                <span className="text-[11px] font-medium text-foreground">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Active Meter Card ── */}
        {activeConn ? (
          <div
            className="glass-card-elevated rounded-2xl p-4 animate-fade-in-up card-interactive"
            style={{ animationDelay: "0.15s" }}
            onClick={() => navigate("/meters")}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Meter</span>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] rounded-full px-2.5 py-1 font-medium bg-success/15 text-success">
                <PulseDot color="bg-success" />
                Connected
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{activeConn.meter_name}</p>
                {activeConn.property_name && (
                  <p className="text-xs text-muted-foreground truncate">{activeConn.property_name}</p>
                )}
                <p className="text-[10px] text-muted-foreground/50 font-mono mt-0.5">{activeConn.meter_code}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
            {/* Wallet powering meter indicator */}
            <div className="mt-3 pt-3 border-t border-border/10">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] text-muted-foreground">Wallet Balance Powering Meter</span>
                <span className="text-xs font-bold text-primary">{balance.toFixed(1)} kWh</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted/20 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-1000",
                    pct < 20 ? "bg-destructive" : "gradient-cyan"
                  )}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={() => navigate("/meters")}
            className="glass-card-elevated rounded-2xl p-6 w-full text-center animate-fade-in-up border-2 border-dashed border-primary/15 hover:border-primary/30 transition-all card-interactive"
            style={{ animationDelay: "0.15s" }}
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <Zap className="w-7 h-7 text-primary/50" />
            </div>
            <p className="text-sm font-bold text-foreground">Connect Your First Meter</p>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-[220px] mx-auto leading-relaxed">
              Scan the QR code or enter the meter code to start using energy from your wallet
            </p>
            <div className="flex items-center justify-center gap-1.5 mt-3 text-primary">
              <span className="text-xs font-semibold">Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        )}

        {/* ── Smart Insights ── */}
        <div className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground tracking-tight">Insights</h3>
            <button onClick={() => navigate("/analytics")} className="text-xs text-primary font-medium flex items-center gap-1">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="flex gap-3">
            <StatChip icon={TrendingUp} label="This week" value={summary ? `${summary.week_total} kWh` : "--"} color="text-primary" />
            <StatChip icon={Activity} label="Peak" value={summary?.peak_hour ?? "--"} color="text-accent" />
            <StatChip icon={TrendingDown} label="vs last mo" value={summary ? `${summary.change_percent > 0 ? "+" : ""}${summary.change_percent}%` : "--"} color="text-success" />
          </div>
        </div>

        {/* ── Recent Activity ── */}
        <div className="animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground tracking-tight">Recent Activity</h3>
          </div>
          <div className="glass-card rounded-2xl overflow-hidden border border-border/10">
            {recentTxs.length > 0 ? recentTxs.slice(0, 3).map((tx, i) => {
              const icon = tx.type === "recharge" ? "💳" : tx.type === "transfer_out" ? "📤" : tx.type === "transfer_in" ? "🟢" : "⚡";
              const title = tx.type === "recharge" ? "Recharge" : tx.type === "transfer_out" ? "Transfer Sent" : tx.type === "transfer_in" ? "Transfer Received" : "Meter Transfer";
              const desc = tx.type === "recharge"
                ? `+${tx.amount_kwh} kWh via M-Pesa`
                : tx.type === "transfer_out"
                ? `-${tx.amount_kwh} kWh to ${tx.metadata?.recipient_name || "user"}`
                : tx.type === "transfer_in"
                ? `+${tx.amount_kwh} kWh from ${tx.metadata?.sender_name || "user"}`
                : `${tx.amount_kwh} kWh to meter`;
              const timeAgo = getTimeAgo(tx.created_at);
              return (
                <div key={tx.id} className={cn("flex items-center gap-3 px-4 py-3.5", i < Math.min(recentTxs.length, 3) - 1 && "border-b border-border/10")}>
                  <span className="text-lg">{icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="text-[11px] text-muted-foreground">{desc}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">{timeAgo}</p>
                  </div>
                </div>
              );
            }) : (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Pro Tip ── */}
        <div
          className="glass-card rounded-2xl p-4 border border-accent/10 animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground mb-1">Smart Tip 💡</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {summary?.peak_hour && summary.peak_hour !== "--" ? (
                  <>Your peak usage is at <span className="text-accent font-semibold">{summary.peak_hour}</span>. </>
                ) : (
                  <>Track your usage to discover peak hours. </>
                )}
                Consider shifting heavy appliances to off-peak hours to save on energy.
              </p>
            </div>
          </div>
        </div>
      </div>

      <BottomNav active="/" />
    </div>
  );
};

export default Home;
