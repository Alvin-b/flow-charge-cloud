import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { mpesaApi, consumptionApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Sounds } from "@/lib/sounds";

const PRESETS = [50, 100, 200, 500, 1000];
const KES_PER_KWH = 24;

type PayState = "idle" | "pending" | "success" | "failed";

const Recharge = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [payState, setPayState] = useState<PayState>("idle");
  const [walletBalance, setWalletBalance] = useState(0);
  const [txId, setTxId] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [dailyAvg, setDailyAvg] = useState(0);

  useEffect(() => {
    if (profile?.phone) {
      setPhone(profile.phone);
    }
    supabase.from("wallets").select("balance_kwh").maybeSingle().then(({ data }) => {
      setWalletBalance(data?.balance_kwh ?? 0);
    });
    consumptionApi.getSummary().then((s) => setDailyAvg(s?.daily_avg ?? 0)).catch(() => {});
  }, [profile]);

  const kwhPreview = amount ? (parseFloat(amount) / KES_PER_KWH).toFixed(2) : "0.00";
  const daysLeft = dailyAvg > 0 ? Math.round(walletBalance / dailyAvg) : 0;

  // Validate Kenyan phone number format
  const isValidKenyanPhone = (p: string) => {
    const cleaned = p.replace(/[\s\-+]/g, "");
    // Accept 07XXXXXXXX, 01XXXXXXXX, 2547XXXXXXXX, 2541XXXXXXXX
    return /^(0[17]\d{8}|254[17]\d{8})$/.test(cleaned);
  };

  const payStateRef = useRef<PayState>("idle");
  const cleanupRef = useRef<(() => void) | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const updatePayState = useCallback((state: PayState) => {
    payStateRef.current = state;
    setPayState(state);
  }, []);

  // Helper: fetch with timeout
  const fetchWithTimeout = async (fn: () => Promise<any>, timeoutMs = 15000) => {
    return Promise.race([
      fn(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout")), timeoutMs)),
    ]);
  };

  const handlePay = async () => {
    if (!amount || parseFloat(amount) < 10) {
      toast({ title: "Invalid amount", description: "Minimum amount is KES 10", variant: "destructive" });
      return;
    }
    if (!phone.trim()) {
      toast({ title: "Phone required", description: "Enter your M-Pesa phone number", variant: "destructive" });
      return;
    }
    if (!isValidKenyanPhone(phone)) {
      toast({ title: "Invalid phone", description: "Enter a valid Safaricom number (e.g. 0712345678)", variant: "destructive" });
      return;
    }

    Sounds.charge();
    updatePayState("pending");
    
    try {
      const result = await fetchWithTimeout(
        () => mpesaApi.initiateSTKPush(phone.trim(), parseFloat(amount)),
        20000
      );
      setTxId(result.transaction_id);
      const checkoutId = result.checkout_request_id;

      // Hard overall timeout (90 seconds)
      const hardTimeout = setTimeout(() => {
        if (payStateRef.current === "pending") {
          channel && supabase.removeChannel(channel);
          pollTimer && clearInterval(pollTimer);
          Sounds.error();
          updatePayState("failed");
          toast({ title: "Payment timeout", description: "No response received. Check your M-Pesa messages or try again.", variant: "destructive" });
        }
      }, 90000);

      // Listen for realtime transaction update
      const channel = supabase
        .channel(`recharge-${result.transaction_id}`)
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "transactions",
          filter: `id=eq.${result.transaction_id}`,
        }, async (payload) => {
          const status = payload.new.status;
          if (status === "completed") {
            cleanup();
            Sounds.success();
            updatePayState("success");
            setReceiptNumber(payload.new.mpesa_receipt_number || "");
            const { data } = await supabase.from("wallets").select("balance_kwh").maybeSingle();
            if (data) setWalletBalance(data.balance_kwh);
          } else if (status === "failed" || status === "cancelled") {
            cleanup();
            Sounds.error();
            updatePayState("failed");
            toast({ title: "Payment not completed", description: payload.new.error_message || "Transaction was not completed", variant: "destructive" });
          }
        })
        .subscribe();

      // Fallback polling via STK query
      let attempts = 0;
      const maxAttempts = 6;
      const pollTimer = setInterval(async () => {
        if (payStateRef.current !== "pending") {
          clearInterval(pollTimer);
          return;
        }
        attempts++;
        try {
          const queryResult = await fetchWithTimeout(
            () => mpesaApi.querySTKStatus(checkoutId),
            12000
          );
          if (payStateRef.current !== "pending") return;
          
          if (queryResult.status === "completed") {
            cleanup();
            Sounds.success();
            updatePayState("success");
            const { data } = await supabase.from("wallets").select("balance_kwh").maybeSingle();
            if (data) setWalletBalance(data.balance_kwh);
          } else if (queryResult.status === "failed" || queryResult.status === "cancelled" || queryResult.status === "timeout") {
            cleanup();
            Sounds.error();
            updatePayState("failed");
            toast({ title: "Payment not completed", description: queryResult.result_desc, variant: "destructive" });
          }
        } catch (err) {
          console.warn("STK query poll error:", err);
        }
        if (attempts >= maxAttempts && payStateRef.current === "pending") {
          cleanup();
          Sounds.error();
          updatePayState("failed");
          toast({ title: "Payment timeout", description: "Please check your M-Pesa messages or try again.", variant: "destructive" });
        }
      }, 10000);

      // Start polling after initial delay
      const initialDelay = setTimeout(() => {}, 0); // polling starts immediately via setInterval

      const cleanup = () => {
        clearTimeout(hardTimeout);
        clearInterval(pollTimer);
        supabase.removeChannel(channel);
      };
      cleanupRef.current = cleanup;

    } catch (error: any) {
      console.error("Payment error:", error);
      updatePayState("failed");
      toast({ title: "Payment failed", description: error.message || "Unable to process payment", variant: "destructive" });
    }
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
        <div className="w-full max-w-sm glass-card rounded-2xl p-5 space-y-3 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <div className="text-center pb-3 border-b border-border/30">
            <p className="text-3xl font-bold text-success">+{kwhPreview} kWh</p>
            <p className="text-muted-foreground text-sm mt-1">Added to your wallet</p>
          </div>
          {[
            ["Amount Paid", `KES ${parseFloat(amount).toLocaleString()}`],
            ["Units Added", `${kwhPreview} kWh`],
            ["Transaction ID", txId],
            ["Status", "Confirmed"],
          ].map(([label, val]) => (
            <div key={label} className="flex justify-between">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className={`text-sm font-medium ${label === "Status" ? "text-success" : "text-foreground"}`}>{val}</span>
            </div>
          ))}
        </div>
        <Button onClick={() => { setPayState("idle"); setAmount(""); navigate("/"); }} className="w-full max-w-sm h-13 gradient-cyan text-[hsl(var(--navy))] font-bold rounded-xl">
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
        <Button onClick={() => setPayState("idle")} className="gradient-cyan text-[hsl(var(--navy))] font-bold rounded-xl px-8 h-12">Try Again</Button>
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
        <h1 className="text-xl font-bold text-foreground">Recharge Wallet</h1>
      </div>

      <div className="px-5 space-y-5">
        <div className="glass-card rounded-2xl p-4 flex items-center justify-between animate-fade-in-up">
          <div>
            <p className="text-xs text-muted-foreground">Current Balance</p>
            <p className="text-2xl font-bold text-primary">{walletBalance} kWh</p>
            <p className="text-xs text-muted-foreground">≈ KES {(walletBalance * KES_PER_KWH).toFixed(0)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Est. days</p>
            <p className="text-2xl font-bold text-success">{daysLeft}</p>
          </div>
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          <p className="text-sm font-medium text-muted-foreground mb-3">Quick amounts (KES)</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button key={p} onClick={() => { Sounds.tap(); setAmount(p.toString()); }} className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all active:scale-95 ${amount === p.toString() ? "bg-primary/20 border-primary text-primary glow-cyan" : "glass-card border-border/30 text-foreground"}`}>
                {p.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          <p className="text-sm font-medium text-muted-foreground mb-2">Custom amount</p>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">KES</span>
            <input type="number" placeholder="Enter amount" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full pl-14 pr-4 py-4 glass-card rounded-xl border border-border/50 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 text-lg font-bold transition-colors" />
          </div>
          {amount && (
            <div className="mt-3 glass-card rounded-xl p-3 flex items-center justify-between border border-primary/20 animate-scale-in">
              <span className="text-sm text-muted-foreground">You'll receive</span>
              <span className="text-lg font-bold text-primary">{kwhPreview} kWh</span>
            </div>
          )}
        </div>

        <div className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <p className="text-sm font-medium text-muted-foreground mb-2">M-Pesa number</p>
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full pl-11 pr-4 py-4 glass-card rounded-xl border border-border/50 bg-transparent text-foreground focus:outline-none focus:border-primary/50 font-medium transition-colors" />
          </div>
        </div>

        <div className="glass-card rounded-xl p-3 border border-border/20 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
          <p className="text-xs text-muted-foreground text-center">Current rate: <span className="text-foreground font-medium">KES {KES_PER_KWH}/kWh</span> · No transaction fees</p>
        </div>

        <Button onClick={handlePay} disabled={!amount || parseFloat(amount) < 10 || !phone.trim()} className="w-full h-14 gradient-cyan text-[hsl(var(--navy))] font-bold text-base rounded-xl glow-cyan hover:opacity-90 transition-all disabled:opacity-40 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          Confirm & Pay via M-Pesa
        </Button>
      </div>

      <BottomNav active="/recharge" />
    </div>
  );
};

export default Recharge;
