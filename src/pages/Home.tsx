import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell, Zap, TrendingDown, ArrowRight, Battery,
  CreditCard, ArrowLeftRight, BarChart3, Activity, ChevronRight, Bolt,
  Sparkles, Clock, Shield
} from "lucide-react";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import HomeSkeleton from "@/components/HomeSkeleton";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Sounds } from "@/lib/sounds";

interface Wallet { balance_kwh: number; max_kwh: number; }
interface Transaction { id: string; type: string; amount_kwh: number; amount_kes: number; status: string; created_at: string; metadata: any; }

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
        <circle cx="74" cy="74" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="8" opacity="0.3" />
        <circle cx="74" cy="74" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 74 74)"
          style={{ transition: "stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)", filter: `drop-shadow(0 0 8px ${glowColor})` }}
        />
        <circle cx="74" cy="74" r="42" fill="none" stroke={color} strokeWidth="0.5" opacity="0.15" />
      </svg>
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

const PulseDot = ({ color = "bg-success" }: { color?: string }) => (
  <span className="relative flex h-2.5 w-2.5">
    <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", color)} />
    <span className={cn("relative inline-flex rounded-full h-2.5 w-2.5", color)} />
  </span>
);

/* ── Stagger animation helpers ── */
const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } },
  item: { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } } },
};

const Home = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user, profile, loading: authLoading } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
  const [meterCount, setMeterCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    let mounted = true;
    const fetchData = async () => {
      try {
        const [walletRes, txRes, notifRes, metersRes] = await Promise.all([
          supabase.from("wallets").select("balance_kwh, max_kwh").maybeSingle(),
          supabase.from("transactions").select("id, type, amount_kwh, amount_kes, status, created_at, metadata").order("created_at", { ascending: false }).limit(5),
          supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false),
          supabase.from("meters").select("id", { count: "exact", head: true }),
        ]);
        if (!mounted) return;
        setWallet(walletRes.data ?? { balance_kwh: 0, max_kwh: 200 });
        setRecentTxs((txRes.data as Transaction[]) ?? []);
        setUnreadCount(notifRes.count ?? 0);
        setMeterCount(metersRes.count ?? 0);
      } catch (err) {
        console.error("Home fetch error:", err);
        if (mounted) setWallet(prev => prev ?? { balance_kwh: 0, max_kwh: 200 });
      } finally {
        if (mounted) setDataLoading(false);
      }
    };
    fetchData();

    const channel = supabase
      .channel("home-wallet")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "wallets" }, (payload) => {
        if (mounted) setWallet({ balance_kwh: payload.new.balance_kwh, max_kwh: payload.new.max_kwh });
      })
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [authLoading, user]);

  const balance = wallet?.balance_kwh ?? 0;
  const max = wallet?.max_kwh ?? 200;
  const pct = max > 0 ? Math.min(100, Math.round((balance / max) * 100)) : 0;
  const isLow = pct < 20;

  const firstName = profile?.full_name?.split(" ")[0] || "User";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const greetingEmoji = hour < 12 ? "☀️" : hour < 17 ? "🌤️" : "🌙";

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const quickActions = [
    { label: "Recharge", icon: CreditCard, path: "/recharge", gradient: "gradient-cyan", glow: "glow-cyan" },
    { label: "Transfer", icon: ArrowLeftRight, path: "/transfer", gradient: "gradient-purple", glow: "" },
    { label: "Meters", icon: Bolt, path: "/meters", gradient: "bg-success", glow: "" },
    { label: "Analytics", icon: BarChart3, path: "/analytics", gradient: "bg-accent", glow: "glow-amber" },
  ];

  const loading = authLoading || dataLoading;

  if (loading) {
    return <HomeSkeleton />;
  }

  return (
    <div className={cn("min-h-screen pb-28 relative overflow-hidden", theme === "dark" ? "gradient-navy" : "bg-background")}>
      <div className="absolute inset-0 gradient-mesh pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-primary/4 blur-[100px] pointer-events-none" />

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative px-5 pt-14 pb-2 flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl gradient-cyan flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-sm font-bold text-[hsl(var(--navy))]">
              {(profile?.full_name || "U").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)}
            </span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">{greeting} {greetingEmoji}</p>
            <h2 className="text-lg font-bold text-foreground tracking-tight">{firstName}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 glass-card rounded-full px-3 py-1.5 border border-border/10">
            <PulseDot color={meterCount > 0 ? "bg-success" : "bg-destructive"} />
            <span className="text-[10px] font-medium text-muted-foreground">
              {meterCount > 0 ? `${meterCount} meter${meterCount > 1 ? "s" : ""}` : "No meter"}
            </span>
          </div>
          <button onClick={() => { Sounds.tap(); navigate("/notifications"); }}
            className="relative p-2.5 glass-card rounded-xl border border-border/20 card-interactive">
            <Bell className="w-5 h-5 text-foreground" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive"
              />
            )}
          </button>
        </div>
      </motion.div>

      <motion.div
        variants={stagger.container}
        initial="hidden"
        animate="show"
        className="relative px-5 space-y-5 mt-2"
      >
        {/* ── Energy Wallet Card ── */}
        <motion.div variants={stagger.item}
          className="relative overflow-hidden rounded-3xl p-6 noise-overlay"
          style={{
            background: "linear-gradient(145deg, hsl(228, 55%, 12%) 0%, hsl(215, 55%, 15%) 40%, hsl(200, 50%, 14%) 70%, hsl(191, 45%, 13%) 100%)",
            border: "1px solid rgba(0, 212, 255, 0.12)",
            boxShadow: "0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}>
          <div className="absolute inset-0 shimmer-overlay pointer-events-none" />
          <div className="relative z-10">
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
            <div className="flex items-center gap-6">
              <EnergyRing pct={pct} isLow={isLow} />
              <div className="flex-1 min-w-0">
                <div className="mb-4">
                  <div className="flex items-end gap-1 mb-1">
                    <span className={cn("text-3xl font-bold tracking-tight", isLow ? "text-destructive" : "text-foreground")}>{balance.toFixed(1)}</span>
                    <span className="text-primary font-medium text-sm mb-0.5">kWh</span>
                  </div>
                  <p className="text-xs text-muted-foreground/80">≈ KES {(balance * 24).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
                {isLow && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => navigate("/recharge")}
                    className="flex items-center gap-2 bg-destructive/15 rounded-xl px-3 py-2 border border-destructive/20 mb-3 w-full card-interactive">
                    <Activity className="w-3.5 h-3.5 text-destructive animate-pulse" />
                    <span className="text-[11px] text-destructive font-semibold">Low balance — tap to recharge</span>
                    <ArrowRight className="w-3 h-3 text-destructive ml-auto" />
                  </motion.button>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/5 rounded-xl px-2.5 py-2 border border-white/5">
                    <Battery className="w-3 h-3 text-success mb-0.5" />
                    <span className="text-sm font-bold text-success block">{meterCount}</span>
                    <span className="text-[8px] text-muted-foreground/60 uppercase">meters</span>
                  </div>
                  <div className="bg-white/5 rounded-xl px-2.5 py-2 border border-white/5">
                    <TrendingDown className="w-3 h-3 text-primary mb-0.5" />
                    <span className="text-sm font-bold text-foreground block">{balance.toFixed(0)}</span>
                    <span className="text-[8px] text-muted-foreground/60 uppercase">kWh avail</span>
                  </div>
                  <div className="bg-white/5 rounded-xl px-2.5 py-2 border border-white/5">
                    <Bolt className="w-3 h-3 text-accent mb-0.5" />
                    <span className="text-sm font-bold text-accent block">{recentTxs.filter(t => t.status === "completed").length}</span>
                    <span className="text-[8px] text-muted-foreground/60 uppercase">recent</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Quick Actions ── */}
        <motion.div variants={stagger.item}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground tracking-tight">Quick Actions</h3>
            <Sparkles className="w-4 h-4 text-primary/40" />
          </div>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map(({ label, icon: Icon, path, gradient, glow }, i) => (
              <motion.button
                key={label}
                whileTap={{ scale: 0.92 }}
                onClick={() => { Sounds.tap(); navigate(path); }}
                className="flex flex-col items-center gap-2.5"
              >
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform", gradient, glow)}>
                  <Icon className="w-6 h-6 text-[hsl(var(--navy))]" strokeWidth={2} />
                </div>
                <span className="text-[11px] font-medium text-foreground">{label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── Meters Section ── */}
        <motion.div variants={stagger.item}>
          {meterCount > 0 ? (
            <motion.div
              whileTap={{ scale: 0.98 }}
              className="glass-card-elevated rounded-2xl p-4 cursor-pointer"
              onClick={() => navigate("/meters")}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Linked Meters</span>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] rounded-full px-2.5 py-1 font-medium bg-success/15 text-success">
                  <PulseDot color="bg-success" /> {meterCount} linked
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/10">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">Manage Meters</p>
                  <p className="text-xs text-muted-foreground">Transfer kWh from wallet to meter</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="mt-3 pt-3 border-t border-border/10">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] text-muted-foreground">Wallet Balance</span>
                  <span className="text-xs font-bold text-primary">{balance.toFixed(1)} kWh</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted/20 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                    className={cn("h-full rounded-full", pct < 20 ? "bg-destructive" : "gradient-cyan")}
                  />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/meters")}
              className="glass-card-elevated rounded-2xl p-6 w-full text-center border-2 border-dashed border-primary/15 hover:border-primary/30 transition-all"
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
            </motion.button>
          )}
        </motion.div>

        {/* ── Recent Activity ── */}
        <motion.div variants={stagger.item}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground tracking-tight">Recent Activity</h3>
            {recentTxs.length > 0 && (
              <button onClick={() => navigate("/analytics")} className="text-[10px] text-primary font-medium flex items-center gap-0.5">
                View all <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="glass-card rounded-2xl overflow-hidden border border-border/10">
            {recentTxs.length > 0 ? recentTxs.slice(0, 3).map((tx, i) => {
              const iconMap: Record<string, { emoji: string; bg: string }> = {
                recharge: { emoji: "💳", bg: "bg-primary/10" },
                transfer_out: { emoji: "📤", bg: "bg-accent/10" },
                transfer_in: { emoji: "🟢", bg: "bg-success/10" },
                meter_transfer: { emoji: "⚡", bg: "bg-accent/10" },
              };
              const { emoji, bg } = iconMap[tx.type] ?? { emoji: "⚡", bg: "bg-muted/10" };
              const title = tx.type === "recharge" ? "Recharge" : tx.type === "transfer_out" ? "Transfer Sent" : tx.type === "transfer_in" ? "Transfer Received" : "Meter Transfer";
              const desc = tx.type === "recharge"
                ? `+${tx.amount_kwh} kWh via M-Pesa`
                : `${tx.amount_kwh} kWh ${tx.type === "transfer_out" ? "sent" : "received"}`;
              const statusColor = tx.status === "completed" ? "text-success" : tx.status === "pending" ? "text-accent" : "text-destructive";
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className={cn("flex items-center gap-3 px-4 py-3.5 hover:bg-muted/5 transition-colors", i < Math.min(recentTxs.length, 3) - 1 && "border-b border-border/10")}
                >
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", bg)}>
                    <span className="text-base">{emoji}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="text-[11px] text-muted-foreground">{desc}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-[10px] font-semibold capitalize", statusColor)}>
                      {tx.status}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{getTimeAgo(tx.created_at)}</p>
                  </div>
                </motion.div>
              );
            }) : (
              <div className="px-4 py-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-muted/10 flex items-center justify-center mx-auto mb-2">
                  <Activity className="w-5 h-5 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">Your transactions will appear here</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Pro Tip ── */}
        <motion.div variants={stagger.item} className="glass-card rounded-2xl p-4 border border-accent/10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-accent/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground mb-1">Smart Tip 💡</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your wallet balance powers your meters remotely. Recharge via M-Pesa and your meter gets credited automatically — no tokens needed!
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <BottomNav active="/" />
    </div>
  );
};

export default Home;
