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
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background overflow-hidden">
      {/* Soft background circles */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute bottom-1/3 left-1/3 w-48 h-48 rounded-full bg-accent/5 blur-3xl" />

      <div
        className="relative flex flex-col items-center gap-6"
        style={{
          opacity: phase >= 1 ? 1 : 0,
          transform: phase >= 1 ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div className="relative">
          <div className="w-20 h-20 rounded-3xl bg-primary flex items-center justify-center shadow-lg animate-float">
            <Zap className="w-10 h-10 text-primary-foreground" strokeWidth={2.5} />
          </div>
        </div>

        <div
          className="text-center"
          style={{
            opacity: phase >= 2 ? 1 : 0,
            transform: phase >= 2 ? "translateY(0)" : "translateY(8px)",
            transition: "all 0.4s ease-out 0.1s",
          }}
        >
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Power<span className="text-primary">Flow</span>
          </h1>
          <p className="text-muted-foreground text-sm mt-2 tracking-wide">
            Smart Energy Wallet
          </p>
        </div>
      </div>

      <div
        className="absolute bottom-16 flex flex-col items-center gap-3"
        style={{
          opacity: phase >= 3 ? 1 : 0,
          transition: "opacity 0.4s ease-out",
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
        <p className="text-muted-foreground text-xs">Connecting…</p>
      </div>
    </div>
  );
};

export default SplashScreen;
