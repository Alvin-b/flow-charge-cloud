import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Zap, Wifi, WifiOff, QrCode, X,
  ChevronRight, Link2Off, AlertCircle, CheckCircle2,
  Building2, Wrench
} from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { meterApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ActiveConnection {
  connection_id: string;
  meter_id: string;
  meter_code: string;
  meter_name: string;
  property_name: string | null;
  meter_balance: number;
  wallet_balance: number;
  connected_at: string;
}

interface ConnectionHistory {
  id: string;
  meter_id: string;
  connected_at: string;
  disconnected_at: string | null;
  is_active: boolean;
  connection_type: string;
  total_consumed_kwh: number;
  meters: {
    name: string;
    meter_code: string;
    property_name: string | null;
  };
}

type Modal = null | "add" | "disconnect_confirm";
type AddStep = "method" | "scan" | "manual" | "connecting";

const StatusBadge = ({ status }: { status: string }) => {
  const config: Record<string, { icon: typeof Wifi; label: string; cls: string }> = {
    connected: { icon: Wifi, label: "Connected", cls: "bg-success/15 text-success" },
    available: { icon: Wifi, label: "Available", cls: "bg-primary/15 text-primary" },
    offline: { icon: WifiOff, label: "Offline", cls: "bg-destructive/15 text-destructive" },
    maintenance: { icon: Wrench, label: "Maintenance", cls: "bg-accent/15 text-accent" },
  };
  const c = config[status] || config.offline;
  const Icon = c.icon;
  return (
    <span className={cn("flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium", c.cls)}>
      <Icon className="w-2.5 h-2.5" />
      {c.label}
    </span>
  );
};

const Meters = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeConn, setActiveConn] = useState<ActiveConnection | null>(null);
  const [history, setHistory] = useState<ConnectionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [meterCode, setMeterCode] = useState("");
  const [addStep, setAddStep] = useState<AddStep>("method");
  const [connectLoading, setConnectLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [activeRes, historyRes] = await Promise.all([
        meterApi.getActiveConnection(),
        meterApi.getHistory(),
      ]);
      setActiveConn(activeRes.connection ?? null);
      setHistory(historyRes.connections ?? []);
    } catch (err) {
      console.error("Fetch meters error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const closeModal = () => {
    setModal(null);
    setAddStep("method");
    setMeterCode("");
  };

  const handleConnect = async () => {
    if (!meterCode.trim()) return;
    setAddStep("connecting");
    setConnectLoading(true);
    try {
      await meterApi.connect(meterCode.trim(), "manual_code");
      toast({ title: "Connected!", description: "Meter connected successfully. Your wallet balance will be used." });
      await fetchData();
      closeModal();
    } catch (err: any) {
      toast({ title: "Connection failed", description: err.message, variant: "destructive" });
      setAddStep("manual");
    } finally {
      setConnectLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!activeConn) return;
    try {
      await meterApi.disconnect(activeConn.connection_id);
      toast({ title: "Disconnected", description: "You can connect to a new meter anytime. Wallet balance is preserved." });
      await fetchData();
      closeModal();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const timeSince = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-navy flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-navy pb-24">
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-muted/30 transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">My Meter</h1>
            <p className="text-xs text-muted-foreground">
              {activeConn ? "1 meter connected" : "No meter connected"}
            </p>
          </div>
        </div>
        {!activeConn && (
          <button
            onClick={() => { setModal("add"); setAddStep("method"); }}
            className="flex items-center gap-2 px-3 py-2 gradient-cyan rounded-xl text-[hsl(var(--navy))] text-sm font-bold glow-cyan"
          >
            <Plus className="w-4 h-4" /> Connect
          </button>
        )}
      </div>

      <div className="px-5 space-y-4">
        {/* Active Connection Card */}
        {activeConn ? (
          <div className="glass-card-elevated rounded-2xl p-5 border border-primary/20 animate-fade-in-up">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center border border-primary/10">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-base font-bold text-foreground">{activeConn.meter_name}</p>
                  {activeConn.property_name && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> {activeConn.property_name}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">{activeConn.meter_code}</p>
                </div>
              </div>
              <StatusBadge status="connected" />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="glass rounded-xl p-3 border border-white/5">
                <p className="text-[9px] text-muted-foreground uppercase mb-1">Wallet Balance</p>
                <p className="text-lg font-bold text-primary">{activeConn.wallet_balance.toFixed(1)} kWh</p>
              </div>
              <div className="glass rounded-xl p-3 border border-white/5">
                <p className="text-[9px] text-muted-foreground uppercase mb-1">Connected</p>
                <p className="text-sm font-bold text-foreground">{timeSince(activeConn.connected_at)}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setModal("disconnect_confirm")}
                className="flex-1 h-11 rounded-xl border-destructive/40 text-destructive hover:bg-destructive/10"
              >
                <Link2Off className="w-4 h-4 mr-1.5" /> Disconnect
              </Button>
              <Button
                className="flex-1 h-11 gradient-cyan text-[hsl(var(--navy))] font-bold rounded-xl"
                onClick={() => navigate("/recharge")}
              >
                <Zap className="w-4 h-4 mr-1.5" /> Top Up
              </Button>
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-8 text-center border-2 border-dashed border-primary/20 animate-fade-in-up">
            <Zap className="w-12 h-12 text-primary/40 mx-auto mb-3" />
            <p className="text-foreground font-semibold">No meter connected</p>
            <p className="text-xs text-muted-foreground mt-1">
              Scan the QR code on your meter or enter the meter code to connect
            </p>
            <Button
              onClick={() => { setModal("add"); setAddStep("method"); }}
              className="mt-4 gradient-cyan text-[hsl(var(--navy))] font-bold rounded-xl px-6"
            >
              <Plus className="w-4 h-4 mr-1.5" /> Connect Meter
            </Button>
          </div>
        )}

        {/* Connection History */}
        {history.length > 0 && (
          <div className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <h3 className="text-sm font-semibold text-foreground mb-3">Connection History</h3>
            <div className="glass-card rounded-2xl overflow-hidden border border-border/10">
              {history.map((conn, i) => (
                <div
                  key={conn.id}
                  className={cn("flex items-center gap-3 px-4 py-3.5", i < history.length - 1 && "border-b border-border/10")}
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center",
                    conn.is_active ? "bg-primary/15" : "bg-muted/20"
                  )}>
                    <Zap className={cn("w-5 h-5", conn.is_active ? "text-primary" : "text-muted-foreground")} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{conn.meters?.name || "Unknown"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {conn.meters?.meter_code} · {conn.connection_type === "qr_scan" ? "QR Scan" : "Manual"}
                    </p>
                  </div>
                  <div className="text-right">
                    {conn.is_active ? (
                      <span className="text-[10px] text-success font-medium">Active</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">{timeSince(conn.disconnected_at)}</span>
                    )}
                    {conn.total_consumed_kwh > 0 && (
                      <p className="text-[10px] text-muted-foreground">{conn.total_consumed_kwh} kWh used</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info banner */}
        <div className="glass-card rounded-2xl p-4 border border-primary/10 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
              <AlertCircle className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">How it works</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Connect to a meter by scanning its QR code or entering the meter code.
                While connected, the meter uses energy from your wallet balance.
                You can disconnect anytime — your remaining balance stays in your wallet.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Meter Modal ── */}
      {modal === "add" && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full glass-card rounded-t-3xl p-6 border-t border-primary/15 animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground">Connect Meter</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Scan QR code or enter meter code</p>
              </div>
              <button onClick={closeModal} className="p-2 rounded-xl hover:bg-muted/30">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {addStep === "method" && (
              <div className="space-y-3">
                <button onClick={() => setAddStep("scan")} className="w-full flex items-center gap-4 p-4 glass rounded-2xl border border-primary/20 hover:border-primary/40 transition-all text-left">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                    <QrCode className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Scan QR Code</p>
                    <p className="text-xs text-muted-foreground">Point camera at the QR sticker on the meter</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                </button>
                <button onClick={() => setAddStep("manual")} className="w-full flex items-center gap-4 p-4 glass rounded-2xl border border-border/20 hover:border-primary/20 transition-all text-left">
                  <div className="w-12 h-12 rounded-xl bg-muted/20 flex items-center justify-center shrink-0">
                    <Zap className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Enter Meter Code</p>
                    <p className="text-xs text-muted-foreground">Type the code from the meter label</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                </button>
              </div>
            )}

            {addStep === "scan" && (
              <div className="space-y-4">
                <div className="w-full h-52 rounded-2xl bg-muted/20 border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-3">
                  <QrCode className="w-14 h-14 text-primary opacity-60" />
                  <p className="text-sm text-muted-foreground">Point camera at meter QR code</p>
                  <p className="text-xs text-muted-foreground/60">(Camera access required)</p>
                </div>
                <Button onClick={() => setAddStep("manual")} variant="outline" className="w-full h-11 rounded-xl border-border/40 text-foreground">
                  Enter code instead
                </Button>
              </div>
            )}

            {addStep === "manual" && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Meter Code *</p>
                  <input
                    value={meterCode}
                    onChange={(e) => setMeterCode(e.target.value)}
                    placeholder="e.g. PF-M001-A3X7"
                    className="w-full px-4 py-3.5 glass-card rounded-xl border border-border/50 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 font-mono text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Found on the sticker on your meter</p>
                </div>
                <div className="glass-card rounded-xl p-3 border border-primary/15">
                  <p className="text-xs text-muted-foreground text-center">
                    💡 Your <span className="text-primary font-semibold">wallet balance will power this meter</span> once connected.
                  </p>
                </div>
                <Button
                  onClick={handleConnect}
                  disabled={!meterCode.trim() || connectLoading}
                  className="w-full gradient-cyan text-[hsl(var(--navy))] font-bold h-12 rounded-xl disabled:opacity-40"
                >
                  {connectLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-[hsl(var(--navy))] border-t-transparent rounded-full animate-spin" />
                      Connecting…
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" /> Connect Meter
                    </span>
                  )}
                </Button>
              </div>
            )}

            {addStep === "connecting" && (
              <div className="flex flex-col items-center justify-center py-8 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center animate-pulse">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <p className="text-foreground font-semibold">Connecting to meter…</p>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Disconnect Confirm Modal ── */}
      {modal === "disconnect_confirm" && activeConn && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full glass-card rounded-t-3xl p-6 border-t border-destructive/20 animate-slide-up space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Disconnect Meter</h2>
                <p className="text-xs text-muted-foreground">Remove connection to {activeConn.meter_name}</p>
              </div>
              <button onClick={closeModal} className="p-2 rounded-xl hover:bg-muted/30">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="glass rounded-xl p-4 border border-destructive/20 space-y-2">
              <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                <Link2Off className="w-3.5 h-3.5" /> Meter will be released
              </p>
              <p className="text-xs text-muted-foreground">
                {activeConn.meter_name} — {activeConn.property_name || activeConn.meter_code}
              </p>
            </div>

            <div className="glass-card rounded-xl p-3 border border-primary/15">
              <p className="text-xs text-muted-foreground text-center">
                💡 Your <span className="text-primary font-semibold">wallet balance stays safe</span> — no energy is lost.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={closeModal} className="flex-1 h-11 rounded-xl border-border/40">Cancel</Button>
              <Button
                className="flex-1 h-11 bg-destructive text-destructive-foreground font-bold rounded-xl"
                onClick={handleDisconnect}
              >
                <Link2Off className="w-4 h-4 mr-1.5" /> Disconnect
              </Button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="/" />
    </div>
  );
};

export default Meters;
