import {
  Bell, Zap, ArrowRight, ArrowUpRight, ArrowDownLeft,
  CreditCard, ArrowLeftRight, BarChart3, Bolt, ChevronRight,
  Plus, Minus
} from "lucide-react";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { cn } from "@/lib/utils";
import { Sounds } from "@/lib/sounds";
import { HomeData, getTimeAgo } from "./HomeDataProvider";

/* Ultra-minimal thin line gauge */
const MinimalGauge = ({ pct, isLow }: { pct: number; isLow: boolean }) => (
  <div className="w-full">
    <div className="h-1 rounded-full bg-border overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: "easeOut" }}
        className={cn("h-full rounded-full", isLow ? "bg-destructive" : "bg-foreground")}
      />
    </div>
    <div className="flex justify-between mt-1.5">
      <span className="text-[10px] text-muted-foreground">{pct}% capacity</span>
      <span className="text-[10px] text-muted-foreground">{isLow ? "Low" : "Normal"}</span>
    </div>
  </div>
);

const quickActions = [
  { label: "Recharge", icon: Plus, path: "/recharge" },
  { label: "Transfer", icon: ArrowLeftRight, path: "/transfer" },
  { label: "Meters", icon: Bolt, path: "/meters" },
  { label: "Stats", icon: BarChart3, path: "/analytics" },
];

export default function HomeMinimal({ data }: { data: HomeData }) {
  const { navigate, balance, pct, isLow, meterCount, unreadCount, firstName, greeting, recentTxs } = data;

  return (
    <div className="min-h-screen pb-28 bg-background">
      {/* Header — extremely minimal */}
      <div className="px-6 pt-14 pb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">{greeting}</p>
          <h1 className="text-xl font-medium text-foreground mt-0.5 tracking-tight">{firstName}</h1>
        </div>
        <button onClick={() => { Sounds.tap(); navigate("/notifications"); }}
          className="relative p-2 rounded-full hover:bg-secondary/50 transition-colors">
          <Bell className="w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
          {unreadCount > 0 && <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-foreground" />}
        </button>
      </div>

      <div className="px-6 space-y-8">
        {/* Balance — typographic focus, no cards */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">Balance</p>
          <div className="flex items-end gap-2 mb-1">
            <span className={cn("text-5xl font-extralight tracking-tighter tabular-nums", isLow ? "text-destructive" : "text-foreground")}>
              {balance.toFixed(1)}
            </span>
            <span className="text-lg text-muted-foreground font-light mb-1.5">kWh</span>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            ≈ KES {(balance * 24).toLocaleString(undefined, { maximumFractionDigits: 0 })}
            {meterCount > 0 && <span className="ml-2">· {meterCount} meter{meterCount !== 1 ? "s" : ""}</span>}
          </p>
          <MinimalGauge pct={pct} isLow={isLow} />
        </motion.div>

        {isLow && (
          <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            onClick={() => navigate("/recharge")}
            className="w-full text-left py-3 px-4 border border-destructive/20 rounded-lg hover:bg-destructive/5 transition-colors flex items-center justify-between">
            <span className="text-sm text-destructive">Low balance — recharge now</span>
            <ArrowRight className="w-4 h-4 text-destructive" />
          </motion.button>
        )}

        {/* Quick Actions — text-based list */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <div className="border-t border-border pt-6">
            <div className="grid grid-cols-4 gap-0">
              {quickActions.map(({ label, icon: Icon, path }) => (
                <button key={label}
                  onClick={() => { Sounds.tap(); navigate(path); }}
                  className="flex flex-col items-center gap-2 py-3 hover:bg-secondary/30 rounded-lg transition-colors">
                  <div className="w-11 h-11 rounded-full border border-border flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5 text-foreground" strokeWidth={1.5} />
                  </div>
                  <span className="text-[11px] text-muted-foreground">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Meters — minimal inline */}
        {meterCount > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <button onClick={() => navigate("/meters")}
              className="w-full flex items-center justify-between py-4 border-t border-b border-border hover:bg-secondary/20 transition-colors">
              <div className="flex items-center gap-3">
                <Zap className="w-4 h-4 text-foreground" strokeWidth={1.5} />
                <div className="text-left">
                  <p className="text-sm text-foreground">{meterCount} meter{meterCount !== 1 ? "s" : ""} connected</p>
                  <p className="text-xs text-muted-foreground">Manage & transfer energy</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </motion.div>
        )}

        {/* Recent Activity — clean, borderless list */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-widest">Activity</p>
            {recentTxs.length > 0 && (
              <button onClick={() => navigate("/analytics")} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                See all
              </button>
            )}
          </div>
          {recentTxs.length > 0 ? (
            <div className="space-y-0">
              {recentTxs.slice(0, 5).map((tx, i) => {
                const isCredit = tx.type === "recharge" || tx.type === "transfer_in";
                const title = tx.type === "recharge" ? "Recharge" : tx.type === "transfer_out" ? "Sent" : tx.type === "transfer_in" ? "Received" : "Meter Transfer";
                return (
                  <div key={tx.id} className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center">
                      {isCredit ? <ArrowDownLeft className="w-3.5 h-3.5 text-foreground" strokeWidth={1.5} /> : <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{title}</p>
                      <p className="text-xs text-muted-foreground">{getTimeAgo(tx.created_at)}</p>
                    </div>
                    <p className={cn("text-sm tabular-nums", isCredit ? "text-foreground" : "text-muted-foreground")}>
                      {isCredit ? "+" : "−"}{tx.amount_kwh} kWh
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div>
          )}
        </motion.div>
      </div>

      <BottomNav active="/" />
    </div>
  );
}
