import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Save, RefreshCw } from "lucide-react";
import { adminApi } from "@/lib/admin-api";

interface SettingField {
  key: string;
  label: string;
  description: string;
  type: "number" | "text";
  suffix?: string;
}

const settingFields: SettingField[] = [
  { key: "resale_rate_kes_per_kwh", label: "Resale Rate", description: "Price per kWh charged to customers", type: "number", suffix: "KES/kWh" },
  { key: "commission_percent", label: "Commission Rate", description: "Percentage retained from each recharge", type: "number", suffix: "%" },
  { key: "kplc_paybill", label: "KPLC Paybill", description: "M-Pesa paybill number for KPLC payments", type: "text" },
  { key: "kplc_account_number", label: "KPLC Account Number", description: "Account number for KPLC payments", type: "text" },
  { key: "kplc_min_payment", label: "KPLC Minimum Payment", description: "Minimum pooled amount before forwarding to KPLC", type: "number", suffix: "KES" },
  { key: "b2b_initiator_name", label: "B2B Initiator Name", description: "M-Pesa B2B initiator username", type: "text" },
];

export default function AdminSettings() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin", "settings"],
    queryFn: adminApi.getSettings,
  });

  useEffect(() => {
    if (settings?.settings) {
      const initial: Record<string, string> = {};
      settings.settings.forEach((s: any) => { initial[s.key] = s.value; });
      setValues(initial);
      setChanged(new Set());
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) => adminApi.updateSetting(key, value),
    onSuccess: (_, vars) => {
      toast.success(`Updated ${vars.key}`);
      setChanged(prev => { const next = new Set(prev); next.delete(vars.key); return next; });
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleChange = (key: string, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
    setChanged(prev => new Set(prev).add(key));
  };

  const saveAll = () => {
    changed.forEach(key => {
      updateMutation.mutate({ key, value: values[key] });
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold font-display text-foreground">System Settings</h2>
            <p className="text-muted-foreground text-sm">Configure PowerFlow pricing, commissions, and KPLC integration</p>
          </div>
          {changed.size > 0 && (
            <Button onClick={saveAll} disabled={updateMutation.isPending}>
              <Save className="h-4 w-4 mr-1" />
              Save {changed.size} change{changed.size > 1 ? "s" : ""}
            </Button>
          )}
        </div>

        {isLoading ? (
          <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pricing & Commission</CardTitle>
                <CardDescription>Control how energy is priced and commission is calculated</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settingFields.filter(f => ["resale_rate_kes_per_kwh", "commission_percent"].includes(f.key)).map(field => (
                  <div key={field.key} className="space-y-1">
                    <Label className="text-sm">{field.label}</Label>
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type={field.type}
                        value={values[field.key] ?? ""}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className="max-w-xs"
                      />
                      {field.suffix && <span className="text-sm text-muted-foreground">{field.suffix}</span>}
                      {changed.has(field.key) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateMutation.mutate({ key: field.key, value: values[field.key] })}
                          disabled={updateMutation.isPending}
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">KPLC Integration</CardTitle>
                <CardDescription>Configure how payments are forwarded to KPLC</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settingFields.filter(f => ["kplc_paybill", "kplc_account_number", "kplc_min_payment", "b2b_initiator_name"].includes(f.key)).map(field => (
                  <div key={field.key} className="space-y-1">
                    <Label className="text-sm">{field.label}</Label>
                    <p className="text-xs text-muted-foreground">{field.description}</p>
                    <div className="flex items-center gap-2">
                      <Input
                        type={field.type}
                        value={values[field.key] ?? ""}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className="max-w-xs"
                      />
                      {field.suffix && <span className="text-sm text-muted-foreground">{field.suffix}</span>}
                      {changed.has(field.key) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateMutation.mutate({ key: field.key, value: values[field.key] })}
                          disabled={updateMutation.isPending}
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
