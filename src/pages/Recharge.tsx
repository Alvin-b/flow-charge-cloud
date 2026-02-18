import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";

const PRESETS = [50, 100, 200, 500, 1000];
const KES_PER_KWH = 20.45;

type PayState = "idle" | "pending" | "success" | "failed";

const Recharge = () => {
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("0712 345 678");
  const [payState, setPayState] = useState<PayState>("idle");
  const [txId] = useState(`PF${Date.now().toString().slice(-8)}`);

  const kwhPreview = amount ? (parseFloat(amount) / KES_PER_KWH).toFixed(2) : "0.00";

  const handlePay = () => {
    if (!amount || parseFloat(amount) < 10) return;
    setPayState("pending");
    setTimeout(() => setPayState("success"), 3500);
  };

  if (payState === "pending") {
    return (
      <div className="min-h-screen gradient-navy flex flex-col items-center justify-center px-6 gap-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full border-4 border-primary/30 flex items-center justify-center animate-pulse-ring pulse-cyan">
            <Phone className="w-10 h-10 text-primary" />
          </div>
          <div className="absolute -inset-4 rounded-full border-2 border-primary/20 animate-spin-slow" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Check your phone</h2>
          <p className="text-muted-foreground">M-Pesa STK push sent to</p>
          <p className="text-primary font-semibold mt-1">{phone}</p>
          <p className="text-sm text-muted-foreground mt-4">Enter your M-Pesa PIN to complete payment</p>
        </div>
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (payState === "success") {
    return (
      <div className="min-h-screen gradient-navy flex flex-col items-center justify-center px-6 gap-6">
        <div className="w-20 h-20 rounded-full bg-success/20 flex items-center justify-center animate-scale-in">
          <CheckCircle className="w-12 h-12 text-success" />
        </div>
        <div className="text-center animate-fade-in-up">
          <h2 className="text-2xl font-bold text-foreground mb-1">Payment Successful!</h2>
          <p className="text-muted-foreground">Your wallet has been recharged</p>
        </div>

        {/* Receipt card */}
        <div className="w-full max-w-sm glass-card rounded-2xl p-5 space-y-3 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="text-center pb-3 border-b border-border/30">
            <p className="text-3xl font-bold text-success">+{kwhPreview} kWh</p>
            <p className="text-muted-foreground text-sm mt-1">Added to your wallet</p>
          </div>
          {[
            ["Amount Paid", `KES ${parseFloat(amount).toLocaleString()}`],
            ["Units Added", `${kwhPreview} kWh`],
            ["New Balance", "111.9 kWh"],
            ["Transaction ID", txId],
            ["Status", "Confirmed"],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className={`text-sm font-medium ${label === "Status" ? "text-success" : "text-foreground"}`}>{val}</span>
            </div>
          ))}
        </div>

        <Button
          onClick={() => { setPayState("idle"); setAmount(""); }}
          className="w-full max-w-sm h-13 gradient-cyan text-[hsl(var(--navy))] font-bold rounded-xl"
        >
          Done
        </Button>
      </div>
    );
  }

  if (payState === "failed") {
    return (
      <div className="min-h-screen gradient-navy flex flex-col items-center justify-center px-6 gap-6">
        <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center animate-scale-in">
          <XCircle className="w-12 h-12 text-destructive" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-1">Payment Failed</h2>
          <p className="text-muted-foreground text-sm">The STK push was cancelled or timed out.</p>
        </div>
        <Button onClick={() => setPayState("idle")} className="gradient-cyan text-[hsl(var(--navy))] font-bold rounded-xl px-8 h-12">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-navy pb-24">
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-primary/5 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center gap-3 animate-fade-in">
        <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-muted/30 transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">Recharge Wallet</h1>
      </div>

      <div className="px-5 space-y-5">
        {/* Current balance */}
        <div className="glass-card rounded-2xl p-4 flex items-center justify-between animate-fade-in-up">
          <div>
            <p className="text-xs text-muted-foreground">Current Balance</p>
            <p className="text-2xl font-bold text-primary">87.4 kWh</p>
            <p className="text-xs text-muted-foreground">≈ KES 1,785</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Est. days</p>
            <p className="text-2xl font-bold text-success">12</p>
          </div>
        </div>

        {/* Preset amounts */}
        <div className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <p className="text-sm font-medium text-muted-foreground mb-3">Quick amounts (KES)</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(p.toString())}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${
                  amount === p.toString()
                    ? "bg-primary/20 border-primary text-primary glow-cyan"
                    : "glass-card border-border/30 text-foreground"
                }`}
              >
                {p.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {/* Custom amount */}
        <div className="animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          <p className="text-sm font-medium text-muted-foreground mb-2">Custom amount</p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">KES</span>
            <input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-14 pr-4 py-4 glass-card rounded-xl border border-border/50 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 text-lg font-bold transition-colors"
            />
          </div>

          {/* kWh preview */}
          {amount && (
            <div className="mt-3 glass-card rounded-xl p-3 flex items-center justify-between border border-primary/20 animate-scale-in">
              <span className="text-sm text-muted-foreground">You'll receive</span>
              <span className="text-lg font-bold text-primary">{kwhPreview} kWh</span>
            </div>
          )}
        </div>

        {/* Phone number */}
        <div className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <p className="text-sm font-medium text-muted-foreground mb-2">M-Pesa number</p>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full pl-11 pr-4 py-4 glass-card rounded-xl border border-border/50 bg-transparent text-foreground focus:outline-none focus:border-primary/50 font-medium transition-colors"
            />
          </div>
        </div>

        {/* Rate info */}
        <div className="glass-card rounded-xl p-3 border border-border/20 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
          <p className="text-xs text-muted-foreground text-center">Current rate: <span className="text-foreground font-medium">KES {KES_PER_KWH}/kWh</span> · No transaction fees</p>
        </div>

        <Button
          onClick={handlePay}
          disabled={!amount || parseFloat(amount) < 10}
          className="w-full h-14 gradient-cyan text-[hsl(var(--navy))] font-bold text-base rounded-xl glow-cyan hover:opacity-90 transition-all disabled:opacity-40 animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          Confirm & Pay via M-Pesa
        </Button>
      </div>

      <BottomNav active="/recharge" />
    </div>
  );
};

export default Recharge;
