import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatCard } from "@/components/admin/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Gauge, Zap, Wallet, TrendingUp, Activity, Receipt, AlertTriangle } from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import {
  AreaChart, Area, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";

const MINI_COLORS = ["hsl(var(--primary))", "hsl(168, 80%, 45%)", "hsl(35, 90%, 55%)", "hsl(280, 70%, 55%)"];

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--foreground))",
  fontSize: 11,
};

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: adminApi.getDashboardStats,
    refetchInterval: 30000,
  });

  // Quick analytics for sparkline (7-day)
  const { data: analytics } = useQuery({
    queryKey: ["admin", "analytics", "7d"],
    queryFn: () => adminApi.getAnalyticsOverview("7d"),
    staleTime: 60000,
  });

  const daily7 = analytics?.daily || [];

  // Meter status distribution
  const meterPie = stats ? [
    { name: "Connected", value: stats.active_meters || 0 },
    { name: "Offline", value: stats.offline_meters || 0 },
  ].filter(d => d.value > 0) : [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground">Dashboard</h2>
          <p className="text-muted-foreground text-sm">PowerFlow system overview</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}><CardContent className="p-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
            ))
          ) : (
            <>
              <StatCard title="Total Users" value={stats?.total_users ?? 0} icon={Users} subtitle="Registered accounts" />
              <StatCard title="Active Meters" value={stats?.active_meters ?? 0} icon={Gauge} subtitle="Connected meters" />
              <StatCard title="Total kWh Sold" value={`${(stats?.total_kwh_sold ?? 0).toLocaleString()} kWh`} icon={Zap} subtitle="All time" />
              <StatCard title="Total Revenue" value={`KES ${(stats?.total_revenue ?? 0).toLocaleString()}`} icon={TrendingUp} subtitle="All time" />
              <StatCard title="Wallet Balance" value={`${(stats?.total_wallet_balance ?? 0).toFixed(1)} kWh`} icon={Wallet} subtitle="All users combined" />
              <StatCard title="Today's Txns" value={stats?.today_transactions ?? 0} icon={Receipt} subtitle="Recharges + transfers" />
              <StatCard title="Pending" value={stats?.pending_transactions ?? 0} icon={Activity} subtitle="Awaiting completion" />
              <StatCard title="Offline Meters" value={stats?.offline_meters ?? 0} icon={AlertTriangle} subtitle="Requiring attention" className={stats?.offline_meters > 0 ? "border-destructive/30" : ""} />
            </>
          )}
        </div>

        {/* Mini Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 7-Day Revenue Sparkline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">7-Day Revenue</CardTitle>
              <p className="text-xl font-bold text-foreground">
                KES {daily7.reduce((s: number, d: any) => s + (d.revenue || 0), 0).toLocaleString()}
              </p>
            </CardHeader>
            <CardContent className="pb-4">
              {daily7.length > 0 ? (
                <ResponsiveContainer width="100%" height={80}>
                  <AreaChart data={daily7}>
                    <defs>
                      <linearGradient id="spark1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#spark1)" strokeWidth={2} dot={false} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(d) => d?.slice?.(5) || d} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-20 flex items-center justify-center text-xs text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>

          {/* 7-Day kWh Bar */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">7-Day kWh Sold</CardTitle>
              <p className="text-xl font-bold text-foreground">
                {daily7.reduce((s: number, d: any) => s + (d.kwh || 0), 0).toFixed(1)} kWh
              </p>
            </CardHeader>
            <CardContent className="pb-4">
              {daily7.length > 0 ? (
                <ResponsiveContainer width="100%" height={80}>
                  <BarChart data={daily7}>
                    <Bar dataKey="kwh" fill="hsl(168, 80%, 45%)" radius={[3, 3, 0, 0]} />
                    <Tooltip contentStyle={tooltipStyle} labelFormatter={(d) => d?.slice?.(5) || d} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-20 flex items-center justify-center text-xs text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>

          {/* Meter Status Donut */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Meter Status</CardTitle>
              <p className="text-xl font-bold text-foreground">
                {(stats?.active_meters || 0) + (stats?.offline_meters || 0)} Total
              </p>
            </CardHeader>
            <CardContent className="pb-4">
              {meterPie.length > 0 ? (
                <ResponsiveContainer width="100%" height={80}>
                  <PieChart>
                    <Pie data={meterPie} cx="50%" cy="50%" innerRadius={20} outerRadius={35} dataKey="value" paddingAngle={3}>
                      {meterPie.map((_, i) => (
                        <Cell key={i} fill={MINI_COLORS[i % MINI_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-20 flex items-center justify-center text-xs text-muted-foreground">No meters</div>
              )}
              <div className="flex gap-4 justify-center mt-1">
                {meterPie.map((d, i) => (
                  <span key={d.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: MINI_COLORS[i] }} />
                    {d.name} ({d.value})
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : stats?.recent_transactions?.length > 0 ? (
                <div className="space-y-3">
                  {stats.recent_transactions.slice(0, 8).map((tx: any) => (
                    <div key={tx.id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                      <div>
                        <span className="font-medium text-foreground capitalize">{tx.type}</span>
                        <span className="text-muted-foreground ml-2">{tx.phone_number || "—"}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-medium text-foreground">KES {tx.amount_kes}</span>
                        <span className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                          tx.status === "completed" ? "bg-emerald-500/10 text-emerald-500" :
                          tx.status === "pending" ? "bg-amber-500/10 text-amber-500" :
                          "bg-destructive/10 text-destructive"
                        }`}>{tx.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-8">No recent transactions</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base font-display">Recent Registrations</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : stats?.recent_users?.length > 0 ? (
                <div className="space-y-3">
                  {stats.recent_users.slice(0, 8).map((user: any) => (
                    <div key={user.user_id} className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0">
                      <div>
                        <span className="font-medium text-foreground">{user.full_name || "Unnamed"}</span>
                        <span className="text-muted-foreground ml-2">{user.phone}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-8">No recent registrations</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
