import { useNavigate } from "react-router-dom";
import { Smartphone, Download, Share2, Zap, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const Install = () => {
  const navigate = useNavigate();

  const steps = [
    { icon: Share2, text: 'Tap the Share button in your browser' },
    { icon: Download, text: '"Add to Home Screen"' },
    { icon: Smartphone, text: 'Open PowerFlow from your home screen' },
  ];

  return (
    <div className="min-h-screen gradient-navy flex flex-col items-center justify-center px-6 gap-8">
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-primary/5 blur-3xl" />

      <div className="flex flex-col items-center gap-4 text-center animate-fade-in-up">
        <div className="w-20 h-20 rounded-3xl gradient-cyan flex items-center justify-center glow-cyan animate-float">
          <Zap className="w-10 h-10 text-[hsl(var(--navy))]" strokeWidth={2.5} />
        </div>
        <h1 className="text-3xl font-bold text-foreground">
          Install Power<span className="text-primary">Flow</span>
        </h1>
        <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
          Add PowerFlow to your home screen for the best experience — fast, offline-capable, and feels like a native app.
        </p>
      </div>

      <div className="w-full max-w-sm glass-card rounded-2xl p-5 border border-border/20 space-y-4 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
        <p className="text-sm font-semibold text-foreground">How to install</p>
        {steps.map(({ icon: Icon, text }, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>

      <div className="w-full max-w-sm space-y-3 animate-fade-in-up" style={{ animationDelay: "0.25s" }}>
        <div className="space-y-2">
          {["Works offline", "No app store required", "Instant updates", "Secure & encrypted"].map((f) => (
            <div key={f} className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
              <span className="text-sm text-muted-foreground">{f}</span>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={() => navigate("/")} className="w-full max-w-sm gradient-cyan text-[hsl(var(--navy))] font-bold h-12 rounded-xl glow-cyan animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
        Continue to App
      </Button>
    </div>
  );
};

export default Install;
