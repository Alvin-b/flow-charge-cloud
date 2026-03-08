import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, Wallet, ChevronLeft, ChevronRight, Zap, TrendingUp, AlertTriangle, Users } from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import { StatCard } from "@/components/admin/StatCard";
import { format } from "date-fns";

export default function AdminWallets() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedWallet, setSelectedWallet] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const limit = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "wallets", page, search],
    queryFn: () => adminApi.listWallets(page, limit, search),
  });

  const adjustMutation = useMutation({
    mutationFn: ({ userId, amount, reason }: { userId: string; amount: number; reason: string }) =>
      adminApi.adjustWallet(userId, amount, reason),
    onSuccess: () => {
      toast.success("Wallet adjusted");
      setAdjustDialogOpen(false);
      setAdjustAmount("");
      setAdjustReason("");
      setSelectedWallet(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "wallets"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const wallets = data?.wallets ?? [];
  const total = data?.total ?? 0;
  const stats = data?.stats ?? { total_balance: 0, total_wallets: 0, active_wallets: 0, zero_wallets: 0 };
  const totalPages = Math.ceil(total / limit);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold font-display text-foreground">Wallets</h2>
            <p className="text-muted-foreground text-sm">Manage all user energy wallets</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, email..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Balance"
            value={`${stats.total_balance.toFixed(1)} kWh`}
            icon={<Zap className="h-4 w-4" />}
          />
          <StatCard
            title="Total Wallets"
            value={stats.total_wallets}
            icon={<Users className="h-4 w-4" />}
          />
          <StatCard
            title="Active (>0 kWh)"
            value={stats.active_wallets}
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <StatCard
            title="Zero Balance"
            value={stats.zero_wallets}
            icon={<AlertTriangle className="h-4 w-4" />}
          />
        </div>

        {/* Wallets Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : wallets.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No wallets found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">Owner</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Phone</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Balance (kWh)</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Max (kWh)</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Last Updated</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wallets.map((w: any) => {
                      const pct = w.max_kwh > 0 ? (w.balance_kwh / w.max_kwh) * 100 : 0;
                      const isLow = w.balance_kwh <= 5;
                      const isEmpty = w.balance_kwh <= 0;
                      return (
                        <tr key={w.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                          <td className="p-3">
                            <div>
                              <span className="font-medium text-foreground">{w.owner_name || "—"}</span>
                              {w.owner_email && (
                                <p className="text-xs text-muted-foreground truncate max-w-[180px]">{w.owner_email}</p>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground">{w.owner_phone || "—"}</td>
                          <td className="p-3 text-right">
                            <span className={`font-mono font-bold ${isEmpty ? "text-destructive" : isLow ? "text-amber-500" : "text-foreground"}`}>
                              {w.balance_kwh?.toFixed(2)}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono text-muted-foreground">{w.max_kwh?.toFixed(0)}</td>
                          <td className="p-3">
                            <Badge
                              variant={isEmpty ? "destructive" : isLow ? "outline" : "default"}
                              className="text-xs"
                            >
                              {isEmpty ? "Empty" : isLow ? "Low" : `${pct.toFixed(0)}%`}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground text-xs">
                            {w.updated_at ? format(new Date(w.updated_at), "MMM d, HH:mm") : "—"}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Adjust wallet"
                              onClick={() => { setSelectedWallet(w); setAdjustDialogOpen(true); }}
                            >
                              <Wallet className="h-4 w-4 mr-1" />
                              Adjust
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
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

        {/* Adjust Dialog */}
        <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Wallet — {selectedWallet?.owner_name || selectedWallet?.owner_phone || "User"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-muted-foreground text-xs">Current Balance</Label>
                  <p className="text-2xl font-mono font-bold text-foreground">{selectedWallet?.balance_kwh?.toFixed(2) ?? "0.00"} <span className="text-sm text-muted-foreground">kWh</span></p>
                </div>
                <div className="flex-1">
                  <Label className="text-muted-foreground text-xs">Max Capacity</Label>
                  <p className="text-lg font-mono text-muted-foreground">{selectedWallet?.max_kwh?.toFixed(0) ?? "200"} kWh</p>
                </div>
              </div>
              <div>
                <Label>Adjustment (kWh)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 10 to add, -5 to deduct"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {adjustAmount && !isNaN(parseFloat(adjustAmount)) ? (
                    <>New balance: <span className="font-mono font-medium text-foreground">
                      {((selectedWallet?.balance_kwh ?? 0) + parseFloat(adjustAmount)).toFixed(2)} kWh
                    </span></>
                  ) : "Enter a positive value to credit, negative to debit."}
                </p>
              </div>
              <div>
                <Label>Reason</Label>
                <Input
                  placeholder="e.g. Correction, Bonus, Refund"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setAdjustDialogOpen(false); setAdjustAmount(""); setAdjustReason(""); }}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!adjustAmount || !adjustReason) return toast.error("Fill in all fields");
                  adjustMutation.mutate({
                    userId: selectedWallet.user_id,
                    amount: parseFloat(adjustAmount),
                    reason: adjustReason,
                  });
                }}
                disabled={adjustMutation.isPending}
              >
                {adjustMutation.isPending ? "Adjusting..." : "Apply Adjustment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
