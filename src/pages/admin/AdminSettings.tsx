import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Save, RefreshCw, Radio, Wifi, WifiOff, Copy, Check,
  ExternalLink, AlertTriangle, Info, Server, Shield, Webhook,
  Terminal, BookOpen, ChevronDown, ChevronUp
} from "lucide-react";
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

const mqttSettingFields: SettingField[] = [
  { key: "mqtt_broker_host", label: "Broker Host / IP", description: "EMQX broker hostname or IP address", type: "text" },
  { key: "mqtt_broker_port", label: "MQTT Port", description: "MQTT TCP listener port (default: 1883)", type: "number" },
  { key: "mqtt_broker_ws_port", label: "WebSocket Port", description: "MQTT WebSocket listener port (default: 8083)", type: "number" },
  { key: "mqtt_dashboard_port", label: "Dashboard Port", description: "EMQX dashboard/API port (default: 18083)", type: "number" },
  { key: "mqtt_api_username", label: "API Key / Username", description: "EMQX HTTP API key (used for publishing commands)", type: "text" },
  { key: "mqtt_api_password", label: "API Secret / Password", description: "EMQX HTTP API secret (paired with the API key above)", type: "text" },
  { key: "mqtt_webhook_secret", label: "Webhook Secret", description: "Secret sent in X-Webhook-Secret header to verify inbound webhooks", type: "text" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="p-1 rounded hover:bg-muted/50 transition-colors shrink-0" title="Copy">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
    </button>
  );
}

function WebhookUrl({ label, url, description }: { label: string; url: string; description: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm">{label}</Label>
      <p className="text-xs text-muted-foreground">{description}</p>
      <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2 border border-border/50 font-mono text-xs break-all">
        <span className="flex-1 select-all">{url}</span>
        <CopyButton text={url} />
      </div>
    </div>
  );
}

function CollapsibleSection({ title, icon: Icon, children, defaultOpen = false }: {
  title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <Icon className="h-4 w-4 text-primary shrink-0" />
        <span className="text-sm font-medium flex-1">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-3 border-t border-border/30">{children}</div>}
    </div>
  );
}

export default function AdminSettings() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [testingMqtt, setTestingMqtt] = useState(false);
  const [mqttStatus, setMqttStatus] = useState<null | { connected: boolean; version?: string; nodes?: number; error?: string }>(null);
  const queryClient = useQueryClient();

  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || "kbhlevuhbdwmtqnaqzyj";
  const baseEdgeFnUrl = `https://${projectId}.supabase.co/functions/v1`;

  const webhookUrls = {
    telemetry: `${baseEdgeFnUrl}/mqtt-webhook`,
    auth: `${baseEdgeFnUrl}/mqtt-auth`,
    meterCommand: `${baseEdgeFnUrl}/mqtt-meter`,
  };

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

  const testMqttConnection = async () => {
    setTestingMqtt(true);
    setMqttStatus(null);
    try {
      const result = await adminApi.testMqtt();
      setMqttStatus(result);
      if (result.connected) {
        toast.success("MQTT broker is reachable!");
      } else {
        toast.error(result.error || "Cannot reach MQTT broker");
      }
    } catch (e: any) {
      setMqttStatus({ connected: false, error: e.message });
      toast.error("Connection test failed: " + e.message);
    } finally {
      setTestingMqtt(false);
    }
  };

  const renderSettingField = (field: SettingField) => (
    <div key={field.key} className="space-y-1">
      <Label className="text-sm">{field.label}</Label>
      <p className="text-xs text-muted-foreground">{field.description}</p>
      <div className="flex items-center gap-2">
        <Input
          type={field.type}
          value={values[field.key] ?? ""}
          onChange={(e) => handleChange(field.key, e.target.value)}
          className="max-w-xs"
          placeholder={field.key === "mqtt_api_password" || field.key === "mqtt_webhook_secret" ? "••••••••" : undefined}
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
  );

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold font-display text-foreground">System Settings</h2>
            <p className="text-muted-foreground text-sm">Configure PowerFlow pricing, KPLC, and MQTT broker</p>
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
            {/* Pricing & Commission */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pricing & Commission</CardTitle>
                <CardDescription>Control how energy is priced and commission is calculated</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settingFields.filter(f => ["resale_rate_kes_per_kwh", "commission_percent"].includes(f.key)).map(renderSettingField)}
              </CardContent>
            </Card>

            {/* KPLC Integration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">KPLC Integration</CardTitle>
                <CardDescription>Configure how payments are forwarded to KPLC</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settingFields.filter(f => ["kplc_paybill", "kplc_account_number", "kplc_min_payment", "b2b_initiator_name"].includes(f.key)).map(renderSettingField)}
              </CardContent>
            </Card>

            {/* ─── MQTT Broker Configuration ─── */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Radio className="h-4 w-4 text-primary" />
                      MQTT Broker (EMQX)
                    </CardTitle>
                    <CardDescription className="mt-1">
                      Configure your COMPERE smart meter MQTT broker connection
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {mqttStatus && (
                      <Badge variant={mqttStatus.connected ? "default" : "destructive"} className="text-xs">
                        {mqttStatus.connected ? (
                          <><Wifi className="h-3 w-3 mr-1" /> Connected</>
                        ) : (
                          <><WifiOff className="h-3 w-3 mr-1" /> Offline</>
                        )}
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={testMqttConnection}
                      disabled={testingMqtt}
                    >
                      {testingMqtt ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" /> : <Wifi className="h-3.5 w-3.5 mr-1" />}
                      Test Connection
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Connection status detail */}
                {mqttStatus && (
                  <div className={`rounded-lg p-3 text-sm border ${mqttStatus.connected ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400" : "bg-destructive/10 border-destructive/20 text-destructive"}`}>
                    {mqttStatus.connected ? (
                      <div className="flex items-start gap-2">
                        <Wifi className="h-4 w-4 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Broker is online</p>
                          {mqttStatus.version && <p className="text-xs opacity-80 mt-0.5">EMQX v{mqttStatus.version} • {mqttStatus.nodes} node(s)</p>}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium">Connection failed</p>
                          <p className="text-xs opacity-80 mt-0.5">{mqttStatus.error}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Broker connection settings */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Server className="h-3.5 w-3.5" /> Broker Connection
                  </h4>
                  {mqttSettingFields.filter(f => ["mqtt_broker_host", "mqtt_broker_port", "mqtt_broker_ws_port", "mqtt_dashboard_port"].includes(f.key)).map(renderSettingField)}
                </div>

                <Separator />

                {/* API Credentials */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Shield className="h-3.5 w-3.5" /> API & Security Credentials
                  </h4>
                  <div className="rounded-lg bg-muted/30 p-3 border border-border/30">
                    <div className="flex gap-2 items-start">
                      <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        These credentials are used by edge functions to publish MQTT commands (relay on/off, read parameters) via the EMQX HTTP API. 
                        The API key is created in <strong>EMQX Dashboard → System → API Keys</strong>. The webhook secret must match the <code>X-Webhook-Secret</code> header configured in your EMQX webhook rule.
                      </p>
                    </div>
                  </div>
                  {mqttSettingFields.filter(f => ["mqtt_api_username", "mqtt_api_password", "mqtt_webhook_secret"].includes(f.key)).map(renderSettingField)}
                </div>

                <Separator />

                {/* Webhook URLs */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Webhook className="h-3.5 w-3.5" /> Webhook Endpoints
                  </h4>
                  <div className="rounded-lg bg-muted/30 p-3 border border-border/30">
                    <div className="flex gap-2 items-start">
                      <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        Configure these URLs in your EMQX broker under <strong>Data Integration → Webhooks</strong>. 
                        Each URL receives specific MQTT events and routes them to the appropriate handler.
                      </p>
                    </div>
                  </div>

                  <WebhookUrl
                    label="Telemetry Webhook (Data Ingestion)"
                    url={webhookUrls.telemetry}
                    description="Receives all meter telemetry data (readings, energy, daily, status). Configure in EMQX as an HTTP action with topic filter: compere/+/# — Include header X-Webhook-Secret."
                  />
                  <WebhookUrl
                    label="Device Authentication"
                    url={webhookUrls.auth}
                    description="Authenticates MQTT device connections. Configure in EMQX under Authentication → HTTP Server with POST method."
                  />
                  <WebhookUrl
                    label="Meter Command API"
                    url={webhookUrls.meterCommand}
                    description="Sends commands to meters (relay control, parameter read/write). Called internally by the app — not configured as an EMQX webhook."
                  />
                </div>

                <Separator />

                {/* Setup Instructions */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5" /> Setup Instructions
                  </h4>

                  <CollapsibleSection title="Step 1 — Install EMQX Broker" icon={Terminal} defaultOpen={false}>
                    <div className="text-xs text-muted-foreground space-y-2 pt-2">
                      <p>Install EMQX on your server (Ubuntu/Debian):</p>
                      <div className="bg-muted/50 rounded-md p-2 font-mono text-[11px] space-y-1">
                        <div className="flex items-center justify-between">
                          <span>curl -s https://assets.emqx.com/scripts/install-emqx-deb.sh | sudo bash</span>
                          <CopyButton text="curl -s https://assets.emqx.com/scripts/install-emqx-deb.sh | sudo bash" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span>sudo apt-get install emqx</span>
                          <CopyButton text="sudo apt-get install emqx" />
                        </div>
                        <div className="flex items-center justify-between">
                          <span>sudo systemctl start emqx</span>
                          <CopyButton text="sudo systemctl start emqx" />
                        </div>
                      </div>
                      <p>Access the EMQX dashboard at <code>http://YOUR_IP:18083</code> (default: admin / public).</p>
                    </div>
                  </CollapsibleSection>

                  <CollapsibleSection title="Step 2 — Create API Key" icon={Shield}>
                    <div className="text-xs text-muted-foreground space-y-2 pt-2">
                      <ol className="list-decimal list-inside space-y-1.5">
                        <li>Open EMQX Dashboard → <strong>System → API Keys</strong></li>
                        <li>Click <strong>Create</strong> and give it a name (e.g. "powerflow")</li>
                        <li>Copy the <strong>API Key</strong> and <strong>Secret Key</strong></li>
                        <li>The <strong>MQTT_HTTP_API_KEY</strong> secret stored in your backend should be: <code>base64(APIKey:SecretKey)</code></li>
                        <li>Enter the API Key and Secret in the fields above for reference</li>
                      </ol>
                    </div>
                  </CollapsibleSection>

                  <CollapsibleSection title="Step 3 — Configure Device Authentication" icon={Shield}>
                    <div className="text-xs text-muted-foreground space-y-2 pt-2">
                      <ol className="list-decimal list-inside space-y-1.5">
                        <li>Open EMQX Dashboard → <strong>Access Control → Authentication</strong></li>
                        <li>Add a new <strong>HTTP Server</strong> authenticator</li>
                        <li>Set Method to <strong>POST</strong></li>
                        <li>Set URL to:
                          <div className="bg-muted/50 rounded-md px-2 py-1 font-mono text-[11px] mt-1 flex items-center justify-between">
                            <span className="break-all">{webhookUrls.auth}</span>
                            <CopyButton text={webhookUrls.auth} />
                          </div>
                        </li>
                        <li>Set Body template to: <code>{`{"clientid":"\${clientid}","username":"\${username}","password":"\${password}"}`}</code></li>
                        <li>This validates every device connection against your meter database</li>
                      </ol>
                    </div>
                  </CollapsibleSection>

                  <CollapsibleSection title="Step 4 — Configure Data Webhook" icon={Webhook}>
                    <div className="text-xs text-muted-foreground space-y-2 pt-2">
                      <ol className="list-decimal list-inside space-y-1.5">
                        <li>Open EMQX Dashboard → <strong>Data Integration → Rules</strong></li>
                        <li>Create a rule with SQL: <code>SELECT * FROM 'compere/+/#'</code></li>
                        <li>Add an <strong>HTTP Server</strong> action</li>
                        <li>Set the URL to:
                          <div className="bg-muted/50 rounded-md px-2 py-1 font-mono text-[11px] mt-1 flex items-center justify-between">
                            <span className="break-all">{webhookUrls.telemetry}</span>
                            <CopyButton text={webhookUrls.telemetry} />
                          </div>
                        </li>
                        <li>Set Method to <strong>POST</strong></li>
                        <li>Add header: <code>X-Webhook-Secret</code> = your webhook secret (entered above)</li>
                        <li>Set Body to: <code>{`{"topic":"\${topic}","payload":\${payload},"clientid":"\${clientid}","timestamp":\${timestamp}}`}</code></li>
                      </ol>
                      <div className="mt-2 bg-amber-500/10 border border-amber-500/20 rounded-md p-2 flex gap-2 items-start">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-amber-600 dark:text-amber-400">
                          The <code>X-Webhook-Secret</code> header must match the <strong>MQTT_WEBHOOK_SECRET</strong> stored in your backend secrets. Without this, the webhook will reject all inbound telemetry.
                        </p>
                      </div>
                    </div>
                  </CollapsibleSection>

                  <CollapsibleSection title="Step 5 — Open Firewall Ports" icon={Server}>
                    <div className="text-xs text-muted-foreground space-y-2 pt-2">
                      <p>Ensure these ports are open on your broker server:</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { port: "1883", desc: "MQTT TCP" },
                          { port: "8883", desc: "MQTT TLS (optional)" },
                          { port: "8083", desc: "WebSocket" },
                          { port: "8084", desc: "WebSocket TLS (optional)" },
                          { port: "18083", desc: "Dashboard / HTTP API" },
                        ].map(p => (
                          <div key={p.port} className="flex items-center gap-2 bg-muted/30 rounded px-2 py-1.5">
                            <Badge variant="outline" className="text-[10px] font-mono">{p.port}</Badge>
                            <span className="text-[11px]">{p.desc}</span>
                          </div>
                        ))}
                      </div>
                      <div className="bg-muted/50 rounded-md p-2 font-mono text-[11px] space-y-1 mt-1">
                        <div className="flex items-center justify-between">
                          <span>sudo ufw allow 1883,8083,18083/tcp</span>
                          <CopyButton text="sudo ufw allow 1883,8083,18083/tcp" />
                        </div>
                      </div>
                    </div>
                  </CollapsibleSection>

                  <CollapsibleSection title="Step 6 — COMPERE Meter Topic Format" icon={BookOpen}>
                    <div className="text-xs text-muted-foreground space-y-2 pt-2">
                      <p>COMPERE meters publish data on these topics (where <code>MN</code> is the meter number):</p>
                      <div className="bg-muted/50 rounded-md p-2 font-mono text-[11px] space-y-1">
                        {[
                          "compere/{MN}/data          → Real-time readings (V, I, P, PF, F)",
                          "compere/{MN}/energy        → Tariff energy accumulators + harmonics",
                          "compere/{MN}/daily_energy  → Daily freeze readings",
                          "compere/{MN}/status        → Digital I/O states (relay on/off)",
                          "compere/{MN}/read_resp     → Response to parameter read commands",
                          "compere/{MN}/write_resp    → Response to parameter write commands",
                          "compere/{MN}/recall_resp   → Response to recall commands",
                          "compere/{MN}/digital_output_resp → Response to relay control",
                        ].map((t, i) => <div key={i}>{t}</div>)}
                      </div>
                      <p className="mt-1">
                        The system automatically maps the <code>MN</code> to the <code>mqtt_meter_id</code> field in the meters table.
                        Ensure each meter's MQTT Meter ID is set correctly when registering meters.
                      </p>
                    </div>
                  </CollapsibleSection>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
