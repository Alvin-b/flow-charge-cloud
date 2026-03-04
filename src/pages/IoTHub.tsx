import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Cpu, Settings, Wifi, Radio, Server, Bluetooth, ChevronRight,
  Zap, Sparkles
} from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { useIoTModules } from "@/hooks/useIoTModules";
import { supabase } from "@/integrations/supabase/client";
import { iotModules, protocolInfo, type ModuleId } from "@/lib/iot-modules";
import { cn } from "@/lib/utils";
import { Sounds } from "@/lib/sounds";

// Module widgets
import { EnergyMeterWidget } from "@/components/iot/EnergyMeterWidget";
import { SmartLightingWidget } from "@/components/iot/SmartLightingWidget";
import { SecurityWidget } from "@/components/iot/SecurityWidget";
import { WaterWidget } from "@/components/iot/WaterWidget";
import { CircuitBreakerWidget } from "@/components/iot/CircuitBreakerWidget";
import { ClimateWidget } from "@/components/iot/ClimateWidget";
import { IoTSettingsPanel } from "@/components/iot/IoTSettingsPanel";

const IoTHub = () => {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const { enabledModules, toggleModule, isEnabled } = useIoTModules();
  const [showSettings, setShowSettings] = useState(false);
  const [wallet, setWallet] = useState({ balance_kwh: 0, max_kwh: 200 });
  const [meterCount, setMeterCount] = useState(0);

  useEffect(() => {
    if (authLoading || !user) return;
    let mounted = true;
    const fetch = async () => {
      const [wRes, mRes] = await Promise.all([
        supabase.from("wallets").select("balance_kwh, max_kwh").maybeSingle(),
        supabase.from("meters").select("id", { count: "exact", head: true }),
      ]);
      if (!mounted) return;
      if (wRes.data) setWallet(wRes.data);
      setMeterCount(mRes.count ?? 0);
    };
    fetch();
    return () => { mounted = false; };
  }, [authLoading, user]);

  const pct = wallet.max_kwh > 0 ? Math.min(100, Math.round((wallet.balance_kwh / wallet.max_kwh) * 100)) : 0;

  const activeProtocols = new Set<string>();
  enabledModules.forEach(id => {
    const mod = iotModules.find(m => m.id === id);
    mod?.protocols.forEach(p => activeProtocols.add(p));
  });

  const moduleWidgets: Record<ModuleId, React.ReactNode> = {
    energy_meters: <EnergyMeterWidget key="energy" balance={wallet.balance_kwh} meterCount={meterCount} pct={pct} />,
    smart_lighting: <SmartLightingWidget key="lighting" />,
    security_cameras: <SecurityWidget key="security" />,
    water_irrigation: <WaterWidget key="water" />,
    circuit_breakers: <CircuitBreakerWidget key="breakers" />,
    climate_control: <ClimateWidget key="climate" />,
  };

  if (authLoading) {
    return (
      <div className="min-h-screen gradient-navy flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-2xl gradient-cyan flex items-center justify-center glow-cyan animate-float">
          <Cpu className="w-8 h-8 text-[hsl(var(--navy))]" />
        </div>
        <div className="flex gap-1.5 mt-2">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen pb-28 relative overflow-hidden", theme === "dark" ? "gradient-navy" : "bg-background")}>
      <div className="absolute inset-0 gradient-mesh pointer-events-none" />

      {/* Header */}
      <div className="relative px-5 pt-14 pb-2 flex items-center justify-between animate-fade-in">
        <div>
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-bold text-foreground tracking-tight">IoT Hub</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {enabledModules.length} module{enabledModules.length !== 1 ? "s" : ""} active
          </p>
        </div>
        <button
          onClick={() => { Sounds.tap(); setShowSettings(true); }}
          className="p-2.5 glass-card rounded-xl border border-border/20 card-interactive"
        >
          <Settings className="w-5 h-5 text-foreground" />
        </button>
      </div>

      <div className="relative px-5 space-y-4 mt-3">
        {/* Protocol status bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 animate-fade-in-up">
          {(["mqtt", "zigbee", "wifi", "ble"] as const).map(p => {
            const proto = protocolInfo[p];
            const active = activeProtocols.has(p);
            const ProtoIcon = proto.icon;
            return (
              <div key={p} className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full border shrink-0 transition-all",
                active
                  ? "glass-card border-primary/20 bg-primary/5"
                  : "border-border/10 bg-muted/5 opacity-40"
              )}>
                <ProtoIcon className={cn("w-3 h-3", active ? proto.color : "text-muted-foreground/40")} />
                <span className={cn("text-[10px] font-medium", active ? "text-foreground" : "text-muted-foreground/40")}>
                  {proto.name}
                </span>
                {active && <span className="w-1.5 h-1.5 rounded-full bg-success" />}
              </div>
            );
          })}
        </div>

        {/* Module widgets */}
        <div className="space-y-4">
          {enabledModules.map(id => moduleWidgets[id])}
        </div>

        {/* Add more modules CTA */}
        {enabledModules.length < iotModules.length && (
          <button
            onClick={() => setShowSettings(true)}
            className="w-full glass-card-elevated rounded-2xl p-5 border-2 border-dashed border-primary/15 hover:border-primary/30 transition-all card-interactive animate-fade-in-up text-center"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Sparkles className="w-6 h-6 text-primary/50" />
            </div>
            <p className="text-sm font-semibold text-foreground">Add More Modules</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {iotModules.length - enabledModules.length} more available — lighting, security, water & more
            </p>
          </button>
        )}
      </div>

      {/* Settings bottom sheet */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowSettings(false)} />
          <div className="relative w-full glass-card rounded-t-3xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] border-t border-primary/15 animate-slide-up max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold text-foreground">IoT Modules</h2>
                <p className="text-xs text-muted-foreground">Toggle modules to customize your hub</p>
              </div>
              <button onClick={() => setShowSettings(false)} className="text-xs font-semibold text-primary px-3 py-1.5 rounded-lg hover:bg-primary/10">
                Done
              </button>
            </div>
            <IoTSettingsPanel enabledModules={enabledModules} onToggle={toggleModule} />
          </div>
        </div>
      )}

      <BottomNav active="/iot" />
    </div>
  );
};

export default IoTHub;
