import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ChevronLeft, ChevronRight, TrendingUp, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const STATUS_COLORS: Record<string, string> = {
  completed: "hsl(160, 70%, 45%)",
  pending: "hsl(40, 90%, 55%)",
  failed: "hsl(0, 70%, 55%)",
};

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 8,
  color: "hsl(var(--foreground))",
  fontSize: 11,
};

export default function AdminTransactions() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "transactions", page, search, typeFilter, statusFilter],
    queryFn: () => adminApi.listTransactions(page, 30, {
      search,
      type: typeFilter !== "all" ? typeFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
    }),
  });

  // Get 7d analytics for the chart header
  const { data: analytics } = useQuery({
    queryKey: ["admin", "analytics", "7d"],
    queryFn: () => adminApi.getAnalyticsOverview("7d"),
    staleTime: 60000,
  });

  const txns = data?.transactions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 30);
  const daily7 = analytics?.daily || [];

  // Compute status breakdown from current page data (approx)
  const statusBreakdown = txns.reduce((acc: Record<string, number>, tx: any) => {
    acc[tx.status] = (acc[tx.status] || 0) + 1;
    return acc;
  }, {});

  const statusPie = Object.entries(statusBreakdown)
    .map(([name, value]) => ({ name, value: value as number }))
    .filter(d => d.value > 0);

  const statusColor = (s: string) => {
    switch (s) {
      case "completed": return "bg-emerald-500/10 text-emerald-500";
      case "pending": return "bg-amber-500/10 text-amber-500";
      case "failed": return "bg-destructive/10 text-destructive";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const completedCount = statusBreakdown["completed"] || 0;
  const pendingCount = statusBreakdown["pending"] || 0;
  const failedCount = statusBreakdown["failed"] || 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold font-display text-foreground">Transactions</h2>
            <p className="text-muted-foreground text-sm">{total} total transactions</p>
          </div>
        </div>

        {/* Quick Stats + Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="flex flex-col gap-4 lg:col-span-1">
            <Card className="flex-1">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10"><CheckCircle2 className="h-5 w-5 text-emerald-500" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="text-lg font-bold text-foreground">{completedCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10"><Clock className="h-5 w-5 text-amber-500" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-lg font-bold text-foreground">{pendingCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Failed</p>
                  <p className="text-lg font-bold text-foreground">{failedCount}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">7-Day Transaction Volume</CardTitle>
            </CardHeader>
            <CardContent>
              {daily7.length > 0 ? (
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={daily7}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(d) => d.slice(5)} />
                    <YAxis tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Recharges" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[150px] flex items-center justify-center text-xs text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Status Split</CardTitle>
            </CardHeader>
            <CardContent>
              {statusPie.length > 0 ? (
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={statusPie} cx="50%" cy="50%" innerRadius={30} outerRadius={50} dataKey="value" paddingAngle={3}>
                      {statusPie.map((d) => (
                        <Cell key={d.name} fill={STATUS_COLORS[d.name] || "hsl(var(--muted))"} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[150px] flex items-center justify-center text-xs text-muted-foreground">No data</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by phone, receipt..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
          </div>
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="recharge">Recharge</SelectItem>
              <SelectItem value="transfer_out">Transfer Out</SelectItem>
              <SelectItem value="transfer_in">Transfer In</SelectItem>
              <SelectItem value="meter_transfer">Meter Transfer</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : txns.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No transactions found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Phone</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">KES</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">kWh</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">M-Pesa Receipt</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txns.map((tx: any) => (
                      <tr key={tx.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                          {new Date(tx.created_at).toLocaleString("en-KE", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="p-3 capitalize text-foreground">{tx.type.replace("_", " ")}</td>
                        <td className="p-3 text-muted-foreground font-mono text-xs">{tx.phone_number || "—"}</td>
                        <td className="p-3 text-right font-mono text-foreground">{tx.amount_kes?.toLocaleString()}</td>
                        <td className="p-3 text-right font-mono text-foreground">{tx.amount_kwh?.toFixed(2)}</td>
                        <td className="p-3 text-muted-foreground font-mono text-xs">{tx.mpesa_receipt_number || "—"}</td>
                        <td className="p-3">
                          <Badge className={statusColor(tx.status)} variant="outline">{tx.status}</Badge>
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
                  <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}><ChevronLeft className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
