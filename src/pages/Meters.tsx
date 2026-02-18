import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Zap, Wifi, WifiOff, QrCode, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

const mockMeters = [
  {
    id: "KE-00482",
    name: "Nairobi Apartment",
    status: "Online",
    active: true,
    rate: "0.45 kWh/hr",
    balance: "87.4 kWh",
    lastSync: "2 min ago",
    sms: true,
  },
  {
    id: "KE-01139",
    name: "Westlands Office",
    status: "Offline",
    active: false,
    rate: "0.00 kWh/hr",
    balance: "12.1 kWh",
    lastSync: "3h ago",
    sms: false,
  },
];

type Modal = null | "add" | "detail";

const Meters = () => {
  const navigate = useNavigate();
  const [modal, setModal] = useState<Modal>(null);
  const [selectedMeter, setSelectedMeter] = useState<typeof mockMeters[0] | null>(null);
  const [manualId, setManualId] = useState("");
  const [addStep, setAddStep] = useState<"scan" | "manual" | "confirm">("scan");

  const handleAddMeter = () => {
    if (addStep === "scan" || addStep === "manual") {
      setAddStep("confirm");
    } else {
      setModal(null);
      setAddStep("scan");
      setManualId("");
    }
  };

  return (
    <div className="min-h-screen gradient-navy pb-24">
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="px-5 pt-14 pb-4 flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-muted/30 transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">My Meters</h1>
        </div>
        <button
          onClick={() => { setModal("add"); setAddStep("scan"); }}
          className="flex items-center gap-2 px-3 py-2 gradient-cyan rounded-xl text-[hsl(var(--navy))] text-sm font-bold glow-cyan"
        >
          <Plus className="w-4 h-4" />
          Add Meter
        </button>
      </div>

      <div className="px-5 space-y-4">
        {mockMeters.map((meter, i) => (
          <div
            key={meter.id}
            className="glass-card rounded-2xl p-4 border border-border/20 cursor-pointer hover:border-primary/30 transition-all animate-fade-in-up"
            style={{ animationDelay: `${i * 0.1}s` }}
            onClick={() => { setSelectedMeter(meter); setModal("detail"); }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${meter.active ? "bg-primary/15" : "bg-muted/30"}`}>
                  <Zap className={`w-5.5 h-5.5 ${meter.active ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{meter.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{meter.id}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium ${
                  meter.status === "Online" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
                }`}>
                  {meter.status === "Online" ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
                  {meter.status}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Balance", val: meter.balance, color: meter.active ? "text-primary" : "text-foreground" },
                { label: "Consumption", val: meter.rate, color: "text-foreground" },
                { label: "Last sync", val: meter.lastSync, color: "text-muted-foreground" },
              ].map(({ label, val, color }) => (
                <div key={label} className="glass rounded-lg p-2 border border-white/5">
                  <p className="text-[9px] text-muted-foreground uppercase mb-1">{label}</p>
                  <p className={`text-xs font-semibold ${color}`}>{val}</p>
                </div>
              ))}
            </div>

            {meter.sms && (
              <div className="mt-3 flex items-center gap-2 bg-accent/10 rounded-lg px-3 py-1.5 border border-accent/20">
                <span className="text-[10px] text-accent font-medium">📡 SMS fallback active</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Meter Modal */}
      {modal === "add" && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative w-full glass-card rounded-t-3xl p-6 border-t border-primary/15 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-foreground">Add New Meter</h2>
              <button onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-muted/30">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {addStep === "scan" && (
              <div className="space-y-4">
                <div className="w-full h-48 rounded-2xl bg-muted/20 border-2 border-dashed border-primary/30 flex flex-col items-center justify-center gap-3">
                  <QrCode className="w-12 h-12 text-primary opacity-60" />
                  <p className="text-sm text-muted-foreground">Point camera at meter QR code</p>
                  <p className="text-xs text-muted-foreground">(Camera access required)</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">or</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <button onClick={() => setAddStep("manual")} className="w-full py-3 text-sm text-primary font-medium hover:bg-primary/10 rounded-xl transition-colors">
                  Enter Meter ID manually
                </button>
                <Button onClick={handleAddMeter} className="w-full gradient-cyan text-[hsl(var(--navy))] font-bold h-12 rounded-xl">Scan QR Code</Button>
              </div>
            )}

            {addStep === "manual" && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Meter ID</p>
                  <input value={manualId} onChange={(e) => setManualId(e.target.value)}
                    placeholder="e.g. KE-00123" className="w-full px-4 py-4 glass-card rounded-xl border border-border/50 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 font-mono text-lg" />
                </div>
                <Button onClick={handleAddMeter} disabled={!manualId} className="w-full gradient-cyan text-[hsl(var(--navy))] font-bold h-12 rounded-xl disabled:opacity-40">
                  Confirm Meter ID
                </Button>
              </div>
            )}

            {addStep === "confirm" && (
              <div className="space-y-4">
                <div className="glass-card rounded-2xl p-5 border border-primary/20 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
                    <Zap className="w-7 h-7 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">Meter found</p>
                  <p className="text-xl font-bold text-foreground mt-1">{manualId || "KE-00823"}</p>
                  <p className="text-xs text-muted-foreground mt-1">Karen Estate, Block C</p>
                </div>
                <div className="glass-card rounded-xl p-3 border border-accent/20">
                  <p className="text-xs text-muted-foreground text-center">A linking request will be sent. You'll be notified once confirmed.</p>
                </div>
                <Button onClick={() => setModal(null)} className="w-full gradient-cyan text-[hsl(var(--navy))] font-bold h-12 rounded-xl">
                  Request Meter Link
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {modal === "detail" && selectedMeter && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative w-full glass-card rounded-t-3xl p-6 border-t border-primary/15 animate-slide-up space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">{selectedMeter.name}</h2>
              <button onClick={() => setModal(null)} className="p-2 rounded-xl hover:bg-muted/30">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            {[
              ["Meter ID", selectedMeter.id],
              ["Status", selectedMeter.status],
              ["Balance", selectedMeter.balance],
              ["Consumption Rate", selectedMeter.rate],
              ["Last Synced", selectedMeter.lastSync],
              ["SMS Fallback", selectedMeter.sms ? "Active" : "Inactive"],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between py-2 border-b border-border/20">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className={`text-sm font-medium ${
                  val === "Online" || val === "Active" ? "text-success" :
                  val === "Offline" || val === "Inactive" ? "text-destructive" : "text-foreground"
                }`}>{val}</span>
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1 h-11 rounded-xl border-destructive/50 text-destructive hover:bg-destructive/10">
                Unlink Meter
              </Button>
              <Button className="flex-1 h-11 gradient-cyan text-[hsl(var(--navy))] font-bold rounded-xl">
                Recharge
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
