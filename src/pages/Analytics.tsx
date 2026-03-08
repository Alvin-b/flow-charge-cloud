import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, Zap, Flame, Loader2, DollarSign, Calendar, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import BottomNav from "@/components/BottomNav";
import LiveTelemetry from "@/components/LiveTelemetry";
import AIInsights from "@/components/AIInsights";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

const KES_PER_KWH = 24;
const PIE_COLORS = ["hsl(168, 100%, 45%)", "hsl(280, 70%, 55%)", "hsl(35, 90%, 55%)", "hsl(0, 70%, 55%)"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="glass-card-elevated rounded-xl px-3 py-2 border border-primary/20">
        <p className="text-[10px] text-muted-foreground font-mono uppercase">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} className="text-sm font-bold font-mono text-primary neon-text">
            {typeof p.value === "number" ? p.value.toFixed(1) : p.value} {p.name === "cost" ? "KES" : p.dataKey === "kw" ? "kW" : "kWh"}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

type Tab = "daily" | "weekly" | "monthly";

const fetchRecentTransactions = async () => {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const { data, error } = await supabase
    .from("transactions")
    .select("amount_kwh, amount_kes, type, created_at")
    .eq("status", "completed")
    .gte("created_at", threeMonthsAgo.toISOString())
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
};

function computeAnalytics(rows: { amount_kwh: number; amount_kes: number; type: string; created_at: string }[]) {
  const now = new Date();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const hourLabels = ["12AM","1AM","2AM","3AM","4AM","5AM","6AM","7AM","8AM","9AM","10AM","11AM","12PM","1PM","2PM","3PM","4PM","5PM","6PM","7PM","8PM","9PM","10PM","11PM"];

  const dayBuckets: Record<string, { kwh: number; kes: number }> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    dayBuckets[d.toISOString().slice(0, 10)] = { kwh: 0, kes: 0 };
  }

  const weekBuckets = [{ kwh: 0, kes: 0 }, { kwh: 0, kes: 0 }, { kwh: 0, kes: 0 }, { kwh: 0, kes: 0 }];
  const weekBounds: [Date, Date][] = [];
  for (let w = 3; w >= 0; w--) {
    const s = new Date(now); s.setDate(s.getDate() - (w + 1) * 7);
    const e = new Date(now); e.setDate(e.getDate() - w * 7);
    weekBounds.push([s, e]);
  }

  const monthBuckets: Record<string, { kwh: number; kes: number }> = {};
  for (let m = 2; m >= 0; m--) {
    const d = new Date(); d.setMonth(d.getMonth() - m);
    monthBuckets[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`] = { kwh: 0, kes: 0 };
  }

  const todayStr = now.toISOString().slice(0, 10);
  const hourBuckets: Record<number, number> = {};
  for (let h = 0; h < 24; h++) hourBuckets[h] = 0;

  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonth = new Date(now); lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
  let thisMonthTotal = 0, lastMonthTotal = 0, thisMonthKes = 0;

  // Type breakdown
  const typeCounts: Record<string, number> = {};

  for (const row of rows) {
    const kwh = Number(row.amount_kwh);
    const kes = Number(row.amount_kes);
    const dateStr = row.created_at.slice(0, 10);
    const monthKey = row.created_at.slice(0, 7);
    const t = new Date(row.created_at);

    typeCounts[row.type] = (typeCounts[row.type] || 0) + 1;

    if (dayBuckets[dateStr]) {
      dayBuckets[dateStr].kwh += kwh;
      dayBuckets[dateStr].kes += kes;
    }
    for (let w = 0; w < 4; w++) {
      if (t >= weekBounds[w][0] && t < weekBounds[w][1]) {
        weekBuckets[w].kwh += kwh;
        weekBuckets[w].kes += kes;
        break;
      }
    }
    if (monthBuckets[monthKey]) {
      monthBuckets[monthKey].kwh += kwh;
      monthBuckets[monthKey].kes += kes;
    }
    if (dateStr === todayStr) hourBuckets[t.getHours()] += kwh;
    if (monthKey === thisMonthKey) { thisMonthTotal += kwh; thisMonthKes += kes; }
    else if (monthKey === lastMonthKey) lastMonthTotal += kwh;
  }

  const dailyData = Object.entries(dayBuckets).map(([date, v]) => ({
    day: dayNames[new Date(date).getDay()], date, kwh: +v.kwh.toFixed(2), kes: +v.kes.toFixed(0),
  }));
  const weeklyData = weekBuckets.map((v, i) => ({ week: `W${i + 1}`, kwh: +v.kwh.toFixed(2), kes: +v.kes.toFixed(0) }));
  const monthlyData = Object.entries(monthBuckets).map(([key, v]) => {
    const m = parseInt(key.split("-")[1]);
    return { month: monthNames[m - 1], kwh: +v.kwh.toFixed(2), cost: +v.kes.toFixed(0) };
  });
  const hourlyData = [];
  for (let h = 6; h <= 23; h++) {
    hourlyData.push({ hr: hourLabels[h], kw: +hourBuckets[h].toFixed(3) });
  }

  const dailyAvg = now.getDate() > 0 ? thisMonthTotal / now.getDate() : 0;
  const changePct = lastMonthTotal > 0 ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100) : 0;

  const typeData = Object.entries(typeCounts).map(([name, value]) => ({
    name: name.replace("_", " "),
    value,
  }));

  return { dailyData, weeklyData, monthlyData, hourlyData, thisMonth: +thisMonthTotal.toFixed(1), thisMonthKes, dailyAvg: +dailyAvg.toFixed(1), changePct, typeData, totalTxns: rows.length };
}

const Analytics = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("daily");

  const { data: txns, isLoading } = useQuery({
    queryKey: ["analytics-transactions"],
    queryFn: fetchRecentTransactions,
    staleTime: 60_000,
  });

  const analytics = useMemo(() => computeAnalytics(txns ?? []), [txns]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const { dailyData, weeklyData, monthlyData, hourlyData, thisMonth, thisMonthKes, dailyAvg, changePct, typeData, totalTxns } = analytics;

  return (
    <div className="min-h-screen bg-background pb-28 cyber-grid noise-overlay relative">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center gap-3">
        <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-secondary/50 border border-border transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-bold font-mono text-foreground tracking-tight neon-text">ANALYTICS</h1>
          <p className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider">Energy consumption matrix</p>
        </div>
      </div>

      <div className="px-5 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "THIS MONTH", val: thisMonth.toFixed(1), unit: "kWh", icon: Zap, color: "text-primary", border: "border-primary/20" },
            { label: "VS LAST", val: `${changePct > 0 ? "+" : ""}${changePct}%`, unit: "", icon: changePct >= 0 ? TrendingUp : TrendingDown, color: "text-accent", border: "border-accent/20" },
            { label: "AVG DAILY", val: dailyAvg.toFixed(1), unit: "kWh", icon: Calendar, color: "text-primary", border: "border-primary/20" },
            { label: "SPENT", val: `${thisMonthKes.toLocaleString()}`, unit: "KES", icon: DollarSign, color: "text-accent", border: "border-accent/20" },
          ].map(({ label, val, unit, icon: Icon, color, border }) => (
            <div key={label} className={cn("glass-card-elevated rounded-xl p-3.5 border", border)}>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2.5 bg-secondary/50 border", border)}>
                <Icon className={cn("w-4 h-4", color)} />
              </div>
              <p className="text-[8px] text-muted-foreground uppercase tracking-wider font-mono">{label}</p>
              <p className={cn("text-lg font-bold font-mono mt-0.5", color)}>{val}<span className="text-[10px] font-normal text-muted-foreground ml-0.5">{unit}</span></p>
            </div>
          ))}
        </div>

        {/* Transaction type pie */}
        {typeData.length > 1 && (
          <div className="glass-card-elevated rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <p className="text-xs font-mono font-bold text-foreground uppercase">TRANSACTION TYPES</p>
              <span className="text-[9px] text-muted-foreground font-mono ml-auto">{totalTxns} total</span>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" innerRadius={25} outerRadius={48} dataKey="value" paddingAngle={3}>
                  {typeData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))", fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 justify-center">
              {typeData.map((d, i) => (
                <span key={d.name} className="flex items-center gap-1 text-[9px] text-muted-foreground font-mono capitalize">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  {d.name} ({d.value})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Tab selector */}
        <div className="flex bg-secondary/30 rounded-xl p-1 gap-1 border border-border">
          {(["daily", "weekly", "monthly"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "flex-1 py-2.5 rounded-lg text-xs font-mono font-medium uppercase transition-all duration-300",
                tab === t ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Charts */}
        <div className="glass-card-elevated rounded-2xl p-5 border border-border hud-corners">
          <h3 className="text-xs font-mono font-bold text-foreground uppercase mb-1">
            {tab === "daily" ? "Past 7 Days" : tab === "weekly" ? "Past 4 Weeks" : "Monthly Overview"}
          </h3>
          <p className="text-[9px] text-muted-foreground font-mono mb-4">ENERGY CONSUMPTION (kWh)</p>

          {tab === "daily" && (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyData} barSize={28}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(168, 100%, 50%)" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(168, 100%, 50%)" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 20%, 14%)" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(230, 12%, 50%)", fontSize: 10, fontFamily: "JetBrains Mono" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(230, 12%, 50%)", fontSize: 10, fontFamily: "JetBrains Mono" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="kwh" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}

          {tab === "weekly" && (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(168, 100%, 50%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(168, 100%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 20%, 14%)" vertical={false} />
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "hsl(230, 12%, 50%)", fontSize: 10, fontFamily: "JetBrains Mono" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(230, 12%, 50%)", fontSize: 10, fontFamily: "JetBrains Mono" }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="kwh" stroke="hsl(168, 100%, 50%)" strokeWidth={2.5} fill="url(#areaGrad)" dot={{ fill: "hsl(168, 100%, 50%)", r: 5, strokeWidth: 2, stroke: "hsl(230, 25%, 5%)" }} />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {tab === "monthly" && (
            <div className="space-y-5 py-2">
              {monthlyData.length > 0 ? monthlyData.map((m) => {
                const maxKwh = Math.max(...monthlyData.map((d) => d.kwh || 0), 1);
                const bar = Math.round(((m.kwh || 0) / maxKwh) * 100);
                return (
                  <div key={m.month}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-foreground font-mono font-semibold">{m.month}</span>
                      <span className="text-primary font-mono font-bold neon-text">{m.kwh.toFixed(1)} kWh</span>
                    </div>
                    <div className="h-2.5 bg-secondary/30 rounded-full overflow-hidden border border-border">
                      <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${bar}%` }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground font-mono mt-1.5">KES {m.cost.toLocaleString()}</p>
                  </div>
                );
              }) : (
                <p className="text-center text-sm font-mono text-muted-foreground py-6">NO DATA</p>
              )}
            </div>
          )}
        </div>

        {/* Spending Trend (KES) */}
        <div className="glass-card-elevated rounded-2xl p-5 border border-border hud-corners">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-bold font-mono text-foreground">SPENDING TREND</p>
              <p className="text-[9px] text-muted-foreground font-mono">DAILY COST (KES) — PAST 7 DAYS</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(230, 20%, 14%)" vertical={false} />
              <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(230, 12%, 50%)", fontSize: 9, fontFamily: "JetBrains Mono" }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(230, 12%, 50%)", fontSize: 9, fontFamily: "JetBrains Mono" }} />
              <Tooltip content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="glass-card-elevated rounded-xl px-3 py-2 border border-accent/20">
                    <p className="text-[10px] text-muted-foreground font-mono">{label}</p>
                    <p className="text-sm font-bold font-mono text-accent">KES {payload[0].value?.toLocaleString()}</p>
                  </div>
                ) : null
              } />
              <Line type="monotone" dataKey="kes" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--accent))" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Today's Load Curve */}
        <div className="glass-card-elevated rounded-2xl p-5 border border-border hud-corners">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Flame className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-bold font-mono text-foreground">LOAD CURVE</p>
              <p className="text-[9px] text-muted-foreground font-mono">HOURLY POWER DRAW (kW)</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={hourlyData}>
              <defs>
                <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(35, 95%, 55%)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(35, 95%, 55%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hr" axisLine={false} tickLine={false} tick={{ fill: "hsl(230, 12%, 50%)", fontSize: 8, fontFamily: "JetBrains Mono" }} interval={1} />
              <Tooltip content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="glass-card-elevated rounded-xl px-3 py-2 border border-amber-500/20">
                    <p className="text-[10px] text-muted-foreground font-mono">{label}</p>
                    <p className="text-sm font-bold font-mono text-amber-500">{payload[0].value} kW</p>
                  </div>
                ) : null
              } />
              <Area type="monotone" dataKey="kw" stroke="hsl(35, 95%, 55%)" strokeWidth={2} fill="url(#loadGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-between mt-2">
            {hourlyData.length > 0 ? (() => {
              const peak = hourlyData.reduce((a, b) => (b.kw || 0) > (a.kw || 0) ? b : a, hourlyData[0]);
              const min = hourlyData.reduce((a, b) => (b.kw || 0) < (a.kw || 0) ? b : a, hourlyData[0]);
              return (
                <>
                  <span className="text-[10px] text-muted-foreground font-mono">Peak: <span className="text-amber-500 font-bold">{peak.kw} kW @ {peak.hr}</span></span>
                  <span className="text-[10px] text-muted-foreground font-mono">Min: <span className="text-primary font-bold">{min.kw} kW @ {min.hr}</span></span>
                </>
              );
            })() : (
              <span className="text-[10px] text-muted-foreground font-mono">NO HOURLY DATA</span>
            )}
          </div>
        </div>

        {/* Live Telemetry */}
        <LiveTelemetry />

        {/* AI Insights */}
        <AIInsights />
      </div>

      <BottomNav active="/analytics" />
    </div>
  );
};

export default Analytics;
