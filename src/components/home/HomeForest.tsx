import {
  Bell, Zap, ArrowRight,
  CreditCard, ArrowLeftRight, BarChart3, ChevronRight,
  TreePine, Leaf, Wind
} from "lucide-react";
import { motion } from "framer-motion";
import BottomNav from "@/components/BottomNav";
import { cn } from "@/lib/utils";
import { Sounds } from "@/lib/sounds";
import { HomeData, getTimeAgo } from "./HomeDataProvider";

/* Nature ring gauge */
const ForestGauge = ({ pct, isLow, balance }: { pct: number; isLow: boolean; balance: number }) => {
  const r = 56;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * pct) / 100;
  return (
    <div className="relative w-full flex flex-col items-center py-6">
      <div className="relative">
        <svg width="136" height="136" viewBox="0 0 136 136">
          <circle cx="68" cy="68" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="10" opacity="0.15" />
          <circle cx="68" cy="68" r={r} fill="none"
            stroke={isLow ? "hsl(var(--destructive))" : "hsl(var(--success))"}
            strokeWidth="10" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            transform="rotate(-90 68 68)"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Leaf className="w-5 h-5 text-success mb-1" />
          <span className="text-2xl font-bold text-foreground">{balance.toFixed(1)}</span>
          <span className="text-[10px] text-muted-foreground">kWh</span>
        </div>
      </div>
    </div>
  );
};

const HomeForest = ({ data }: { data: HomeData }) => {
  const { wallet, recentTxs, meterCount, unreadCount, balance, max, pct, isLow, firstName, greeting, navigate } = data;
  const quickActions = [
    { icon: CreditCard, label: "Recharge", path: "/recharge", color: "bg-success/10 text-success" },
    { icon: ArrowLeftRight, label: "Transfer", path: "/transfer", color: "bg-primary/10 text-primary" },
    { icon: BarChart3, label: "Analytics", path: "/analytics", color: "bg-accent/10 text-accent" },
    { icon: Zap, label: "Meters", path: "/meters", color: "bg-success/10 text-success" },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="px-5 pt-14 pb-2 flex items-center justify-between animate-fade-in">
        <div>
          <p className="text-xs text-muted-foreground">{greeting} 🌿</p>
          <h1 className="text-xl font-bold text-foreground">{firstName}</h1>
        </div>
        <button onClick={() => { navigate("/notifications"); Sounds.tap(); }}
          className="relative p-2.5 rounded-xl bg-secondary/80 hover:bg-secondary transition-colors">
          <Bell className="w-5 h-5 text-foreground" />
          {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-success text-[10px] font-bold text-success-foreground flex items-center justify-center">{unreadCount}</span>}
        </button>
      </div>

      <div className="px-5 space-y-5">
        {/* Wallet */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card-elevated rounded-3xl p-5 border border-success/10">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <TreePine className="w-4 h-4 text-success" />
              <span className="text-xs font-medium text-muted-foreground">Energy Balance</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Wind className="w-3 h-3" />
              <span>{meterCount} meter{meterCount !== 1 ? "s" : ""}</span>
            </div>
          </div>
          <ForestGauge pct={pct} isLow={isLow} balance={balance} />
          {isLow && (
            <div className="text-center">
              <span className="text-[10px] px-3 py-1 rounded-full bg-destructive/10 text-destructive font-medium">
                Low balance — recharge now
              </span>
            </div>
          )}
        </motion.div>

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-3">
          {quickActions.map((action, i) => (
            <motion.button key={action.label}
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.05 }}
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
            <button onClick={() => navigate("/analytics")} className="text-xs text-success flex items-center gap-0.5 hover:underline">
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

export default HomeForest;
