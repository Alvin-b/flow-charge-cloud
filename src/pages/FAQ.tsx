import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, Zap, HelpCircle, MessageCircle, Mail as MailIcon } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const faqs = [
  {
    q: "How do I recharge my energy wallet?",
    a: "Go to the Recharge page from the home screen. Enter the amount in KES you'd like to add, confirm your M-Pesa phone number, and tap 'Pay'. You'll receive an M-Pesa STK push on your phone — enter your PIN to complete. Your wallet will be credited automatically at KES 24/kWh.",
  },
  {
    q: "How do I transfer energy to someone?",
    a: "Go to the Transfer page. Ask the recipient for their User ID (found on their Profile page). Paste the User ID, enter the amount in kWh, and confirm with your 4-digit PIN. The transfer is instant.",
  },
  {
    q: "Where do I find my User ID?",
    a: "Open your Profile page — your User ID is displayed under 'Your User ID'. Tap the copy button to copy it and share with anyone who wants to send you energy.",
  },
  {
    q: "How do I connect a meter?",
    a: "Go to the Meters page and tap 'Add Meter'. Enter your meter number manually or scan the QR code on your meter. Once connected, your cloud wallet will power the meter.",
  },
  {
    q: "What happens when my wallet balance reaches zero?",
    a: "Your connected meter will be automatically disconnected (relay turned off) to prevent energy loss. Recharge your wallet and the meter will reconnect automatically.",
  },
  {
    q: "What is the daily transfer limit?",
    a: "You can transfer up to 50 kWh per day to other users. The minimum transfer is 0.5 kWh. Your daily usage resets at midnight.",
  },
  {
    q: "How do I change my PIN?",
    a: "Go to Profile → Security → Change PIN. You'll need to enter your current PIN first, then set a new 4-digit PIN.",
  },
  {
    q: "I forgot my PIN. What do I do?",
    a: "On the lock screen, tap 'Forgot PIN?'. If you have an email linked to your account, you'll receive a reset code. Enter the code to reset your PIN.",
  },
  {
    q: "How do I reset my password?",
    a: "On the login page, tap 'Forgot password?'. Enter your email and we'll send you a reset link. Open the link to set a new password.",
  },
  {
    q: "Can I use PowerFlow on multiple devices?",
    a: "Yes! PowerFlow is a web app that works on any device with a browser. Just sign in with your email and password. Your wallet, meters, and transfer history sync across all devices.",
  },
];

const FAQ = () => {
  const navigate = useNavigate();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="px-5 pt-14 pb-4 flex items-center gap-3 animate-fade-in">
        <button onClick={() => navigate("/profile")} className="p-2 rounded-xl hover:bg-muted/30 transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-xl font-bold text-foreground">FAQ & Help</h1>
      </div>

      <div className="px-5 space-y-3">
        {/* Hero */}
        <div className="glass-card-elevated rounded-2xl p-5 text-center animate-fade-in-up">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <HelpCircle className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">How can we help?</h2>
          <p className="text-xs text-muted-foreground">Find answers to common questions below</p>
        </div>

        {/* FAQ items */}
        <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
          {faqs.map((faq, i) => (
            <button
              key={i}
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="w-full text-left glass-card rounded-xl border border-border/20 overflow-hidden transition-all"
            >
              <div className="flex items-center gap-3 p-4">
                <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <p className="flex-1 text-sm font-medium text-foreground">{faq.q}</p>
                {openIdx === i ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </div>
              {openIdx === i && (
                <div className="px-4 pb-4 pt-0">
                  <p className="text-sm text-muted-foreground leading-relaxed pl-11">{faq.a}</p>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Contact options */}
        <div className="animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] mb-2.5 px-1">Still need help?</p>
          <div className="glass-card-elevated rounded-2xl overflow-hidden">
            <a href="mailto:support@powerflow.co.ke" className="flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors border-b border-border">
              <div className="w-9 h-9 rounded-xl bg-primary/8 flex items-center justify-center">
                <MailIcon className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Email Support</p>
                <p className="text-[10px] text-muted-foreground">support@powerflow.co.ke</p>
              </div>
            </a>
            <a href="https://wa.me/254700000000" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-success/8 flex items-center justify-center">
                <MessageCircle className="w-4 h-4 text-success" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">WhatsApp</p>
                <p className="text-[10px] text-muted-foreground">Chat with our support team</p>
              </div>
            </a>
          </div>
        </div>
      </div>

      <BottomNav active="/profile" />
    </div>
  );
};

export default FAQ;
