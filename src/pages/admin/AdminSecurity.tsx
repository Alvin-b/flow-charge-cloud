import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/admin/StatCard";
import { adminApi } from "@/lib/admin-api";
import { Shield, Users, Activity, ChevronLeft, ChevronRight, Lock } from "lucide-react";
import { format } from "date-fns";

export default function AdminSecurity() {
  const [page, setPage] = useState(1);
  const limit = 30;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "security", page],
    queryFn: () => adminApi.listRateLimits(page, limit),
  });

  const events = data?.events ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);
  const actionCounts = data?.hourly_action_counts ?? {};
  const roleCounts = data?.role_counts ?? {};

  const totalHourlyEvents = Object.values(actionCounts).reduce((s: number, v: any) => s + (v as number), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground">Security</h2>
          <p className="text-muted-foreground text-sm">Rate limits, access controls, and role management</p>
        </div>

        {/* Stats */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Rate Events (1h)"
              value={totalHourlyEvents}
              icon={Activity}
            />
            <StatCard
              title="Admin Users"
              value={roleCounts.admin ?? 0}
              icon={Shield}
            />
            <StatCard
              title="Moderators"
              value={roleCounts.moderator ?? 0}
              icon={Users}
            />
            <StatCard
              title="Total Events"
              value={total}
              icon={Lock}
            />
          </div>
        )}

        {/* Hourly Action Breakdown */}
        {Object.keys(actionCounts).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rate Limit Activity (Last Hour)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(actionCounts).map(([action, count]: [string, any]) => (
                  <div key={action} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/20">
                    <code className="text-xs font-mono text-foreground">{action}</code>
                    <Badge variant="secondary" className="text-xs">{count}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Role Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Role Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="flex flex-wrap gap-4">
                {["admin", "moderator", "user"].map((role) => (
                  <div key={role} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      role === "admin" ? "bg-destructive/10" : role === "moderator" ? "bg-amber-500/10" : "bg-primary/10"
                    }`}>
                      <Shield className={`h-4 w-4 ${
                        role === "admin" ? "text-destructive" : role === "moderator" ? "text-amber-500" : "text-primary"
                      }`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground capitalize">{role}</p>
                      <p className="text-xs text-muted-foreground">{roleCounts[role] ?? 0} users</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Rate Limit Events */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Rate Limit Events</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : events.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No rate limit events recorded</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">Time</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">User</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e: any) => (
                      <tr key={e.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                          {format(new Date(e.created_at), "MMM d, HH:mm:ss")}
                        </td>
                        <td className="p-3">
                          <span className="text-foreground text-xs font-medium">{e.user_name || "—"}</span>
                          {e.user_phone && <span className="text-muted-foreground text-xs ml-2">{e.user_phone}</span>}
                        </td>
                        <td className="p-3">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{e.action}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between p-3 border-t border-border">
                <span className="text-xs text-muted-foreground">Page {page} of {totalPages}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
