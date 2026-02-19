import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Zap, Wifi, WifiOff, QrCode, X,
  ChevronRight, Link2, Link2Off, RefreshCw, AlertCircle, CheckCircle2,
  Home, Building2, Smartphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

const mockMeters = [
  {
    id: "m-1",
    tuya_device_id: "eb5f6f5cbf5f7c6f39pjoa",
    name: "Nairobi Apartment",
    property_name: "Karen Estate, Block C",
    status: "online",
    rate_kwh_hr: 0.45,
    balance_kwh: 87.4,
    max_kwh: 200,
    lastSync: "2 min ago",
    sms_fallback: true,
  },
  {
    id: "m-2",
    tuya_device_id: "eb4a3b2c1d0e9f8g7h6i5j",
    name: "Westlands Office",
    property_name: "Westlands Plaza, 3rd Floor",
    status: "offline",
    rate_kwh_hr: 0,
    balance_kwh: 12.1,
    max_kwh: 200,
    lastSync: "3h ago",
    sms_fallback: false,
  },
];

type Modal = null | "add" | "detail" | "reconnect" | "unlink_confirm";
type AddStep = "method" | "scan" | "manual" | "confirm";

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium ${
    status === "online" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
  }`}>
    {status === "online" ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
    {status === "online" ? "Online" : "Offline"}
  </span>
);

const Meters = () => {
  const navigate = useNavigate();
  const [modal, setModal] = useState<Modal>(null);
  const [selectedMeter, setSelectedMeter] = useState<typeof mockMeters[0] | null>(null);
  const [manualDeviceId, setManualDeviceId] = useState("");
  const [meterName, setMeterName] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [addStep, setAddStep] = useState<AddStep>("method");
  const [syncing, setSyncing] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);

  const openDetail = (meter: typeof mockMeters[0]) => {
    setSelectedMeter(meter);
    setModal("detail");
  };

  const startReconnect = (meter: typeof mockMeters[0]) => {
    setSelectedMeter(meter);
    setManualDeviceId(meter.tuya_device_id);
    setMeterName(meter.name);
    setPropertyName(meter.property_name);
    setModal("reconnect");
  };

  const closeModal = () => {
    setModal(null);
    setAddStep("method");
    setManualDeviceId("");
    setMeterName("");
    setPropertyName("");
  };

  const handleAddMeter = async () => {
    if (addStep === "confirm") {
      setLinkLoading(true);
      // Simulated API call — replace with real Tuya edge function call
      await new Promise((r) => setTimeout(r, 1500));
      setLinkLoading(false);
      closeModal();
      return;
    }
    setAddStep("confirm");
  };

  const handleSyncAll = async () => {
    setSyncing(true);
    await new Promise((r) => setTimeout(r, 1800));
    setSyncing(false);
  };

  const percentFull = (kwh: number, max: number) =>
    Math.min(100, Math.round((kwh / max) * 100));

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
            <h1 className="text-xl font-bold text-foreground">My Meters</h1>
            <p className="text-xs text-muted-foreground">Tuya Smart Meters</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncAll}
            className="p-2.5 glass-card rounded-xl border border-border/20 hover:border-primary/30 transition-all"
          >
            <RefreshCw className={`w-4 h-4 text-primary ${syncing ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => { setModal("add"); setAddStep("method"); }}
            className="flex items-center gap-2 px-3 py-2 gradient-cyan rounded-xl text-[hsl(var(--navy))] text-sm font-bold glow-cyan"
          >
            <Plus className="w-4 h-4" />
            Add Meter
          </button>
        </div>
      </div>

      {/* Meter cards */}
      <div className="px-5 space-y-4">
        {mockMeters.map((meter, i) => {
          const pct = percentFull(meter.balance_kwh, meter.max_kwh);
          const isLow = pct < 20;
          return (
            <div
              key={meter.id}
              className="glass-card rounded-2xl p-4 border border-border/20 cursor-pointer hover:border-primary/30 transition-all animate-fade-in-up"
              style={{ animationDelay: `${i * 0.1}s` }}
              onClick={() => openDetail(meter)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${meter.status === "online" ? "bg-primary/15" : "bg-muted/30"}`}>
                    <Zap className={`w-5 h-5 ${meter.status === "online" ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{meter.name}</p>
                    <p className="text-xs text-muted-foreground">{meter.property_name}</p>
                    <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">{meter.tuya_device_id.slice(0, 16)}…</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={meter.status} />
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              {/* Balance % bar */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Energy Balance</span>
                  <span className={`text-xs font-bold ${isLow ? "text-destructive" : "text-primary"}`}>
                    {pct}% · {meter.balance_kwh} kWh
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted/30">
                  <div
                    className={`h-2 rounded-full transition-all ${isLow ? "bg-destructive" : "gradient-cyan"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {isLow && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <AlertCircle className="w-3 h-3 text-destructive" />
                    <span className="text-[10px] text-destructive">Low balance — recharge soon</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Rate", val: `${meter.rate_kwh_hr} kWh/hr`, color: "text-foreground" },
                  { label: "Max Capacity", val: `${meter.max_kwh} kWh`, color: "text-foreground" },
                  { label: "Last sync", val: meter.lastSync, color: "text-muted-foreground" },
                ].map(({ label, val, color }) => (
                  <div key={label} className="glass rounded-lg p-2 border border-white/5">
                    <p className="text-[9px] text-muted-foreground uppercase mb-1">{label}</p>
                    <p className={`text-xs font-semibold ${color}`}>{val}</p>
                  </div>
                ))}
              </div>

              {meter.sms_fallback && (
                <div className="mt-3 flex items-center gap-2 bg-accent/10 rounded-lg px-3 py-1.5 border border-accent/20">
                  <Smartphone className="w-3 h-3 text-accent" />
                  <span className="text-[10px] text-accent font-medium">SMS fallback active</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Reconnect / Move info banner */}
        <div className="glass-card rounded-2xl p-4 border border-primary/10 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
              <Home className="w-4 h-4 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">Moving to a new property?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                You can unlink your current meter and reconnect to your new meter in seconds. Your kWh balance stays in your wallet.
              </p>
              <button
                onClick={() => selectedMeter ? startReconnect(selectedMeter) : setModal("add")}
                className="mt-2 text-xs text-primary font-semibold underline-offset-2 hover:underline"
              >
                Reconnect to new meter →
              </button>
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
                <h2 className="text-xl font-bold text-foreground">Link Tuya Meter</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Connect your smart meter to PowerFlow</p>
              </div>
              <button onClick={closeModal} className="p-2 rounded-xl hover:bg-muted/30">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {addStep === "method" && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground mb-4">How would you like to add your meter?</p>
                <button
                  onClick={() => setAddStep("scan")}
                  className="w-full flex items-center gap-4 p-4 glass rounded-2xl border border-primary/20 hover:border-primary/40 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                    <QrCode className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Scan QR Code</p>
                    <p className="text-xs text-muted-foreground">Point camera at the QR sticker on your meter</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
                </button>
                <button
                  onClick={() => setAddStep("manual")}
                  className="w-full flex items-center gap-4 p-4 glass rounded-2xl border border-border/20 hover:border-primary/20 transition-all text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-muted/20 flex items-center justify-center shrink-0">
                    <Zap className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Enter Device ID</p>
                    <p className="text-xs text-muted-foreground">Type the Tuya Device ID from the meter label</p>
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
                  Enter ID instead
                </Button>
                <Button onClick={() => setAddStep("confirm")} className="w-full gradient-cyan text-[hsl(var(--navy))] font-bold h-12 rounded-xl">
                  Scan QR Code
                </Button>
              </div>
            )}

            {addStep === "manual" && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Tuya Device ID *</p>
                  <input
                    value={manualDeviceId}
                    onChange={(e) => setManualDeviceId(e.target.value)}
                    placeholder="e.g. eb5f6f5cbf5f7c6f39pjoa"
                    className="w-full px-4 py-3.5 glass-card rounded-xl border border-border/50 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 font-mono text-sm"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">Found on the sticker on your Tuya smart meter</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Meter Label (optional)</p>
                  <input
                    value={meterName}
                    onChange={(e) => setMeterName(e.target.value)}
                    placeholder="e.g. Main Apartment"
                    className="w-full px-4 py-3.5 glass-card rounded-xl border border-border/50 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5">Property Name (optional)</p>
                  <input
                    value={propertyName}
                    onChange={(e) => setPropertyName(e.target.value)}
                    placeholder="e.g. Karen Estate, Block C"
                    className="w-full px-4 py-3.5 glass-card rounded-xl border border-border/50 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm"
                  />
                </div>
                <Button
                  onClick={() => setAddStep("confirm")}
                  disabled={!manualDeviceId.trim()}
                  className="w-full gradient-cyan text-[hsl(var(--navy))] font-bold h-12 rounded-xl disabled:opacity-40"
                >
                  Look Up Meter
                </Button>
              </div>
            )}

            {addStep === "confirm" && (
              <div className="space-y-4">
                <div className="glass-card rounded-2xl p-5 border border-primary/20 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">Tuya meter found</p>
                  <p className="text-lg font-bold text-foreground mt-1">{meterName || "Smart Meter"}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{manualDeviceId || "eb5f6f5cbf5f7c6f39pjoa"}</p>
                  {propertyName && <p className="text-xs text-muted-foreground mt-1">{propertyName}</p>}
                </div>
                <div className="glass-card rounded-xl p-3 border border-accent/20">
                  <p className="text-xs text-muted-foreground text-center">
                    This meter will be linked to your PowerFlow account. Your energy balance is stored in the cloud and travels with you.
                  </p>
                </div>
                <Button
                  onClick={handleAddMeter}
                  disabled={linkLoading}
                  className="w-full gradient-cyan text-[hsl(var(--navy))] font-bold h-12 rounded-xl"
                >
                  {linkLoading ? (
                    <span className="flex items-center gap-2"><RefreshCw className="w-4 h-4 animate-spin" /> Linking…</span>
                  ) : (
                    <span className="flex items-center gap-2"><Link2 className="w-4 h-4" /> Link Meter</span>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Reconnect Modal ── */}
      {modal === "reconnect" && selectedMeter && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full glass-card rounded-t-3xl p-6 border-t border-accent/20 animate-slide-up space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Reconnect Meter</h2>
                <p className="text-xs text-muted-foreground">Moving to a new property?</p>
              </div>
              <button onClick={closeModal} className="p-2 rounded-xl hover:bg-muted/30">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="glass rounded-xl p-4 border border-destructive/20 space-y-2">
              <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                <Link2Off className="w-3.5 h-3.5" /> Current meter will be unlinked
              </p>
              <p className="text-xs text-muted-foreground">{selectedMeter.name} — {selectedMeter.property_name}</p>
            </div>

            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">New Tuya Device ID *</p>
              <input
                value={manualDeviceId}
                onChange={(e) => setManualDeviceId(e.target.value)}
                placeholder="Enter new meter Device ID"
                className="w-full px-4 py-3.5 glass-card rounded-xl border border-border/50 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 font-mono text-sm"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">New Property Name</p>
              <input
                value={propertyName}
                onChange={(e) => setPropertyName(e.target.value)}
                placeholder="e.g. Kilimani Apt, Unit 4A"
                className="w-full px-4 py-3.5 glass-card rounded-xl border border-border/50 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 text-sm"
              />
            </div>

            <div className="glass-card rounded-xl p-3 border border-primary/15">
              <p className="text-xs text-muted-foreground text-center">
                💡 Your <span className="text-primary font-semibold">kWh balance stays in your wallet</span> — no energy is lost when you move.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={closeModal} className="flex-1 h-11 rounded-xl border-border/40">
                Cancel
              </Button>
              <Button
                disabled={!manualDeviceId.trim()}
                className="flex-1 h-11 gradient-cyan text-[hsl(var(--navy))] font-bold rounded-xl disabled:opacity-40"
                onClick={closeModal}
              >
                <RefreshCw className="w-4 h-4 mr-1.5" /> Reconnect
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {modal === "detail" && selectedMeter && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full glass-card rounded-t-3xl p-6 border-t border-primary/15 animate-slide-up space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">{selectedMeter.name}</h2>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building2 className="w-3 h-3" /> {selectedMeter.property_name}
                </p>
              </div>
              <button onClick={closeModal} className="p-2 rounded-xl hover:bg-muted/30">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Circular balance gauge */}
            <div className="flex justify-center py-2">
              {(() => {
                const pct = percentFull(selectedMeter.balance_kwh, selectedMeter.max_kwh);
                const r = 44;
                const circ = 2 * Math.PI * r;
                const offset = circ - (circ * pct) / 100;
                const isLow = pct < 20;
                return (
                  <div className="relative flex flex-col items-center">
                    <svg width="110" height="110" viewBox="0 0 110 110">
                      <circle cx="55" cy="55" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                      <circle
                        cx="55" cy="55" r={r} fill="none"
                        stroke={isLow ? "hsl(var(--destructive))" : "hsl(var(--primary))"}
                        strokeWidth="8" strokeLinecap="round"
                        strokeDasharray={circ} strokeDashoffset={offset}
                        transform="rotate(-90 55 55)"
                        style={{ transition: "stroke-dashoffset 1s ease", filter: `drop-shadow(0 0 6px hsl(var(--primary)))` }}
                      />
                      <text x="55" y="51" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="16" fontWeight="700">{pct}%</text>
                      <text x="55" y="65" textAnchor="middle" fill="hsl(var(--muted-foreground))" fontSize="9">
                        {selectedMeter.balance_kwh} kWh
                      </text>
                    </svg>
                    {isLow && <p className="text-[10px] text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Low balance</p>}
                  </div>
                );
              })()}
            </div>

            {[
              ["Device ID", selectedMeter.tuya_device_id],
              ["Status", selectedMeter.status === "online" ? "Online" : "Offline"],
              ["Consumption Rate", `${selectedMeter.rate_kwh_hr} kWh/hr`],
              ["Last Synced", selectedMeter.lastSync],
              ["SMS Fallback", selectedMeter.sms_fallback ? "Active" : "Inactive"],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between py-2 border-b border-border/20">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className={`text-sm font-medium font-mono ${
                  val === "Online" || val === "Active" ? "text-success" :
                  val === "Offline" || val === "Inactive" ? "text-destructive" : "text-foreground"
                }`}>{val}</span>
              </div>
            ))}

            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => startReconnect(selectedMeter)}
                className="flex-1 h-11 rounded-xl border-accent/40 text-accent hover:bg-accent/10"
              >
                <RefreshCw className="w-4 h-4 mr-1.5" /> Move Out
              </Button>
              <Button
                className="flex-1 h-11 gradient-cyan text-[hsl(var(--navy))] font-bold rounded-xl"
                onClick={() => { closeModal(); navigate("/recharge"); }}
              >
                <Zap className="w-4 h-4 mr-1.5" /> Recharge
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
