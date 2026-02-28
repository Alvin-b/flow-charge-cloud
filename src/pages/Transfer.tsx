import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, CheckCircle, XCircle, ArrowUpRight, ArrowDownLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { transferApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const KES_PER_KWH = 20.45;

type Step = "input" | "pin" | "animating" | "success" | "failed";
type HistoryTab = "send" | "history";

interface TransferResult {
  transaction_id: string;
  amount_kwh: number;
  amount_kes: number;
  recipient_phone: string;
  recipient_name: string | null;
  new_balance: number;
}

interface TransferTx {
  id: string;
  type: string;
  amount_kwh: number;
  amount_kes: number;
  recipient_phone: string;
  created_at: string;
  metadata: { recipient_name?: string; sender_name?: string };
  user_id: string;
}

const Transfer = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tab, setTab] = useState<HistoryTab>("send");
  const [step, setStep] = useState<Step>("input");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [sendLoading, setSendLoading] = useState(false);
  const [transferResult, setTransferResult] = useState<TransferResult | null>(null);

  // Daily usage from backend
  const [dailyUsage, setDailyUsage] = useState({ used_today: 0, daily_limit: 50, remaining: 50 });
  const [history, setHistory] = useState<TransferTx[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setCurrentUserId(data.user.id);
    });
    transferApi.getDailyUsage().then(setDailyUsage).catch(console.error);
  }, []);

  useEffect(() => {
    if (tab === "history" && history.length === 0) {
      setHistoryLoading(true);
      transferApi.getHistory()
        .then((res) => setHistory(res.transfers || []))
        .catch(console.error)
        .finally(() => setHistoryLoading(false));
    }
  }, [tab]);

  const kesEquiv = amount ? (parseFloat(amount) * KES_PER_KWH).toFixed(0) : "0";

  const handleSend = () => {
    if (!recipient || !amount) return;
    setStep("pin");
  };

  const handlePin = (digit: string) => {
    if (digit === "⌫") { setPin(pin.slice(0, -1)); return; }
    const next = pin + digit;
    setPin(next);
    if (next.length === 4) {
      setTimeout(() => executeTransfer(), 300);
    }
  };

  const executeTransfer = async () => {
    setStep("animating");
    setSendLoading(true);
    try {
      const result = await transferApi.send(recipient, parseFloat(amount));
      setTransferResult(result);
      // Refresh daily usage
      transferApi.getDailyUsage().then(setDailyUsage).catch(console.error);
      setTimeout(() => setStep("success"), 1500);
    } catch (err: any) {
      toast({ title: "Transfer failed", description: err.message, variant: "destructive" });
      setStep("failed");
    } finally {
      setSendLoading(false);
    }
  };

  const resetForm = () => {
    setStep("input");
    setPin("");
    setAmount("");
    setRecipient("");
    setTransferResult(null);
    // Reload history
    setHistory([]);
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();
    const time = d.toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit", hour12: true });
    if (isToday) return `Today, ${time}`;
    if (isYesterday) return `Yesterday, ${time}`;
    return d.toLocaleDateString("en-KE", { month: "short", day: "numeric" }) + `, ${time}`;
  };

  const maskPhone = (phone: string) => {
    if (!phone || phone.length < 6) return phone;
    return phone.slice(0, 4) + " *** " + phone.slice(-3);
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

  if (step === "success" && transferResult) {
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
            ["Recipient", transferResult.recipient_name || maskPhone(transferResult.recipient_phone)],
            ["Amount Sent", `${transferResult.amount_kwh} kWh`],
            ["KES Equivalent", `KES ${transferResult.amount_kes.toLocaleString()}`],
            ["New Balance", `${transferResult.new_balance.toFixed(1)} kWh`],
            ["Status", "Confirmed"],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className={`text-sm font-medium ${label === "Status" ? "text-success" : "text-foreground"}`}>{val}</span>
            </div>
          ))}
        </div>
        <Button onClick={resetForm}
          className="w-full max-w-sm h-12 gradient-cyan text-[hsl(var(--navy))] font-bold rounded-xl">
          Done
        </Button>
      </div>
    );
  }

  if (step === "failed") {
    return (
      <div className="min-h-screen gradient-navy flex flex-col items-center justify-center px-6 gap-6">
        <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center animate-scale-in">
          <XCircle className="w-12 h-12 text-destructive" />
        </div>
        <div className="text-center animate-fade-in-up">
          <h2 className="text-2xl font-bold text-foreground mb-1">Transfer Failed</h2>
          <p className="text-muted-foreground text-sm">Something went wrong. Please try again.</p>
        </div>
        <Button onClick={resetForm}
          className="w-full max-w-sm h-12 gradient-cyan text-[hsl(var(--navy))] font-bold rounded-xl">
          Try Again
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
              <p className="text-xs font-medium text-foreground">{dailyUsage.used_today.toFixed(1)} / {dailyUsage.daily_limit} kWh used</p>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full gradient-cyan rounded-full" style={{ width: `${(dailyUsage.used_today / dailyUsage.daily_limit) * 100}%` }} />
            </div>
            <p className="text-xs text-success mt-2 font-medium">{dailyUsage.remaining.toFixed(1)} kWh remaining today</p>
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
          {historyLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : history.length === 0 ? (
            <div className="glass-card rounded-2xl p-8 text-center border border-border/20">
              <ArrowUpRight className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-foreground font-semibold">No transfers yet</p>
              <p className="text-xs text-muted-foreground mt-1">Your transfer history will appear here</p>
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden border border-border/20">
              {history.map((tx, i) => {
                const isOut = tx.type === "transfer_out";
                const label = isOut
                  ? `To ${tx.metadata?.recipient_name || maskPhone(tx.recipient_phone)}`
                  : `From ${tx.metadata?.sender_name || maskPhone(tx.recipient_phone)}`;
                return (
                  <div key={tx.id} className={`flex items-center gap-3 p-4 ${i < history.length - 1 ? "border-b border-border/30" : ""}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isOut ? "bg-destructive/15" : "bg-success/15"}`}>
                      {isOut ? <ArrowUpRight className="w-5 h-5 text-destructive" /> : <ArrowDownLeft className="w-5 h-5 text-success" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{label}</p>
                      <p className="text-xs text-muted-foreground">{formatTime(tx.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${isOut ? "text-destructive" : "text-success"}`}>
                        {isOut ? "-" : "+"}{tx.amount_kwh} kWh
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <BottomNav active="/transfer" />
    </div>
  );
};

export default Transfer;
