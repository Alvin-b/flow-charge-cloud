import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Bell, Megaphone, AlertTriangle, Zap, Info } from "lucide-react";
import { adminApi } from "@/lib/admin-api";

const notificationTypes = [
  { value: "system", label: "System", icon: Info, description: "General system announcements" },
  { value: "payment", label: "Payment", icon: Zap, description: "Payment-related notifications" },
  { value: "meter", label: "Meter", icon: Megaphone, description: "Meter status updates" },
  { value: "low_balance", label: "Low Balance", icon: AlertTriangle, description: "Balance warnings" },
];

const templates = [
  { title: "Scheduled Maintenance", body: "PowerFlow will undergo scheduled maintenance on [DATE] from [TIME] to [TIME]. Your service may be briefly interrupted.", type: "system" },
  { title: "New Feature Available", body: "We've added a new feature to PowerFlow! Check out [FEATURE] in your app to improve your energy management.", type: "system" },
  { title: "Rate Change Notice", body: "Starting [DATE], the energy rate will be adjusted to KES [RATE]/kWh. Current balances are not affected.", type: "payment" },
  { title: "Meter Firmware Update", body: "Your smart meter will receive an automatic firmware update tonight. No action is required from your side.", type: "meter" },
];

export default function AdminNotificationsManager() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] = useState("system");

  const broadcastMutation = useMutation({
    mutationFn: () => adminApi.sendBroadcast(title, body, type),
    onSuccess: (data: any) => {
      toast.success(`Broadcast sent to ${data.sent} users`);
      setTitle("");
      setBody("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const canSend = title.trim().length >= 3 && body.trim().length >= 5;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground">Notifications</h2>
          <p className="text-muted-foreground text-sm">Send broadcast notifications to all users</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Compose */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Megaphone className="h-4 w-4" />
                  Compose Broadcast
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Notification Type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {notificationTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          <span className="flex items-center gap-2">
                            <t.icon className="h-3.5 w-3.5" />
                            {t.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Title</Label>
                  <Input
                    placeholder="e.g. Scheduled Maintenance"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <Label>Message Body</Label>
                  <Textarea
                    placeholder="Write your notification message here..."
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={5}
                  />
                  <p className="text-xs text-muted-foreground mt-1">{body.length} characters</p>
                </div>

                {/* Preview */}
                {(title || body) && (
                  <div className="border border-border rounded-xl p-4 bg-muted/20">
                    <p className="text-xs text-muted-foreground mb-2">Preview</p>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Bell className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{title || "Title..."}</p>
                        <p className="text-muted-foreground text-xs mt-0.5">{body || "Message body..."}</p>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => broadcastMutation.mutate()}
                  disabled={!canSend || broadcastMutation.isPending}
                  className="w-full"
                >
                  {broadcastMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {broadcastMutation.isPending ? "Sending..." : "Send to All Users"}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Templates */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Quick Templates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {templates.map((tmpl, i) => (
                  <button
                    key={i}
                    onClick={() => { setTitle(tmpl.title); setBody(tmpl.body); setType(tmpl.type); }}
                    className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                  >
                    <p className="text-sm font-medium text-foreground">{tmpl.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{tmpl.body}</p>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
