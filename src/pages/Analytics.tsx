import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, Zap, Clock } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-card rounded-xl px-3 py-2 border border-primary/20">
        <p className="text-xs text-muted-foreground">{label}</p>
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
    <div className="min-h-screen gradient-navy pb-24">
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center gap-3 animate-fade-in">
        <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-muted/30 transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Usage Analytics</h1>
      </div>

      <div className="px-5 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 animate-fade-in-up">
          {[
            { label: "This Month", val: "201.8", unit: "kWh", icon: Zap, color: "text-primary", bg: "bg-primary/10" },
            { label: "vs Last Mo.", val: "+12%", unit: "", icon: TrendingUp, color: "text-accent", bg: "bg-accent/10" },
            { label: "Avg Daily", val: "7.2", unit: "kWh", icon: TrendingDown, color: "text-success", bg: "bg-success/10" },
          ].map(({ label, val, unit, icon: Icon, color, bg }) => (
            <div key={label} className="glass-card rounded-2xl p-3 border border-border/20">
              <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-2`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className={`text-base font-bold ${color}`}>{val}<span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span></p>
            </div>
          ))}
        </div>

        {/* Tab selector */}
        <div className="flex glass-card rounded-2xl p-1 gap-1 border border-border/20 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          {(["daily", "weekly", "monthly"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${
                tab === t ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Charts */}
        <div className="glass-card rounded-2xl p-4 border border-border/20 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {tab === "daily" ? "Past 7 Days" : tab === "weekly" ? "Past 4 Weeks" : "Monthly Overview"}
          </h3>

          {tab === "daily" && (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={dailyData} barSize={24}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="kwh" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {tab === "weekly" && (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="kwh" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ fill: "hsl(var(--primary))", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          )}

          {tab === "monthly" && (
            <div className="space-y-4 py-4">
              {[
                { month: "November", kwh: 185.4, cost: 3791, bar: 72 },
                { month: "December", kwh: 201.8, cost: 4127, bar: 85 },
              ].map(({ month, kwh, cost, bar }) => (
                <div key={month}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-foreground font-medium">{month}</span>
                    <span className="text-primary font-bold">{kwh} kWh</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full gradient-cyan rounded-full transition-all duration-1000" style={{ width: `${bar}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">KES {cost.toLocaleString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Peak usage */}
        <div className="glass-card rounded-2xl p-4 border border-border/20 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center">
              <Clock className="w-4.5 h-4.5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Peak Usage Time</p>
              <p className="text-xs text-muted-foreground">Today's highest consumption</p>
            </div>
          </div>
          <div className="flex items-end gap-1 h-12 px-2">
            {[3,5,4,6,8,7,12,9,7,5,4,3].map((h, i) => (
              <div key={i} className="flex-1 rounded-sm transition-all" style={{
                height: `${(h/12)*100}%`,
                background: i === 6 ? "hsl(var(--accent))" : "hsl(var(--primary) / 0.3)"
              }} />
            ))}
          </div>
          <div className="flex justify-between mt-1 px-1">
            <span className="text-[10px] text-muted-foreground">6AM</span>
            <span className="text-[10px] text-accent font-bold">6PM ↑ peak</span>
            <span className="text-[10px] text-muted-foreground">11PM</span>
          </div>
        </div>

        {/* Appliance hints */}
        <div className="glass-card rounded-2xl p-4 border border-primary/15 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">Monthly usage equivalent to…</p>
          <div className="space-y-2">
            {[
              { icon: "🧊", label: "Running a fridge", val: "3 days" },
              { icon: "💡", label: "100W bulb on", val: "2,018 hours" },
              { icon: "📺", label: "Watching TV", val: "402 hours" },
            ].map(({ icon, label, val }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-xl">{icon}</span>
                <span className="text-sm text-muted-foreground flex-1">{label}</span>
                <span className="text-sm font-medium text-foreground">{val}</span>
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
