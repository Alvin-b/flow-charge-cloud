import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, Zap, Clock, Activity, Flame, Sparkles } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from "recharts";
import BottomNav from "@/components/BottomNav";

const dailyData = [
  { day: "Mon", kwh: 6.2 },
  { day: "Tue", kwh: 8.1 },
  { day: "Wed", kwh: 5.5 },
  { day: "Thu", kwh: 9.3 },
  { day: "Fri", kwh: 7.8 },
  { day: "Sat", kwh: 11.2 },
  { day: "Sun", kwh: 7.4 },
];

const weeklyData = [
  { week: "W1", kwh: 45.2 },
  { week: "W2", kwh: 52.8 },
  { week: "W3", kwh: 48.1 },
  { week: "W4", kwh: 55.7 },
];

const hourlyData = [
  { hr: "6AM", kw: 0.3 }, { hr: "8AM", kw: 0.8 }, { hr: "10AM", kw: 0.5 },
  { hr: "12PM", kw: 0.6 }, { hr: "2PM", kw: 0.7 }, { hr: "4PM", kw: 0.9 },
  { hr: "6PM", kw: 1.8 }, { hr: "8PM", kw: 1.2 }, { hr: "10PM", kw: 0.5 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card-elevated rounded-xl px-3 py-2 border border-primary/20">
        <p className="text-[10px] text-muted-foreground uppercase">{label}</p>
        <p className="text-sm font-bold text-primary">{payload[0].value} kWh</p>
      </div>
    );
  }
  return null;
};

type Tab = "daily" | "weekly" | "monthly";

const Analytics = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("daily");

  return (
    <div className="min-h-screen gradient-navy pb-28 relative overflow-hidden">
      <div className="absolute inset-0 gradient-mesh pointer-events-none" />
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-primary/4 blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="relative px-5 pt-14 pb-4 flex items-center gap-3 animate-fade-in">
        <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-muted/30 transition-colors card-interactive">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Analytics</h1>
          <p className="text-xs text-muted-foreground">Your energy consumption patterns</p>
        </div>
      </div>

      <div className="relative px-5 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 animate-fade-in-up">
          {[
            { label: "This Month", val: "201.8", unit: "kWh", icon: Zap, color: "text-primary", bg: "bg-primary/10", border: "border-primary/15" },
            { label: "vs Last Mo.", val: "+12%", unit: "", icon: TrendingUp, color: "text-accent", bg: "bg-accent/10", border: "border-accent/15" },
            { label: "Avg Daily", val: "7.2", unit: "kWh", icon: TrendingDown, color: "text-success", bg: "bg-success/10", border: "border-success/15" },
          ].map(({ label, val, unit, icon: Icon, color, bg, border }) => (
            <div key={label} className={`glass-card-elevated rounded-2xl p-3.5 border ${border}`}>
              <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-2.5`}>
                <Icon className={`w-4.5 h-4.5 ${color}`} />
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className={`text-lg font-bold ${color} mt-0.5`}>{val}<span className="text-[10px] font-normal text-muted-foreground ml-0.5">{unit}</span></p>
            </div>
          ))}
        </div>

        {/* Tab selector */}
        <div className="flex glass-card rounded-2xl p-1 gap-1 border border-border/10 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          {(["daily", "weekly", "monthly"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-all duration-300 ${
                tab === t ? "gradient-cyan text-[hsl(var(--navy))] font-bold shadow-lg shadow-primary/20" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Charts */}
        <div className="glass-card-elevated rounded-2xl p-5 border border-border/10 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          <h3 className="text-sm font-bold text-foreground mb-1">
            {tab === "daily" ? "Past 7 Days" : tab === "weekly" ? "Past 4 Weeks" : "Monthly Overview"}
          </h3>
          <p className="text-[10px] text-muted-foreground mb-4">Energy consumption in kWh</p>

          {tab === "daily" && (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyData} barSize={28}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(191, 100%, 50%)" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(210, 100%, 60%)" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 35%, 15%)" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(228, 15%, 50%)", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(228, 15%, 50%)", fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="kwh" fill="url(#barGrad)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {tab === "weekly" && (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(191, 100%, 50%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(191, 100%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(228, 35%, 15%)" vertical={false} />
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "hsl(228, 15%, 50%)", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(228, 15%, 50%)", fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="kwh" stroke="hsl(191, 100%, 50%)" strokeWidth={2.5} fill="url(#areaGrad)" dot={{ fill: "hsl(191, 100%, 50%)", r: 5, strokeWidth: 2, stroke: "hsl(228, 50%, 9%)" }} />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {tab === "monthly" && (
            <div className="space-y-5 py-2">
              {[
                { month: "January", kwh: 185.4, cost: 3791, bar: 72 },
                { month: "February", kwh: 201.8, cost: 4127, bar: 85 },
              ].map(({ month, kwh, cost, bar }) => (
                <div key={month}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-foreground font-semibold">{month}</span>
                    <span className="text-primary font-bold">{kwh} kWh</span>
                  </div>
                  <div className="h-3 bg-muted/20 rounded-full overflow-hidden">
                    <div className="h-full gradient-cyan rounded-full transition-all duration-1000" style={{ width: `${bar}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">KES {cost.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Real-time Usage Curve */}
        <div className="glass-card-elevated rounded-2xl p-5 border border-border/10 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center">
              <Flame className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Today's Load Curve</p>
              <p className="text-[10px] text-muted-foreground">Hourly power draw (kW)</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={hourlyData}>
              <defs>
                <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hr" axisLine={false} tickLine={false} tick={{ fill: "hsl(228, 15%, 50%)", fontSize: 9 }} interval={1} />
              <Tooltip content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="glass-card-elevated rounded-xl px-3 py-2 border border-accent/20">
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="text-sm font-bold text-accent">{payload[0].value} kW</p>
                  </div>
                ) : null
              } />
              <Area type="monotone" dataKey="kw" stroke="hsl(38, 92%, 50%)" strokeWidth={2} fill="url(#loadGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-muted-foreground">Peak: <span className="text-accent font-bold">1.8 kW at 6 PM</span></span>
            <span className="text-[10px] text-muted-foreground">Min: <span className="text-success font-bold">0.3 kW at 6 AM</span></span>
          </div>
        </div>

        {/* Appliance hints */}
        <div className="glass-card rounded-2xl p-4 border border-primary/10 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-primary" />
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Monthly equivalent</p>
          </div>
          <div className="space-y-3">
            {[
              { icon: "🧊", label: "Running a fridge", val: "3 days" },
              { icon: "💡", label: "100W bulb on", val: "2,018 hours" },
              { icon: "📺", label: "Watching TV", val: "402 hours" },
              { icon: "🔌", label: "Phone charging", val: "16,144 charges" },
            ].map(({ icon, label, val }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xl w-8 text-center">{icon}</span>
                <span className="text-sm text-muted-foreground flex-1">{label}</span>
                <span className="text-sm font-bold text-foreground">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <BottomNav active="/analytics" />
    </div>
  );
};

export default Analytics;
