import { useState, useEffect } from "react";
import {
  Bell, Zap, TrendingDown, ArrowRight, Battery,
  CreditCard, ArrowLeftRight, BarChart3, Activity, ChevronRight, Bolt,
  Sparkles, Shield, Cpu, Radio
} from "lucide-react";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { cn } from "@/lib/utils";
import { Sounds } from "@/lib/sounds";
import { HomeData, getTimeAgo } from "./HomeDataProvider";
import AIInsights from "@/components/AIInsights";

const EnergyRing = ({ pct, isLow }: { pct: number; isLow: boolean }) => {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * pct) / 100;
  const color = isLow ? "hsl(var(--destructive))" : "hsl(var(--primary))";
  return (
    <div className="relative">
      <svg width="132" height="132" viewBox="0 0 132 132">
        <defs>
          <filter id="neon-glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx="66" cy="66" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="8" opacity="0.3" />
        <circle cx="66" cy="66" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 66 66)"
          filter="url(#neon-glow)"
          style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i / 24) * 360 - 90;
          const rad = (angle * Math.PI) / 180;
          const x1 = 66 + (r + 6) * Math.cos(rad);
          const y1 = 66 + (r + 6) * Math.sin(rad);
          const x2 = 66 + (r + 10) * Math.cos(rad);
          const y2 = 66 + (r + 10) * Math.sin(rad);
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(var(--primary))" strokeWidth="1" opacity="0.15" />;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="flex items-baseline gap-0.5">
          <span className={cn("text-3xl font-extrabold tracking-tight font-mono", isLow ? "text-destructive" : "text-primary neon-text")}>{pct}</span>
          <span className="text-primary text-base font-bold">%</span>
        </div>
        <span className="text-[8px] text-muted-foreground font-mono uppercase tracking-[0.2em] mt-0.5">capacity</span>
      </div>
    </div>
  );
};

const PulseDot = ({ color = "bg-success" }: { color?: string }) => (
  <span className="relative flex h-2 w-2">
    <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-60", color)} />
    <span className={cn("relative inline-flex rounded-full h-2 w-2", color)} />
  </span>
);

const DataTicker = () => {
  const [tick, setTick] = useState(0);
  useEffect(() => { const iv = setInterval(() => setTick(t => t + 1), 2000); return () => clearInterval(iv); }, []);
  const values = ["SYS:ONLINE", "GRID:STABLE", `FREQ:${(50 + Math.random() * 0.2 - 0.1).toFixed(2)}Hz`, `TEMP:${(23 + Math.random() * 3).toFixed(1)}°C`];
  return (
    <div className="flex items-center gap-2 overflow-hidden">
      <Radio className="w-3 h-3 text-primary animate-data-pulse" />
      <span className="text-[9px] font-mono text-primary/60 tracking-wider">{values[tick % values.length]}</span>
    </div>
  );
};

const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } } },
  item: { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } } },
};

const quickActions = [
  { label: "Recharge", icon: CreditCard, path: "/recharge", glow: "glow-cyan" },
  { label: "Transfer", icon: ArrowLeftRight, path: "/transfer", glow: "glow-purple" },
  { label: "Meters", icon: Bolt, path: "/meters", glow: "glow-cyan" },
  { label: "Analytics", icon: BarChart3, path: "/analytics", glow: "glow-amber" },
];

export default function HomeCyberpunk({ data }: { data: HomeData }) {
  const { navigate, profile, balance, pct, isLow, meterCount, unreadCount, firstName, greeting, recentTxs } = data;

  return (
    <div className="min-h-screen pb-28 bg-background cyber-grid noise-overlay relative">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        className="px-5 pt-14 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center glow-cyan">
            <span className="text-sm font-bold text-primary font-mono">
              {(profile?.full_name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
            </span>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">{greeting}</p>
            <h2 className="text-lg font-bold text-foreground tracking-tight">{firstName}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-secondary/50 border border-border rounded-lg px-3 py-1.5">
            <PulseDot color={meterCount > 0 ? "bg-primary" : "bg-destructive"} />
            <span className="text-[10px] font-mono text-muted-foreground">{meterCount > 0 ? `${meterCount} ONLINE` : "OFFLINE"}</span>
          </div>
          <button onClick={() => { Sounds.tap(); navigate("/notifications"); }}
            className="relative p-2.5 bg-secondary/50 border border-border rounded-xl card-interactive">
            <Bell className="w-5 h-5 text-foreground" />
            {unreadCount > 0 && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-primary glow-cyan" />}
          </button>
        </div>
      </motion.div>

      <motion.div variants={stagger.container} initial="hidden" animate="show" className="px-5 space-y-5 mt-2">
        {/* Energy Wallet */}
        <motion.div variants={stagger.item} className="rounded-2xl p-6 gradient-wallet overflow-hidden relative hud-corners">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary animate-flicker" />
              <span className="text-[10px] text-primary/70 font-mono uppercase tracking-[0.2em]">Energy Wallet</span>
            </div>
            <div className="flex items-center gap-1.5 border border-primary/20 rounded-lg px-2.5 py-1 bg-primary/5">
              <Shield className="w-3 h-3 text-primary/60" />
              <span className="text-[9px] text-primary/60 font-mono">SECURED</span>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <EnergyRing pct={pct} isLow={isLow} />
            <div className="flex-1 min-w-0">
              <div className="mb-4">
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-3xl font-extrabold tracking-tight text-foreground font-mono">{balance.toFixed(1)}</span>
                  <span className="text-primary font-bold text-sm mb-0.5">kWh</span>
                </div>
                <p className="text-[11px] text-muted-foreground font-mono">≈ KES {(balance * 24).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              {isLow && (
                <motion.button initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  onClick={() => navigate("/recharge")}
                  className="flex items-center gap-2 border border-destructive/30 bg-destructive/10 rounded-xl px-3 py-2 mb-3 w-full card-interactive">
                  <Activity className="w-3.5 h-3.5 text-destructive animate-pulse" />
                  <span className="text-[11px] text-destructive font-semibold font-mono">LOW — TAP TO RECHARGE</span>
                  <ArrowRight className="w-3 h-3 text-destructive ml-auto" />
                </motion.button>
              )}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Battery, val: meterCount, label: "METERS" },
                  { icon: TrendingDown, val: balance.toFixed(0), label: "AVAIL" },
                  { icon: Bolt, val: recentTxs.filter(t => t.status === "completed").length, label: "RECENT" },
                ].map(({ icon: Icon, val, label }) => (
                  <div key={label} className="bg-secondary/30 border border-border rounded-xl px-2.5 py-2">
                    <Icon className="w-3 h-3 text-primary/50 mb-0.5" />
                    <span className="text-sm font-bold text-foreground font-mono block">{val}</span>
                    <span className="text-[7px] text-muted-foreground font-mono uppercase tracking-wider">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DataTicker />
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={stagger.item}>
          <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h3>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map(({ label, icon: Icon, path, glow }) => (
              <motion.button key={label} whileTap={{ scale: 0.93 }} onClick={() => { Sounds.tap(); navigate(path); }}
                className="flex flex-col items-center gap-2">
                <div className={cn("w-14 h-14 rounded-xl flex items-center justify-center bg-secondary/50 border border-border card-interactive", glow)}>
                  <Icon className="w-6 h-6 text-primary" strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-mono font-medium text-muted-foreground uppercase">{label}</span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Meters */}
        <motion.div variants={stagger.item}>
          {meterCount > 0 ? (
            <motion.div whileTap={{ scale: 0.98 }} className="glass-card-elevated rounded-2xl p-4 cursor-pointer neon-border" onClick={() => navigate("/meters")}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">Linked Meters</span>
                </div>
                <span className="flex items-center gap-1.5 text-[10px] rounded-lg px-2.5 py-1 font-mono font-medium bg-primary/10 text-primary border border-primary/20">
                  <PulseDot color="bg-primary" /> {meterCount} ONLINE
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center glow-cyan">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">Manage Meters</p>
                  <p className="text-xs text-muted-foreground font-mono">Transfer kWh → meter</p>
                </div>
                <ChevronRight className="w-5 h-5 text-primary/40" />
              </div>
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] text-muted-foreground font-mono">WALLET BAL</span>
                  <span className="text-xs font-bold text-primary font-mono">{balance.toFixed(1)} kWh</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
                    className={cn("h-full rounded-full", pct < 20 ? "bg-destructive glow-amber" : "bg-primary glow-cyan")} />
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.button whileTap={{ scale: 0.97 }} onClick={() => navigate("/meters")}
              className="glass-card-elevated rounded-2xl p-6 w-full text-center border border-dashed border-primary/20 hover:border-primary/40 transition-all">
              <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3 glow-cyan">
                <Zap className="w-7 h-7 text-primary/50" />
              </div>
              <p className="text-sm font-bold text-foreground">Connect Your First Meter</p>
              <p className="text-xs text-muted-foreground font-mono mt-1.5 max-w-[220px] mx-auto leading-relaxed">Scan QR or enter meter code</p>
              <div className="flex items-center justify-center gap-1.5 mt-3 text-primary">
                <span className="text-xs font-mono font-semibold">INITIALIZE</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </motion.button>
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div variants={stagger.item}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Transaction Log</h3>
            {recentTxs.length > 0 && (
              <button onClick={() => navigate("/analytics")} className="text-[10px] text-primary font-mono flex items-center gap-0.5">
                VIEW ALL <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
          <div className="glass-card-elevated rounded-2xl overflow-hidden">
            {recentTxs.length > 0 ? recentTxs.slice(0, 3).map((tx, i) => {
              const iconMap: Record<string, { icon: string; border: string }> = {
                recharge: { icon: "⚡", border: "border-primary/20" },
                transfer_out: { icon: "↗", border: "border-accent/20" },
                transfer_in: { icon: "↙", border: "border-success/20" },
                meter_transfer: { icon: "⚡", border: "border-amber-500/20" },
              };
              const { icon, border } = iconMap[tx.type] ?? { icon: "⚡", border: "border-border" };
              const title = tx.type === "recharge" ? "RECHARGE" : tx.type === "transfer_out" ? "SENT" : tx.type === "transfer_in" ? "RECEIVED" : "METER TX";
              const desc = tx.type === "recharge" ? `+${tx.amount_kwh} kWh via M-Pesa` : `${tx.amount_kwh} kWh ${tx.type === "transfer_out" ? "sent" : "received"}`;
              const statusColor = tx.status === "completed" ? "text-primary" : tx.status === "pending" ? "text-amber-500" : "text-destructive";
              return (
                <motion.div key={tx.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.25 }}
                  className={cn("flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/30 transition-colors", i < Math.min(recentTxs.length, 3) - 1 && "border-b border-border")}>
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-secondary/50 border", border)}>
                    <span className="text-base">{icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-medium text-foreground">{title}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{desc}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-[10px] font-mono font-semibold uppercase", statusColor)}>{tx.status}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{getTimeAgo(tx.created_at)}</p>
                  </div>
                </motion.div>
              );
            }) : (
              <div className="px-4 py-8 text-center">
                <div className="w-12 h-12 rounded-xl bg-secondary/50 border border-border flex items-center justify-center mx-auto mb-2">
                  <Activity className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-mono text-muted-foreground">NO ACTIVITY</p>
                <p className="text-[11px] text-muted-foreground/60 font-mono mt-0.5">Transactions will appear here</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* System Status */}
        <motion.div variants={stagger.item} className="glass-card-elevated rounded-2xl p-4 hud-corners">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 glow-cyan">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground font-mono mb-1">System Status ⚡</p>
              <p className="text-xs text-muted-foreground font-mono leading-relaxed">
                Grid stable. Wallet → meter transfers active. M-Pesa recharge operational.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <BottomNav active="/" />
    </div>
  );
}
