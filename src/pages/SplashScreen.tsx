import { useEffect, useState } from "react";
import { Zap } from "lucide-react";

const SplashScreen = () => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 900);
    const t3 = setTimeout(() => setPhase(3), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center gradient-navy overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-primary/10 blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 left-1/4 w-48 h-48 rounded-full bg-accent/10 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

      {/* Logo */}
      <div
        className="relative flex flex-col items-center gap-6"
        style={{
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? "translateY(0)" : "translateY(30px)",
          transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Icon ring */}
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl gradient-cyan flex items-center justify-center glow-cyan animate-float">
            <Zap className="w-12 h-12 text-navy-DEFAULT" strokeWidth={2.5} />
          </div>
          {/* Spinning ring */}
          <div
            className="absolute -inset-3 rounded-[2rem] border-2 border-primary/30 border-t-primary animate-spin-slow"
            style={{ opacity: phase >= 2 ? 1 : 0, transition: "opacity 0.5s" }}
          />
        </div>

        {/* Brand name */}
        <div
          className="text-center"
          style={{
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? "translateY(0)" : "translateY(10px)",
            transition: "all 0.5s ease-out 0.1s",
          }}
        >
          <h1 className="text-4xl font-bold tracking-tight text-foreground">
            Power<span className="text-primary glow-cyan-text">Flow</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2 tracking-widest uppercase">
            Smart Energy Wallet
          </p>
        </div>
      </div>

      {/* Bottom loader */}
      <div
        className="absolute bottom-16 flex flex-col items-center gap-3"
        style={{
          opacity: phase >= 3 ? 1 : 0,
          transition: "opacity 0.5s ease-out",
        }}
      >
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary"
              style={{
                animation: "pulseCyan 1.2s ease-in-out infinite",
                animationDelay: `${i * 0.2}s`,
              }}
            />
          ))}
        </div>
        <p className="text-muted-foreground text-xs">Connecting to grid…</p>
      </div>
    </div>
  );
};

export default SplashScreen;
