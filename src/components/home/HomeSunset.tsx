import {
  Bell, Zap, ArrowRight,
  CreditCard, ArrowLeftRight, BarChart3, ChevronRight,
  Sun, Leaf, Flame
} from "lucide-react";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { cn } from "@/lib/utils";
import { Sounds } from "@/lib/sounds";
import { HomeData, getTimeAgo } from "./HomeDataProvider";

/* Warm radial gradient gauge */
const SunsetGauge = ({ pct, isLow, balance }: { pct: number; isLow: boolean; balance: number }) => (
  <div className="relative w-full flex flex-col items-center py-6">
    <div className="relative w-36 h-36">
      <div className="absolute inset-0 rounded-full border-4 border-accent/10" />
      <div className="absolute inset-2 rounded-full bg-gradient-to-b from-accent/10 to-destructive/5 overflow-hidden">
        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-accent/40 to-accent/10"
          initial={{ height: 0 }}
          animate={{ height: `${pct}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Flame className="w-5 h-5 text-accent mb-1" />
        <span className="text-2xl font-bold text-foreground">{balance.toFixed(1)}</span>
        <span className="text-[10px] text-muted-foreground">kWh</span>
      </div>
    </div>
    <div className="mt-3 flex items-center gap-2">
      <div className={cn("h-1.5 rounded-full flex-1 max-w-32 bg-muted overflow-hidden")}>
        <motion.div className="h-full bg-gradient-to-r from-accent to-destructive rounded-full"
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }} />
      </div>
      <span className="text-xs text-muted-foreground">{pct}%</span>
    </div>
  </div>
);

const HomeSunset = ({ data }: { data: HomeData }) => {
  const { wallet, recentTxs, meterCount, unreadCount, balance, max, pct, isLow, firstName, greeting, navigate } = data;
  const quickActions = [
    { icon: CreditCard, label: "Recharge", path: "/recharge", color: "bg-accent/10 text-accent" },
    { icon: ArrowLeftRight, label: "Transfer", path: "/transfer", color: "bg-destructive/10 text-destructive" },
    { icon: BarChart3, label: "Analytics", path: "/analytics", color: "bg-primary/10 text-primary" },
    { icon: Zap, label: "Meters", path: "/meters", color: "bg-success/10 text-success" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="px-5 pt-14 pb-2 flex items-center justify-between animate-fade-in">
        <div>
          <p className="text-xs text-muted-foreground">{greeting} ☀️</p>
          <h1 className="text-xl font-bold text-foreground">{firstName}</h1>
        </div>
        <button onClick={() => { navigate("/notifications"); Sounds.tap(); }}
          className="relative p-2.5 rounded-xl bg-secondary/80 hover:bg-secondary transition-colors">
          <Bell className="w-5 h-5 text-foreground" />
          {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent text-[10px] font-bold text-accent-foreground flex items-center justify-center">{unreadCount}</span>}
        </button>
      </div>

      <div className="px-5 space-y-5">
        {/* Wallet card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card-elevated rounded-3xl p-5 border border-accent/10">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-accent" />
              <span className="text-xs font-medium text-muted-foreground">Energy Wallet</span>
            </div>
            {isLow && <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">Low Balance</span>}
          </div>
          <SunsetGauge pct={pct} isLow={isLow} balance={balance} />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>0 kWh</span>
            <span>{max} kWh max</span>
          </div>
        </motion.div>

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action, i) => (
            <motion.button key={action.label}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
              onClick={() => { navigate(action.path); Sounds.tap(); }}
              className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-secondary/50 hover:bg-secondary transition-colors">
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", action.color)}>
                <action.icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium text-foreground">{action.label}</span>
            </motion.button>
          ))}
        </div>

        {/* Recent transactions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
            <button onClick={() => navigate("/analytics")} className="text-xs text-accent flex items-center gap-0.5 hover:underline">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {recentTxs.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-center border border-border/20">
              <p className="text-sm text-muted-foreground">No transactions yet</p>
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden border border-border/20">
              {recentTxs.slice(0, 4).map((tx, i) => (
                <div key={tx.id} className={`flex items-center gap-3 p-3.5 ${i < Math.min(recentTxs.length, 4) - 1 ? "border-b border-border/30" : ""}`}>
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center",
                    tx.type === "recharge" ? "bg-success/10" : tx.type === "transfer_out" ? "bg-destructive/10" : "bg-primary/10"
                  )}>
                    <Zap className={cn("w-4 h-4",
                      tx.type === "recharge" ? "text-success" : tx.type === "transfer_out" ? "text-destructive" : "text-primary"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground capitalize truncate">{tx.type.replace("_", " ")}</p>
                    <p className="text-[10px] text-muted-foreground">{getTimeAgo(tx.created_at)}</p>
                  </div>
                  <span className={cn("text-sm font-bold",
                    tx.type === "recharge" || tx.type === "transfer_in" ? "text-success" : "text-destructive"
                  )}>
                    {tx.type === "recharge" || tx.type === "transfer_in" ? "+" : "-"}{tx.amount_kwh} kWh
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <BottomNav active="/" />
    </div>
  );
};

export default HomeSunset;
