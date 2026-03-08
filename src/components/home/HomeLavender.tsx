import {
  Bell, Zap, ArrowRight,
  CreditCard, ArrowLeftRight, BarChart3, ChevronRight,
  Sparkles, Heart, Star
} from "lucide-react";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { cn } from "@/lib/utils";
import { Sounds } from "@/lib/sounds";
import { HomeData, getTimeAgo } from "./HomeDataProvider";

/* Soft lavender gauge */
const LavenderGauge = ({ pct, isLow, balance }: { pct: number; isLow: boolean; balance: number }) => (
  <div className="relative w-full flex flex-col items-center py-6">
    <div className="relative w-36 h-36">
      <div className="absolute inset-0 rounded-full border-4 border-primary/10" />
      <div className="absolute inset-2 rounded-full bg-gradient-to-b from-primary/5 to-accent/5 overflow-hidden">
        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-primary/30 to-primary/5"
          initial={{ height: 0 }}
          animate={{ height: `${pct}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
        />
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Sparkles className="w-5 h-5 text-primary mb-1" />
        <span className="text-2xl font-bold text-foreground">{balance.toFixed(1)}</span>
        <span className="text-[10px] text-muted-foreground">kWh</span>
      </div>
    </div>
    <div className="mt-3 flex items-center gap-2">
      <div className="h-1.5 rounded-full flex-1 max-w-32 bg-muted overflow-hidden">
        <motion.div className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
          initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1 }} />
      </div>
      <span className="text-xs text-muted-foreground">{pct}%</span>
    </div>
  </div>
);

const HomeLavender = ({ data }: { data: HomeData }) => {
  const { wallet, recentTxs, meterCount, unreadCount, balance, max, pct, isLow, firstName, greeting, navigate } = data;
  const quickActions = [
    { icon: CreditCard, label: "Recharge", path: "/recharge", color: "bg-primary/10 text-primary" },
    { icon: ArrowLeftRight, label: "Transfer", path: "/transfer", color: "bg-accent/10 text-accent" },
    { icon: BarChart3, label: "Analytics", path: "/analytics", color: "bg-success/10 text-success" },
    { icon: Zap, label: "Meters", path: "/meters", color: "bg-primary/10 text-primary" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-14 pb-2 flex items-center justify-between animate-fade-in">
        <div>
          <p className="text-xs text-muted-foreground">{greeting} ✨</p>
          <h1 className="text-xl font-bold text-foreground">{firstName}</h1>
        </div>
        <button onClick={() => { navigate("/notifications"); Sounds.tap(); }}
          className="relative p-2.5 rounded-xl bg-secondary/80 hover:bg-secondary transition-colors">
          <Bell className="w-5 h-5 text-foreground" />
          {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">{unreadCount}</span>}
        </button>
      </div>

      <div className="px-5 space-y-5">
        {/* Wallet */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card-elevated rounded-3xl p-5 border border-primary/10">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">Energy Wallet</span>
            </div>
            {isLow && <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/10 text-destructive font-medium">Low</span>}
          </div>
          <LavenderGauge pct={pct} isLow={isLow} balance={balance} />
        </motion.div>

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action, i) => (
            <motion.button key={action.label}
              initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}
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

        {/* Transactions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
            <button onClick={() => navigate("/analytics")} className="text-xs text-primary flex items-center gap-0.5 hover:underline">
              View all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {recentTxs.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-center border border-border/20">
              <Star className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
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

export default HomeLavender;
