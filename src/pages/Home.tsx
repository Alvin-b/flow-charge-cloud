import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Zap, TrendingUp, TrendingDown, ArrowRight, Battery, Wifi, Lightbulb, AlertCircle } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useTheme } from "@/components/ThemeProvider";
import { cn } from "@/lib/utils";

const mockTransactions = [
  { id: 1, type: "recharge", label: "M-Pesa Recharge", amount: "+24.5 kWh", value: "+KES 500", time: "2h ago", icon: "💳", color: "text-success" },
  { id: 2, type: "usage", label: "Daily Consumption", amount: "-3.2 kWh", value: "-KES 65", time: "5h ago", icon: "⚡", color: "text-destructive" },
  { id: 3, type: "transfer", label: "Transfer to James", amount: "-5.0 kWh", value: "-KES 102", time: "1d ago", icon: "🔄", color: "text-accent" },
];

// Wallet balance mock data
const WALLET = { balance: 87.4, max: 200, daily_avg: 7.2, days_left: 12, vs_yesterday: 18 };

// Circular energy gauge
const EnergyGauge = ({ balance, max }: { balance: number; max: number }) => {
  const pct = Math.min(100, Math.round((balance / max) * 100));
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
  const [notifCount] = useState(3);
  const pct = Math.min(100, Math.round((WALLET.balance / WALLET.max) * 100));
  const isLow = pct < 20;

  return (
    <div className={cn("min-h-screen pb-24 relative", theme === "dark" ? "gradient-navy" : "bg-background")}>
      {/* Orbs */}
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute top-60 left-0 w-60 h-60 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center justify-between animate-fade-in">
        <div>
          <p className="text-muted-foreground text-sm">Good morning ☀️</p>
          <h2 className="text-xl font-bold text-foreground">James Kamau</h2>
        </div>
        <button
          onClick={() => navigate("/notifications")}
          className="relative p-2.5 glass-card rounded-xl border border-border/30"
        >
          <Bell className="w-5 h-5 text-foreground" />
          {notifCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent rounded-full text-[10px] font-bold flex items-center justify-center text-[hsl(var(--navy))]">
              {notifCount}
            </span>
          )}
        </button>
      </div>

      <div className="px-5 space-y-4">
        {/* Wallet card — shows percentage prominently */}
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
            {/* Circular gauge */}
            <EnergyGauge balance={WALLET.balance} max={WALLET.max} />

            {/* Right side info */}
            <div className="flex-1">
              <p className="text-xs text-primary/70 uppercase tracking-widest mb-1">Energy Wallet</p>

              {/* Large % display */}
              <div className="flex items-end gap-1.5 mb-0.5">
                <span className={`text-5xl font-bold glow-cyan-text ${isLow ? "text-destructive" : "text-foreground"}`}>
                  {pct}
                </span>
                <span className="text-primary font-semibold text-xl mb-1.5">%</span>
              </div>
              <p className="text-muted-foreground text-xs">{WALLET.balance} kWh · ≈ KES {(WALLET.balance * 20.43).toFixed(0)}</p>

              {/* Low balance warning */}
              {isLow && (
                <div className="flex items-center gap-1.5 mt-2 bg-destructive/15 rounded-lg px-2.5 py-1.5 border border-destructive/20">
                  <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                  <p className="text-[10px] text-destructive font-medium">Low balance — recharge now</p>
                </div>
              )}

              {/* Stats */}
              <div className="flex gap-2 mt-3">
                <div className="glass rounded-lg px-2.5 py-1.5 border border-white/5">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Battery className="w-3 h-3 text-success" />
                    <span className="text-[9px] text-muted-foreground uppercase">Est.</span>
                  </div>
                  <span className="text-base font-bold text-success">{WALLET.days_left}d</span>
                </div>
                <div className="glass rounded-lg px-2.5 py-1.5 border border-white/5">
                  <div className="flex items-center gap-1 mb-0.5">
                    <TrendingDown className="w-3 h-3 text-primary" />
                    <span className="text-[9px] text-muted-foreground uppercase">Avg</span>
                  </div>
                  <span className="text-base font-bold text-foreground">{WALLET.daily_avg} <span className="text-[9px]">kWh</span></span>
                </div>
                <div className="glass rounded-lg px-2.5 py-1.5 border border-white/5">
                  <div className="flex items-center gap-1 mb-0.5">
                    <TrendingUp className="w-3 h-3 text-accent" />
                    <span className="text-[9px] text-muted-foreground uppercase">vs yest</span>
                  </div>
                  <span className="text-base font-bold text-accent">+{WALLET.vs_yesterday}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active meter */}
        <div className="glass-card rounded-2xl p-4 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Zap className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">Nairobi Apartment</p>
                  <span className="flex items-center gap-1 text-[10px] bg-success/15 text-success rounded-full px-2 py-0.5">
                    <Wifi className="w-2.5 h-2.5" /> Online
                  </span>
                </div>
                <p className="text-xs text-muted-foreground/70 font-mono mt-0.5">eb5f6f5cbf5f7c6f39pjoa</p>
                <p className="text-xs text-muted-foreground mt-0.5">Karen Estate · 0.45 kWh/hr</p>
              </div>
            </div>
            <button onClick={() => navigate("/meters")} className="text-primary">
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mini progress bar on meter card */}
          <div className="mt-3">
            <div className="flex justify-between mb-1">
              <span className="text-[9px] text-muted-foreground uppercase">Balance</span>
              <span className="text-[9px] text-primary font-semibold">{pct}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-muted/30">
              <div
                className="h-1.5 rounded-full gradient-cyan transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Smart insight */}
        <div className="flex gap-3 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          <div className="glass-card rounded-2xl p-4 flex-1 flex flex-col justify-between border-l-2 border-accent">
            <Lightbulb className="w-5 h-5 text-accent mb-2" />
            <p className="text-xs text-foreground leading-relaxed">
              You used <span className="text-accent font-bold">18% more</span> than yesterday
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">Power lasts <span className="text-success font-medium">{WALLET.days_left} days</span> at current rate</p>
          </div>
          <div className="glass-card rounded-2xl p-4 flex-1 border-l-2 border-primary">
            <p className="text-[10px] text-muted-foreground mb-1">Peak hour today</p>
            <p className="text-sm font-bold text-foreground">6:00 PM</p>
            <p className="text-[10px] text-primary mt-0.5">1.2 kWh consumed</p>
            <p className="text-[10px] text-muted-foreground mt-2">Capacity remaining</p>
            <p className="text-sm font-bold text-foreground">{WALLET.max - WALLET.balance} kWh</p>
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

        {/* Recent transactions */}
        <div className="animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Recent Transactions</h3>
            <button className="text-xs text-primary font-medium">See all</button>
          </div>
          <div className="glass-card rounded-2xl overflow-hidden">
            {mockTransactions.map((tx, i) => (
              <div key={tx.id} className={`flex items-center gap-3 p-4 ${i < mockTransactions.length - 1 ? "border-b border-border/30" : ""}`}>
                <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center text-xl">
                  {tx.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{tx.label}</p>
                  <p className="text-xs text-muted-foreground">{tx.time}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${tx.color}`}>{tx.amount}</p>
                  <p className="text-xs text-muted-foreground">{tx.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav active="/" />
    </div>
  );
};

export default Home;
