import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, CheckCircle, XCircle, ChevronRight, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

const KES_PER_KWH = 20.45;
const DAILY_LIMIT = 50; // kWh

type Step = "input" | "pin" | "animating" | "success" | "failed";
type HistoryTab = "send" | "history";

const transferHistory = [
  { id: 1, type: "out", label: "To Grace Wanjiku", amount: "-10 kWh", time: "Today, 10:23 AM", phone: "0721 *** 456" },
  { id: 2, type: "in", label: "From John Mwangi", amount: "+5 kWh", time: "Yesterday, 3:12 PM", phone: "0734 *** 123" },
  { id: 3, type: "out", label: "To Mary Achieng", amount: "-8 kWh", time: "Dec 15, 9:05 AM", phone: "0745 *** 789" },
];

const Transfer = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<HistoryTab>("send");
  const [step, setStep] = useState<Step>("input");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const used = 18; // kWh transferred today

  const kesEquiv = amount ? (parseFloat(amount) * KES_PER_KWH).toFixed(0) : "0";
  const remaining = DAILY_LIMIT - used;

  const handleSend = () => {
    if (!recipient || !amount) return;
    setStep("pin");
  };

  const handlePin = (digit: string) => {
    if (digit === "⌫") { setPin(pin.slice(0, -1)); return; }
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => {
        setStep("animating");
        setTimeout(() => setStep("success"), 2000);
      }, 300);
    }
  };

  if (step === "animating") {
    return (
      <div className="min-h-screen gradient-navy flex flex-col items-center justify-center gap-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
            <span className="text-2xl">👤</span>
          </div>
          <div className="flex gap-1">
            {[0,1,2,3].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i*0.1}s` }} />
            ))}
          </div>
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center animate-pulse" style={{ animationDelay: "0.3s" }}>
            <span className="text-2xl">👤</span>
          </div>
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-foreground">Transferring {amount} kWh…</p>
          <p className="text-muted-foreground text-sm mt-1">Sending to {recipient}</p>
        </div>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen gradient-navy flex flex-col items-center justify-center px-6 gap-6">
        <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center animate-scale-in">
          <CheckCircle className="w-12 h-12 text-success" />
        </div>
        <div className="text-center animate-fade-in-up">
          <h2 className="text-2xl font-bold text-foreground mb-1">Transfer Complete!</h2>
          <p className="text-muted-foreground text-sm">Energy sent successfully</p>
        </div>
        <div className="w-full max-w-sm glass-card rounded-2xl p-5 space-y-3 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          {[
            ["Recipient", recipient],
            ["Amount Sent", `${amount} kWh`],
            ["KES Equivalent", `KES ${kesEquiv}`],
            ["New Balance", "77.4 kWh"],
            ["Status", "Confirmed"],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className={`text-sm font-medium ${label === "Status" ? "text-success" : "text-foreground"}`}>{val}</span>
            </div>
          ))}
        </div>
        <Button onClick={() => { setStep("input"); setPin(""); setAmount(""); setRecipient(""); }}
          className="w-full max-w-sm h-12 gradient-cyan text-[hsl(var(--navy))] font-bold rounded-xl">
          Done
        </Button>
      </div>
    );
  }

  if (step === "pin") {
    const keys = ["1","2","3","4","5","6","7","8","9","","0","⌫"];
    return (
      <div className="min-h-screen gradient-navy flex flex-col items-center justify-center px-6">
        <div className="text-center mb-10 animate-fade-in-up">
          <h2 className="text-2xl font-bold text-foreground mb-2">Confirm Transfer</h2>
          <p className="text-muted-foreground text-sm">Enter your 4-digit PIN to send <span className="text-primary font-bold">{amount} kWh</span></p>
        </div>
        <div className="flex gap-4 mb-8">
          {[0,1,2,3].map(i => (
            <div key={i} className={`w-4 h-4 rounded-full transition-all duration-200 ${i < pin.length ? "bg-primary glow-cyan" : "bg-border"}`} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4 w-72">
          {keys.map((key, i) => (
            <button key={i} onClick={() => key !== "" && handlePin(key)}
              className={`h-16 rounded-2xl font-semibold text-xl transition-all active:scale-95 ${
                key === "" ? "invisible" :
                "glass-card text-foreground hover:bg-primary/10 border border-border/30"
              }`}
            >
              {key === "⌫" ? "⌫" : key}
            </button>
          ))}
        </div>
        <button onClick={() => { setStep("input"); setPin(""); }} className="mt-8 text-sm text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-navy pb-24">
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      <div className="px-5 pt-14 pb-4 flex items-center gap-3 animate-fade-in">
        <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-muted/30 transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Energy Transfer</h1>
      </div>

      {/* Tab */}
      <div className="px-5 mb-5">
        <div className="flex glass-card rounded-2xl p-1 gap-1 border border-border/20">
          {(["send", "history"] as HistoryTab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-all ${tab === t ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}>
              {t === "send" ? "Send Energy" : "History"}
            </button>
          ))}
        </div>
      </div>

      {tab === "send" ? (
        <div className="px-5 space-y-4">
          {/* Daily limit */}
          <div className="glass-card rounded-2xl p-4 border border-border/20 animate-fade-in-up">
            <div className="flex justify-between mb-2">
              <p className="text-xs text-muted-foreground">Daily transfer limit</p>
              <p className="text-xs font-medium text-foreground">{used} / {DAILY_LIMIT} kWh used</p>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full gradient-cyan rounded-full" style={{ width: `${(used/DAILY_LIMIT)*100}%` }} />
            </div>
            <p className="text-xs text-success mt-2 font-medium">{remaining} kWh remaining today</p>
          </div>

          {/* Recipient */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <p className="text-sm font-medium text-muted-foreground mb-2">Recipient phone number</p>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="tel" placeholder="+254 7XX XXX XXX" value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full pl-11 pr-4 py-4 glass-card rounded-xl border border-border/50 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 font-medium transition-colors" />
            </div>
          </div>

          {/* Amount */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <p className="text-sm font-medium text-muted-foreground mb-2">Amount (kWh)</p>
            <input type="number" placeholder="0.0" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-4 glass-card rounded-xl border border-border/50 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 text-xl font-bold transition-colors" />
            {amount && (
              <p className="text-xs text-muted-foreground mt-2 text-right">≈ KES {parseFloat(kesEquiv).toLocaleString()}</p>
            )}
          </div>

          <Button onClick={handleSend} disabled={!recipient || !amount || parseFloat(amount) <= 0}
            className="w-full h-14 gradient-cyan text-[hsl(var(--navy))] font-bold text-base rounded-xl glow-cyan hover:opacity-90 disabled:opacity-40 animate-fade-in-up"
            style={{ animationDelay: "0.2s" }}>
            Send Energy
          </Button>
        </div>
      ) : (
        <div className="px-5 space-y-3 animate-fade-in-up">
          <div className="glass-card rounded-2xl overflow-hidden border border-border/20">
            {transferHistory.map((tx, i) => (
              <div key={tx.id} className={`flex items-center gap-3 p-4 ${i < transferHistory.length - 1 ? "border-b border-border/30" : ""}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === "out" ? "bg-destructive/15" : "bg-success/15"}`}>
                  {tx.type === "out" ? <ArrowUpRight className="w-5 h-5 text-destructive" /> : <ArrowDownLeft className="w-5 h-5 text-success" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{tx.label}</p>
                  <p className="text-xs text-muted-foreground">{tx.time}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${tx.type === "out" ? "text-destructive" : "text-success"}`}>{tx.amount}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <BottomNav active="/transfer" />
    </div>
  );
};

export default Transfer;
