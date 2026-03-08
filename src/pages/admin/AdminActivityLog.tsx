import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import { format } from "date-fns";

const typeColors: Record<string, string> = {
  recharge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  transfer_out: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  transfer_in: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
  meter_transfer: "bg-amber-500/10 text-amber-500 border-amber-500/20",
};

const statusColors: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
  completed: "default",
  pending: "outline",
  failed: "destructive",
};

export default function AdminActivityLog() {
  const [page, setPage] = useState(1);
  const limit = 30;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "activity", page],
    queryFn: () => adminApi.getActivityLog(page, limit),
  });

  const activities = data?.activities ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground">Activity Log</h2>
          <p className="text-muted-foreground text-sm">{total} total events — audit trail of all transactions</p>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : activities.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No activity recorded</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">Time</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Amount (KES)</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">kWh</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Phone</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">M-Pesa Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((a: any) => (
                      <tr key={a.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                          {format(new Date(a.created_at), "MMM d, HH:mm:ss")}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${typeColors[a.type] || "bg-muted text-muted-foreground"}`}>
                            {a.type}
                          </span>
                        </td>
                        <td className="p-3">
                          <Badge variant={statusColors[a.status] || "outline"} className="text-xs">
                            {a.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-right font-mono text-foreground">
                          {a.amount_kes > 0 ? `${a.amount_kes.toLocaleString()}` : "—"}
                        </td>
                        <td className="p-3 text-right font-mono text-foreground">
                          {a.amount_kwh > 0 ? a.amount_kwh.toFixed(2) : "—"}
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">{a.phone_number || "—"}</td>
                        <td className="p-3 text-muted-foreground text-xs font-mono">{a.mpesa_receipt_number || "—"}</td>
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
