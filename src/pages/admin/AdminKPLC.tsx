import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/admin/StatCard";
import { adminApi } from "@/lib/admin-api";
import { DollarSign, ArrowUpRight, Layers, Percent, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

const statusVariant: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
  completed: "default",
  pending: "outline",
  failed: "destructive",
};

export default function AdminKPLC() {
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: poolData, isLoading: poolLoading } = useQuery({
    queryKey: ["admin", "kplc-pool"],
    queryFn: () => adminApi.getKplcPoolStatus(),
  });

  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ["admin", "kplc-payments", page],
    queryFn: () => adminApi.listKplcPayments(page, limit),
  });

  const pool = poolData ?? {
    pool_balance_kes: 0, pending_splits: 0, total_forwarded_kes: 0,
    total_commission_kes: 0, min_payment: 25, commission_percent: 10,
    kplc_paybill: "888880", kplc_account: "", recent_payments: [],
  };

  const payments = paymentsData?.payments ?? [];
  const total = paymentsData?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground">KPLC Payments</h2>
          <p className="text-muted-foreground text-sm">B2B payment pool status and KPLC forwarding history</p>
        </div>

        {/* Pool Stats */}
        {poolLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Pool Balance"
              value={`KES ${pool.pool_balance_kes.toLocaleString()}`}
              subtitle={`${pool.pending_splits} pending splits`}
              icon={Layers}
            />
            <StatCard
              title="Total Forwarded"
              value={`KES ${pool.total_forwarded_kes.toLocaleString()}`}
              icon={ArrowUpRight}
            />
            <StatCard
              title="Total Commission"
              value={`KES ${pool.total_commission_kes.toLocaleString()}`}
              icon={DollarSign}
            />
            <StatCard
              title="Commission Rate"
              value={`${pool.commission_percent}%`}
              subtitle={`Min: KES ${pool.min_payment} | Paybill: ${pool.kplc_paybill}`}
              icon={Percent}
            />
          </div>
        )}

        {/* Pool Config */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            {poolLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Paybill</p>
                  <p className="font-mono font-bold text-foreground">{pool.kplc_paybill}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Account Number</p>
                  <p className="font-mono font-bold text-foreground">{pool.kplc_account || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Min Payment</p>
                  <p className="font-mono font-bold text-foreground">KES {pool.min_payment}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Commission</p>
                  <p className="font-mono font-bold text-foreground">{pool.commission_percent}%</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payments History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">KPLC Payment History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {paymentsLoading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : payments.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No KPLC payments sent yet</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Amount (KES)</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Paybill</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Account</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">M-Pesa Receipt</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p: any) => (
                      <tr key={p.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                          {format(new Date(p.created_at), "MMM d, HH:mm")}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-foreground">
                          {p.amount_kes.toLocaleString()}
                        </td>
                        <td className="p-3 text-muted-foreground font-mono text-xs">{p.paybill}</td>
                        <td className="p-3 text-muted-foreground text-xs">{p.account_number || "—"}</td>
                        <td className="p-3">
                          <Badge variant={statusVariant[p.status] || "outline"} className="text-xs">{p.status}</Badge>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs font-mono">{p.mpesa_receipt || "—"}</td>
                        <td className="p-3 text-destructive text-xs truncate max-w-[150px]">{p.error_message || "—"}</td>
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
