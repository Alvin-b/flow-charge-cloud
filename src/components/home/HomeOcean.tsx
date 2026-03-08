import {
  Bell, Zap, ArrowRight,
  CreditCard, ArrowLeftRight, BarChart3, Activity, ChevronRight, Bolt,
  Waves, Droplets, Compass, Wind
} from "lucide-react";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { cn } from "@/lib/utils";
import { Sounds } from "@/lib/sounds";
import { HomeData, getTimeAgo } from "./HomeDataProvider";

/* Flowing wave SVG background decoration */
const WaveDecoration = () => (
  <div className="absolute bottom-0 left-0 right-0 overflow-hidden h-32 opacity-10 pointer-events-none">
    <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full">
      <path d="M0,60 C300,100 600,20 900,60 C1050,80 1150,40 1200,60 L1200,120 L0,120 Z" fill="hsl(var(--primary))" />
      <path d="M0,80 C200,40 500,100 800,60 C950,40 1100,80 1200,70 L1200,120 L0,120 Z" fill="hsl(var(--primary))" opacity="0.5" />
    </svg>
  </div>
);

/* Circular water-drop style gauge */
const WaterGauge = ({ pct, isLow, balance }: { pct: number; isLow: boolean; balance: number }) => (
  <div className="relative w-full flex flex-col items-center py-6">
    <div className="relative w-40 h-40">
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
      {/* Fill background */}
      <div className="absolute inset-2 rounded-full bg-primary/5 overflow-hidden">
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: `${pct}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="absolute bottom-0 left-0 right-0 bg-primary/15 rounded-b-full"
        />
      </div>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Droplets className={cn("w-6 h-6 mb-1", isLow ? "text-destructive" : "text-primary")} />
        <span className={cn("text-4xl font-light tracking-tight", isLow ? "text-destructive" : "text-foreground")}>
          {balance.toFixed(1)}
        </span>
        <span className="text-xs text-muted-foreground mt-0.5">kWh available</span>
      </div>
    </div>
    {/* Progress dots */}
    <div className="flex gap-1.5 mt-4">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className={cn(
          "w-2 h-2 rounded-full transition-all duration-300",
          i < Math.ceil(pct / 10) ? "bg-primary" : "bg-primary/10"
        )} />
      ))}
    </div>
  </div>
);

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const } }),
};

const quickActions = [
  { label: "Recharge", icon: CreditCard, path: "/recharge", desc: "Buy energy" },
  { label: "Transfer", icon: ArrowLeftRight, path: "/transfer", desc: "Send kWh" },
  { label: "Meters", icon: Bolt, path: "/meters", desc: "Manage" },
  { label: "Analytics", icon: BarChart3, path: "/analytics", desc: "Insights" },
];

export default function HomeOcean({ data }: { data: HomeData }) {
  const { navigate, profile, balance, pct, isLow, meterCount, unreadCount, firstName, greeting, recentTxs } = data;

  return (
    <div className="min-h-screen pb-28 bg-background relative overflow-hidden">
      {/* Soft ambient gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute bottom-40 right-0 w-[300px] h-[300px] rounded-full bg-accent/5 blur-[80px]" />
      </div>

      {/* Header — clean, airy */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
        className="relative px-6 pt-14 pb-4 flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-light">{greeting},</p>
          <h1 className="text-2xl font-semibold text-foreground mt-0.5">{firstName}</h1>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => { Sounds.tap(); navigate("/notifications"); }}
            className="relative p-3 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 hover:bg-card transition-colors">
            <Bell className="w-5 h-5 text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-primary" />
            )}
          </button>
        </div>
      </motion.div>

      <div className="relative px-6 space-y-6 mt-1">
        {/* Balance Card — soft, rounded, flowing */}
        <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show"
          className="rounded-3xl bg-card/80 backdrop-blur-md border border-border/30 p-5 relative overflow-hidden">
          <WaveDecoration />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Waves className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Energy Balance</span>
            </div>
            <WaterGauge pct={pct} isLow={isLow} balance={balance} />
            <div className="flex items-center justify-between mt-2 px-2">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Value</p>
                <p className="text-sm font-medium text-foreground">KES {(balance * 24).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Meters</p>
                <p className="text-sm font-medium text-foreground">{meterCount} active</p>
              </div>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className={cn("text-sm font-medium", isLow ? "text-destructive" : "text-primary")}>
                  {isLow ? "Low" : "Healthy"}
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {isLow && (
          <motion.button custom={1} variants={fadeUp} initial="hidden" animate="show"
            onClick={() => navigate("/recharge")}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 hover:bg-destructive/15 transition-colors">
            <Zap className="w-5 h-5 text-destructive" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-destructive">Energy running low</p>
              <p className="text-xs text-destructive/70">Tap to recharge your wallet</p>
            </div>
            <ArrowRight className="w-4 h-4 text-destructive" />
          </motion.button>
        )}

        {/* Quick Actions — horizontal pills */}
        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="show">
          <p className="text-sm text-muted-foreground mb-3">Quick actions</p>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map(({ label, icon: Icon, path, desc }) => (
              <motion.button key={label} whileTap={{ scale: 0.97 }}
                onClick={() => { Sounds.tap(); navigate(path); }}
                className="flex items-center gap-3 p-4 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/30 hover:bg-card transition-all text-left">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{desc}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Recent Transactions — clean list */}
        <motion.div custom={3} variants={fadeUp} initial="hidden" animate="show">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">Recent activity</p>
            {recentTxs.length > 0 && (
              <button onClick={() => navigate("/analytics")} className="text-xs text-primary flex items-center gap-0.5">
                View all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="rounded-2xl bg-card/80 backdrop-blur-sm border border-border/30 overflow-hidden">
            {recentTxs.length > 0 ? recentTxs.slice(0, 4).map((tx, i) => {
              const isCredit = tx.type === "recharge" || tx.type === "transfer_in";
              const title = tx.type === "recharge" ? "Recharge" : tx.type === "transfer_out" ? "Sent" : tx.type === "transfer_in" ? "Received" : "Meter Transfer";
              return (
                <div key={tx.id}
                  className={cn("flex items-center gap-3 px-4 py-3.5 transition-colors", i < Math.min(recentTxs.length, 4) - 1 && "border-b border-border/30")}>
                  <div className={cn("w-9 h-9 rounded-full flex items-center justify-center", isCredit ? "bg-primary/10" : "bg-accent/10")}>
                    {isCredit ? <ArrowRight className="w-4 h-4 text-primary rotate-[135deg]" /> : <ArrowRight className="w-4 h-4 text-accent -rotate-45" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground">{getTimeAgo(tx.created_at)}</p>
                  </div>
                  <p className={cn("text-sm font-medium", isCredit ? "text-primary" : "text-foreground")}>
                    {isCredit ? "+" : "-"}{tx.amount_kwh} kWh
                  </p>
                </div>
              );
            }) : (
              <div className="px-4 py-10 text-center">
                <Compass className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No activity yet</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">Your transactions will show here</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Status bar */}
        <motion.div custom={4} variants={fadeUp} initial="hidden" animate="show"
          className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-primary/5 border border-primary/10">
          <Wind className="w-4 h-4 text-primary/60" />
          <p className="text-xs text-muted-foreground">All systems operational · Grid stable</p>
        </motion.div>
      </div>

      <BottomNav active="/" />
    </div>
  );
}
