import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, Zap, Flame, Sparkles, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from "recharts";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const KES_PER_KWH = 24;

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
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

/** Fetch last 3 months of completed recharges in a single query */
const fetchRecentTransactions = async () => {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const { data, error } = await supabase
    .from("transactions")
    .select("amount_kwh, created_at")
    .eq("status", "completed")
    .gte("created_at", threeMonthsAgo.toISOString())
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
};

/** All analytics computed client-side from a single query result */
function computeAnalytics(rows: { amount_kwh: number; created_at: string }[]) {
  const now = new Date();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const hourLabels = ["12AM","1AM","2AM","3AM","4AM","5AM","6AM","7AM","8AM","9AM","10AM","11AM","12PM","1PM","2PM","3PM","4PM","5PM","6PM","7PM","8PM","9PM","10PM","11PM"];

  // --- Daily: last 7 days ---
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const dayBuckets: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayBuckets[d.toISOString().slice(0, 10)] = 0;
  }

  // --- Weekly: last 4 weeks ---
  const weekBuckets = [0, 0, 0, 0];
  const weekBounds: [Date, Date][] = [];
  for (let w = 3; w >= 0; w--) {
    const s = new Date(now); s.setDate(s.getDate() - (w + 1) * 7);
    const e = new Date(now); e.setDate(e.getDate() - w * 7);
    weekBounds.push([s, e]);
  }

  // --- Monthly: last 3 months ---
  const monthBuckets: Record<string, number> = {};
  for (let m = 2; m >= 0; m--) {
    const d = new Date(); d.setMonth(d.getMonth() - m);
    monthBuckets[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`] = 0;
  }

  // --- Hourly: today ---
  const todayStr = now.toISOString().slice(0, 10);
  const hourBuckets: Record<number, number> = {};
  for (let h = 0; h < 24; h++) hourBuckets[h] = 0;

  // --- Summary accumulators ---
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const lastMonth = new Date(now); lastMonth.setMonth(lastMonth.getMonth() - 1);
  const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`;
  let thisMonthTotal = 0, lastMonthTotal = 0;

  // Single pass over all rows
  for (const row of rows) {
    const kwh = Number(row.amount_kwh);
    const dateStr = row.created_at.slice(0, 10);
    const monthKey = row.created_at.slice(0, 7);
    const t = new Date(row.created_at);

    // Daily
    if (dayBuckets[dateStr] !== undefined) dayBuckets[dateStr] += kwh;

    // Weekly
    for (let w = 0; w < 4; w++) {
      if (t >= weekBounds[w][0] && t < weekBounds[w][1]) { weekBuckets[w] += kwh; break; }
    }

    // Monthly
    if (monthBuckets[monthKey] !== undefined) monthBuckets[monthKey] += kwh;

    // Hourly (today only)
    if (dateStr === todayStr) hourBuckets[t.getHours()] += kwh;

    // Summary
    if (monthKey === thisMonthKey) thisMonthTotal += kwh;
    else if (monthKey === lastMonthKey) lastMonthTotal += kwh;
  }

  const dailyData = Object.entries(dayBuckets).map(([date, kwh]) => ({
    day: dayNames[new Date(date).getDay()], date, kwh: +kwh.toFixed(2),
  }));

  const weeklyData = weekBuckets.map((kwh, i) => ({ week: `W${i + 1}`, kwh: +kwh.toFixed(2) }));

  const monthlyData = Object.entries(monthBuckets).map(([key, kwh]) => {
    const m = parseInt(key.split("-")[1]);
    return { month: monthNames[m - 1], kwh: +kwh.toFixed(2), cost: +(kwh * KES_PER_KWH).toFixed(0) };
  });

  const hourlyData = [];
  for (let h = 6; h <= 23; h++) {
    hourlyData.push({ hr: hourLabels[h], kw: +hourBuckets[h].toFixed(3) });
  }

  const dailyAvg = now.getDate() > 0 ? thisMonthTotal / now.getDate() : 0;
  const changePct = lastMonthTotal > 0 ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100) : 0;

  return { dailyData, weeklyData, monthlyData, hourlyData, thisMonth: +thisMonthTotal.toFixed(1), dailyAvg: +dailyAvg.toFixed(1), changePct };
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

  const { dailyData, weeklyData, monthlyData, hourlyData, thisMonth, dailyAvg, changePct } = analytics;

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center gap-3">
        <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-muted/30 transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Analytics</h1>
          <p className="text-xs text-muted-foreground">Your energy consumption patterns</p>
        </div>
      </div>

      <div className="px-5 space-y-5">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "This Month", val: thisMonth.toFixed(1), unit: "kWh", icon: Zap, color: "text-primary", bg: "bg-primary/10", border: "border-primary/15" },
            { label: "vs Last Mo.", val: `${changePct > 0 ? "+" : ""}${changePct}%`, unit: "", icon: TrendingUp, color: "text-accent", bg: "bg-accent/10", border: "border-accent/15" },
            { label: "Avg Daily", val: dailyAvg.toFixed(1), unit: "kWh", icon: TrendingDown, color: "text-primary", bg: "bg-primary/10", border: "border-primary/15" },
          ].map(({ label, val, unit, icon: Icon, color, bg, border }) => (
            <div key={label} className={`glass-card-elevated rounded-2xl p-3.5 border ${border}`}>
              <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center mb-2.5`}>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
              <p className={`text-lg font-bold ${color} mt-0.5`}>{val}<span className="text-[10px] font-normal text-muted-foreground ml-0.5">{unit}</span></p>
            </div>
          ))}
        </div>

        {/* Tab selector */}
        <div className="flex bg-muted/30 rounded-2xl p-1 gap-1 border border-border/10">
          {(["daily", "weekly", "monthly"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-all duration-300 ${
                tab === t ? "bg-primary text-primary-foreground font-bold shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Charts */}
        <div className="glass-card-elevated rounded-2xl p-5 border border-border/10">
          <h3 className="text-sm font-bold text-foreground mb-1">
            {tab === "daily" ? "Past 7 Days" : tab === "weekly" ? "Past 4 Weeks" : "Monthly Overview"}
          </h3>
          <p className="text-[10px] text-muted-foreground mb-4">Energy consumption in kWh</p>

          {tab === "daily" && (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyData} barSize={28}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
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
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="kwh" stroke="hsl(var(--primary))" strokeWidth={2.5} fill="url(#areaGrad)" dot={{ fill: "hsl(var(--primary))", r: 5, strokeWidth: 2, stroke: "hsl(var(--background))" }} />
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
                      <span className="text-foreground font-semibold">{m.month}</span>
                      <span className="text-primary font-bold">{m.kwh.toFixed(1)} kWh</span>
                    </div>
                    <div className="h-3 bg-muted/20 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${bar}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">KES {((m.kwh || 0) * 20.43).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  </div>
                );
              }) : (
                <p className="text-center text-sm text-muted-foreground py-6">No monthly data yet</p>
              )}
            </div>
          )}
        </div>

        {/* Today's Load Curve */}
        <div className="glass-card-elevated rounded-2xl p-5 border border-border/10">
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
                  <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="hr" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }} interval={1} />
              <Tooltip content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="glass-card-elevated rounded-xl px-3 py-2 border border-accent/20">
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="text-sm font-bold text-accent">{payload[0].value} kW</p>
                  </div>
                ) : null
              } />
              <Area type="monotone" dataKey="kw" stroke="hsl(var(--accent))" strokeWidth={2} fill="url(#loadGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-between mt-2">
            {hourlyData.length > 0 ? (() => {
              const peak = hourlyData.reduce((a, b) => (b.kw || 0) > (a.kw || 0) ? b : a, hourlyData[0]);
              const min = hourlyData.reduce((a, b) => (b.kw || 0) < (a.kw || 0) ? b : a, hourlyData[0]);
              return (
                <>
                  <span className="text-[10px] text-muted-foreground">Peak: <span className="text-accent font-bold">{peak.kw} kW at {peak.hr}</span></span>
                  <span className="text-[10px] text-muted-foreground">Min: <span className="text-primary font-bold">{min.kw} kW at {min.hr}</span></span>
                </>
              );
            })() : (
              <span className="text-[10px] text-muted-foreground">No hourly data yet</span>
            )}
          </div>
        </div>

        {/* Appliance hints */}
        {thisMonth > 0 && (
          <div className="glass-card rounded-2xl p-4 border border-primary/10">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Monthly equivalent</p>
            </div>
            <div className="space-y-3">
              {[
                { icon: "🧊", label: "Running a fridge", val: `${Math.round(thisMonth / 70)} days` },
                { icon: "💡", label: "100W bulb on", val: `${Math.round(thisMonth * 10).toLocaleString()} hours` },
                { icon: "📺", label: "Watching TV", val: `${Math.round(thisMonth * 2).toLocaleString()} hours` },
                { icon: "🔌", label: "Phone charging", val: `${Math.round(thisMonth * 80).toLocaleString()} charges` },
              ].map(({ icon, label, val }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="text-xl w-8 text-center">{icon}</span>
                  <span className="text-sm text-muted-foreground flex-1">{label}</span>
                  <span className="text-sm font-bold text-foreground">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav active="/analytics" />
    </div>
  );
};

export default Analytics;
