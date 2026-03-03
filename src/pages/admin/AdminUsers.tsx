import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, UserX, UserCheck, KeyRound, Wallet, ChevronLeft, ChevronRight } from "lucide-react";
import { adminApi } from "@/lib/admin-api";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "users", page, search],
    queryFn: () => adminApi.listUsers(page, 20, search),
  });

  const suspendMutation = useMutation({
    mutationFn: (userId: string) => adminApi.suspendUser(userId),
    onSuccess: () => { toast.success("User suspended"); queryClient.invalidateQueries({ queryKey: ["admin", "users"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const unsuspendMutation = useMutation({
    mutationFn: (userId: string) => adminApi.unsuspendUser(userId),
    onSuccess: () => { toast.success("User unsuspended"); queryClient.invalidateQueries({ queryKey: ["admin", "users"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const resetPinMutation = useMutation({
    mutationFn: (userId: string) => adminApi.resetUserPin(userId),
    onSuccess: () => { toast.success("PIN reset successfully"); queryClient.invalidateQueries({ queryKey: ["admin", "users"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const adjustMutation = useMutation({
    mutationFn: ({ userId, amount, reason }: { userId: string; amount: number; reason: string }) =>
      adminApi.adjustWallet(userId, amount, reason),
    onSuccess: () => {
      toast.success("Wallet adjusted");
      setAdjustDialogOpen(false);
      setAdjustAmount("");
      setAdjustReason("");
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold font-display text-foreground">Users</h2>
            <p className="text-muted-foreground text-sm">{total} registered users</p>
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

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No users found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Phone</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Email</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Balance (kWh)</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user: any) => (
                      <tr key={user.user_id} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-medium text-foreground">{user.full_name || "—"}</td>
                        <td className="p-3 text-muted-foreground">{user.phone || "—"}</td>
                        <td className="p-3 text-muted-foreground">{user.email || "—"}</td>
                        <td className="p-3 text-right font-mono text-foreground">{user.balance_kwh?.toFixed(2) ?? "0.00"}</td>
                        <td className="p-3">
                          <Badge variant={user.suspended ? "destructive" : "default"} className="text-xs">
                            {user.suspended ? "Suspended" : "Active"}
                          </Badge>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Adjust wallet"
                              onClick={() => { setSelectedUser(user); setAdjustDialogOpen(true); }}
                            >
                              <Wallet className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Reset PIN"
                              onClick={() => resetPinMutation.mutate(user.user_id)}
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                            {user.suspended ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Unsuspend"
                                onClick={() => unsuspendMutation.mutate(user.user_id)}
                              >
                                <UserCheck className="h-4 w-4 text-emerald-500" />
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Suspend"
                                onClick={() => suspendMutation.mutate(user.user_id)}
                              >
                                <UserX className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
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

        {/* Wallet Adjust Dialog */}
        <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Wallet — {selectedUser?.full_name || selectedUser?.phone}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Current Balance</Label>
                <p className="text-lg font-mono font-bold text-foreground">{selectedUser?.balance_kwh?.toFixed(2) ?? "0.00"} kWh</p>
              </div>
              <div>
                <Label>Adjustment (kWh)</Label>
                <Input
                  type="number"
                  placeholder="e.g. 10 to add or -5 to deduct"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                />
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
              <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => {
                  if (!adjustAmount || !adjustReason) return toast.error("Fill in all fields");
                  adjustMutation.mutate({
                    userId: selectedUser.user_id,
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
