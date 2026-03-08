import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, Terminal } from "lucide-react";
import { adminApi } from "@/lib/admin-api";
import { format } from "date-fns";

const statusVariant: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
  completed: "default",
  pending: "outline",
  failed: "destructive",
  sent: "secondary",
};

export default function AdminMeterCommands() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 30;

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "meter-commands", page, search],
    queryFn: () => adminApi.listMeterCommands(page, limit, search),
  });

  const commands = data?.commands ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold font-display text-foreground">Meter Commands</h2>
            <p className="text-muted-foreground text-sm">MQTT command history and remote control</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Filter by command type..."
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
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : commands.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Terminal className="h-12 w-12 text-muted-foreground/40 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-1">No Commands</h3>
                <p className="text-muted-foreground text-sm">No meter commands have been issued yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left p-3 font-medium text-muted-foreground">Time</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Meter</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Command</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Response</th>
                      <th className="text-left p-3 font-medium text-muted-foreground">Operation ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commands.map((c: any) => (
                      <tr key={c.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                        <td className="p-3 text-muted-foreground text-xs whitespace-nowrap">
                          {format(new Date(c.created_at), "MMM d, HH:mm:ss")}
                        </td>
                        <td className="p-3">
                          <div>
                            <span className="font-medium text-foreground text-xs">{c.meter_name || "—"}</span>
                            {c.mqtt_meter_id && (
                              <p className="text-xs text-muted-foreground font-mono">{c.mqtt_meter_id}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{c.command_type}</code>
                          {c.digital_output_number != null && (
                            <span className="text-xs text-muted-foreground ml-1">
                              DO{c.digital_output_number} → {c.digital_output_state}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <Badge variant={statusVariant[c.status] || "outline"} className="text-xs">{c.status}</Badge>
                        </td>
                        <td className="p-3 text-xs text-muted-foreground max-w-[200px] truncate">
                          {c.response_message || c.response_code || "—"}
                        </td>
                        <td className="p-3 text-xs text-muted-foreground font-mono">{c.operation_id?.slice(0, 12) || "—"}</td>
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
