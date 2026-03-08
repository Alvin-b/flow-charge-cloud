import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/admin/StatCard";
import { adminApi } from "@/lib/admin-api";
import { DollarSign, Zap, Users, TrendingUp, ArrowUpDown, AlertTriangle, BarChart3, PieChart as PieIcon } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, Legend,
  ComposedChart,
} from "recharts";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--accent))",
  "hsl(168, 80%, 45%)",
  "hsl(35, 90%, 55%)",
  "hsl(280, 70%, 55%)",
  "hsl(0, 70%, 55%)",
];

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--foreground))",
  fontSize: 12,
};

export default function AdminAnalytics() {
  const [period, setPeriod] = useState("30d");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "analytics", period],
    queryFn: () => adminApi.getAnalyticsOverview(period),
  });

  // Also fetch transaction type breakdown
  const { data: txSummary } = useQuery({
    queryKey: ["admin", "tx-summary", period],
    queryFn: () => adminApi.getTransactionSummary(period),
  });

  const stats = data ?? {
    total_revenue_kes: 0, total_kwh_sold: 0, total_recharges: 0,
    total_transfers: 0, total_transactions: 0, failed_transactions: 0,
    new_users: 0, daily: [],
  };

  // Compute derivative data
  const daily = stats.daily || [];
  const avgRevenue = daily.length > 0
    ? Math.round(daily.reduce((s: number, d: any) => s + (d.revenue || 0), 0) / daily.length)
    : 0;
  const peakDay = daily.length > 0
    ? daily.reduce((best: any, d: any) => (d.revenue || 0) > (best.revenue || 0) ? d : best, daily[0])
    : null;

  // Cumulative revenue
  let cumulative = 0;
  const cumulativeData = daily.map((d: any) => {
    cumulative += d.revenue || 0;
    return { ...d, cumulative };
  });

  // Pie data for transaction types
  const pieData = [
    { name: "Recharges", value: stats.total_recharges || 0 },
    { name: "Transfers", value: stats.total_transfers || 0 },
    { name: "Failed", value: stats.failed_transactions || 0 },
  ].filter(d => d.value > 0);

  // Success rate
  const successRate = stats.total_transactions > 0
    ? Math.round(((stats.total_transactions - stats.failed_transactions) / stats.total_transactions) * 100)
    : 100;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold font-display text-foreground">Analytics</h2>
            <p className="text-muted-foreground text-sm">Revenue, usage trends, and system metrics</p>
          </div>
          <div className="flex gap-2">
            {["7d", "30d", "90d"].map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "90 Days"}
              </Button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Revenue" value={`KES ${stats.total_revenue_kes.toLocaleString()}`} icon={DollarSign} trend={avgRevenue > 0 ? { value: avgRevenue, label: `avg/day` } : undefined} />
            <StatCard title="kWh Sold" value={`${stats.total_kwh_sold.toFixed(1)} kWh`} icon={Zap} />
            <StatCard title="Recharges" value={stats.total_recharges} icon={TrendingUp} />
            <StatCard title="Transfers" value={stats.total_transfers} icon={ArrowUpDown} />
            <StatCard title="New Users" value={stats.new_users} icon={Users} />
            <StatCard title="Failed Txns" value={stats.failed_transactions} icon={AlertTriangle} className={stats.failed_transactions > 0 ? "border-destructive/30" : ""} />
            <StatCard title="Success Rate" value={`${successRate}%`} icon={BarChart3} />
            <StatCard title="Peak Day" value={peakDay ? `KES ${(peakDay.revenue || 0).toLocaleString()}` : "—"} subtitle={peakDay?.date?.slice(5) || ""} icon={PieIcon} />
          </div>
        )}

        {/* Revenue + Cumulative Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Revenue Trend (KES)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-72 w-full" />
              ) : daily.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No data for this period</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={cumulativeData}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area yAxisId="left" type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#revGrad)" strokeWidth={2} name="Daily Revenue" />
                    <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Cumulative" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Transaction Type Pie */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Transaction Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-72 w-full" />
              ) : pieData.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No transactions</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* kWh + Recharge Count Combined */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily kWh Sold</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : daily.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={daily}>
                    <defs>
                      <linearGradient id="kwhGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(168, 80%, 45%)" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="hsl(168, 80%, 45%)" stopOpacity={0.2} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="kwh" fill="url(#kwhGrad)" radius={[4, 4, 0, 0]} name="kWh Sold" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daily Recharge Count</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : daily.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No data</p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={daily}>
                    <defs>
                      <linearGradient id="countGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(35, 90%, 55%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(35, 90%, 55%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="count" stroke="hsl(35, 90%, 55%)" fill="url(#countGrad)" strokeWidth={2} dot={{ r: 3, fill: "hsl(35, 90%, 55%)" }} name="Recharges" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Revenue per kWh / Efficiency */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue per kWh (KES/kWh)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-56 w-full" />
            ) : daily.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={daily.filter((d: any) => d.kwh > 0).map((d: any) => ({
                  ...d,
                  rate: +(d.revenue / d.kwh).toFixed(1),
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis domain={[0, "auto"]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="rate" stroke="hsl(280, 70%, 55%)" strokeWidth={2} dot={{ r: 3 }} name="KES/kWh" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
