import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { StatCard } from "@/components/admin/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Gauge, Zap, Wallet, TrendingUp, Activity, Receipt, AlertTriangle } from "lucide-react";
import { adminApi } from "@/lib/admin-api";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: adminApi.getDashboardStats,
    refetchInterval: 30000,
  });

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
              <StatCard title="Wallet Balance (System)" value={`${(stats?.total_wallet_balance ?? 0).toFixed(1)} kWh`} icon={Wallet} subtitle="All users combined" />
              <StatCard title="Today's Transactions" value={stats?.today_transactions ?? 0} icon={Receipt} subtitle="Recharges + transfers" />
              <StatCard title="Pending Transactions" value={stats?.pending_transactions ?? 0} icon={Activity} subtitle="Awaiting completion" />
              <StatCard title="Offline Meters" value={stats?.offline_meters ?? 0} icon={AlertTriangle} subtitle="Requiring attention" />
            </>
          )}
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
