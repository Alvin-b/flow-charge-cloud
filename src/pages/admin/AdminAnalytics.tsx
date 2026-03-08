import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/admin/StatCard";
import { adminApi } from "@/lib/admin-api";
import { DollarSign, Zap, Users, TrendingUp, ArrowUpDown, AlertTriangle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, AreaChart, Area } from "recharts";

export default function AdminAnalytics() {
  const [period, setPeriod] = useState("30d");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "analytics", period],
    queryFn: () => adminApi.getAnalyticsOverview(period),
  });

  const stats = data ?? {
    total_revenue_kes: 0, total_kwh_sold: 0, total_recharges: 0,
    total_transfers: 0, total_transactions: 0, failed_transactions: 0,
    new_users: 0, daily: [],
  };

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
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard title="Revenue" value={`KES ${stats.total_revenue_kes.toLocaleString()}`} icon={DollarSign} />
            <StatCard title="kWh Sold" value={`${stats.total_kwh_sold.toFixed(1)} kWh`} icon={Zap} />
            <StatCard title="Recharges" value={stats.total_recharges} icon={TrendingUp} />
            <StatCard title="Transfers" value={stats.total_transfers} icon={ArrowUpDown} />
            <StatCard title="New Users" value={stats.new_users} icon={Users} />
            <StatCard title="Failed Txns" value={stats.failed_transactions} icon={AlertTriangle} />
          </div>
        )}

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Revenue (KES)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : stats.daily.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No data for this period</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={stats.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* kWh Sold Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily kWh Sold</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : stats.daily.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No data for this period</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                  <Bar dataKey="kwh" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Transaction Count Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Recharge Count</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : stats.daily.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No data for this period</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={stats.daily}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(d) => d.slice(5)} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }} />
                  <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
