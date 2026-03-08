import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Search, Plus, Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { adminApi } from "@/lib/admin-api";

export default function AdminMeters() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [newMeter, setNewMeter] = useState({ name: "", tuya_device_id: "", property_name: "", mqtt_meter_id: "" });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "meters", page, search],
    queryFn: () => adminApi.listMeters(page, 20, search),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => adminApi.updateMeterStatus(id, status),
    onSuccess: () => { toast.success("Meter status updated"); queryClient.invalidateQueries({ queryKey: ["admin", "meters"] }); },
    onError: (e: any) => toast.error(e.message),
  });

  const registerMutation = useMutation({
    mutationFn: (data: Record<string, any>) => adminApi.registerMeter(data),
    onSuccess: () => {
      toast.success("Meter registered");
      setRegisterOpen(false);
      setNewMeter({ name: "", tuya_device_id: "", property_name: "" });
      queryClient.invalidateQueries({ queryKey: ["admin", "meters"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const meters = data?.meters ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const statusColor = (status: string) => {
    switch (status) {
      case "connected": return "bg-emerald-500/10 text-emerald-500";
      case "available": return "bg-primary/10 text-primary";
      case "offline": return "bg-destructive/10 text-destructive";
      case "maintenance": return "bg-amber-500/10 text-amber-500";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold font-display text-foreground">Meters</h2>
            <p className="text-muted-foreground text-sm">{total} meters in system</p>
          </div>
          <div className="flex gap-2">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search meters..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <Button onClick={() => setRegisterOpen(true)} className="shrink-0">
              <Plus className="h-4 w-4 mr-1" /> Register
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : meters.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">No meters found</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">Name</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Device ID</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Property</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Balance (kWh)</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Owner</th>
                      <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {meters.map((meter: any) => (
                      <tr key={meter.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="p-3 font-medium text-foreground">{meter.name}</td>
                        <td className="p-3 text-muted-foreground font-mono text-xs">{meter.tuya_device_id}</td>
                        <td className="p-3 text-muted-foreground">{meter.property_name || "—"}</td>
                        <td className="p-3 text-right font-mono text-foreground">{meter.balance_kwh?.toFixed(2)}</td>
                        <td className="p-3">
                          <Badge className={statusColor(meter.status)} variant="outline">{meter.status}</Badge>
                        </td>
                        <td className="p-3 text-muted-foreground text-xs">{meter.owner_name || "Unassigned"}</td>
                        <td className="p-3 text-right">
                          <Select
                            value={meter.status}
                            onValueChange={(val) => statusMutation.mutate({ id: meter.id, status: val })}
                          >
                            <SelectTrigger className="w-28 h-8">
                              <Settings className="h-3 w-3 mr-1" />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="available">Available</SelectItem>
                              <SelectItem value="connected">Connected</SelectItem>
                              <SelectItem value="offline">Offline</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                            </SelectContent>
                          </Select>
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

        {/* Register Meter Dialog */}
        <Dialog open={registerOpen} onOpenChange={setRegisterOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Register New Meter</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div><Label>Meter Name</Label><Input placeholder="e.g. Unit A1" value={newMeter.name} onChange={(e) => setNewMeter(p => ({ ...p, name: e.target.value }))} /></div>
              <div><Label>Device ID</Label><Input placeholder="Tuya / COMPERE device ID" value={newMeter.tuya_device_id} onChange={(e) => setNewMeter(p => ({ ...p, tuya_device_id: e.target.value }))} /></div>
              <div><Label>Property Name</Label><Input placeholder="e.g. Greenview Apartments" value={newMeter.property_name} onChange={(e) => setNewMeter(p => ({ ...p, property_name: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRegisterOpen(false)}>Cancel</Button>
              <Button onClick={() => {
                if (!newMeter.name || !newMeter.tuya_device_id) return toast.error("Name and Device ID required");
                registerMutation.mutate(newMeter);
              }} disabled={registerMutation.isPending}>
                {registerMutation.isPending ? "Registering..." : "Register Meter"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
