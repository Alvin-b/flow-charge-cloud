import { useState, useEffect } from "react";
import { Droplets, Waves, AlertTriangle, Clock, TrendingDown, Gauge } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ModuleCard } from "./ModuleCard";
import { AnimatedWaterTank } from "./AnimatedWaterTank";
import { EditableDeviceName } from "./EditableDeviceName";

interface WaterDevice {
  id: string;
  name: string;
  type: "tank" | "flow" | "irrigation";
  value: number;
  unit: string;
  maxValue?: number;
  active: boolean;
}

const mockDevices: WaterDevice[] = [
  { id: "1", name: "Main Tank", type: "tank", value: 72, unit: "%", maxValue: 100, active: true },
  { id: "2", name: "Kitchen Flow", type: "flow", value: 2.4, unit: "L/min", active: true },
  { id: "3", name: "Garden Sprinkler", type: "irrigation", value: 0, unit: "L/min", active: false },
  { id: "4", name: "Roof Tank", type: "tank", value: 35, unit: "%", maxValue: 100, active: true },
];

export function WaterWidget() {
  const [devices, setDevices] = useState(mockDevices);

  // Simulate real-time water level changes
  useEffect(() => {
    const interval = setInterval(() => {
      setDevices(prev => prev.map(d => {
        if (d.type === "tank" && d.active) {
          const delta = (Math.random() - 0.52) * 2; // slight drain tendency
          return { ...d, value: Math.max(5, Math.min(100, d.value + delta)) };
        }
        if (d.type === "flow" && d.active) {
          const delta = (Math.random() - 0.5) * 0.4;
          return { ...d, value: Math.max(0, +(d.value + delta).toFixed(1)) };
        }
        return d;
      }));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const toggle = (id: string) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, active: !d.active } : d));
  };

  const rename = (id: string, newName: string) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, name: newName } : d));
  };

  const lowTanks = devices.filter(d => d.type === "tank" && d.value < 30);
  const totalFlow = devices.filter(d => d.type === "flow" && d.active).reduce((s, d) => s + d.value, 0);

  return (
    <ModuleCard
      icon={Droplets}
      title="Water & Irrigation"
      subtitle={`Flow: ${totalFlow.toFixed(1)} L/min`}
      color="text-[hsl(var(--cyan))]"
      bgColor="bg-[hsl(var(--cyan))]/10"
      badge={lowTanks.length > 0 ? (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive font-medium flex items-center gap-0.5">
          <AlertTriangle className="w-2.5 h-2.5" /> {lowTanks.length} low
        </span>
      ) : undefined}
    >
      <div className="space-y-3">
        {/* Tank devices with animated visualization */}
        {devices.filter(d => d.type === "tank").map(device => (
          <div key={device.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/5 border border-border/5">
            <AnimatedWaterTank level={Math.round(device.value)} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <EditableDeviceName
                  name={device.name}
                  onRename={(n) => rename(device.id, n)}
                />
                <Switch
                  checked={device.active}
                  onCheckedChange={() => toggle(device.id)}
                  className="scale-75 data-[state=checked]:bg-[hsl(var(--cyan))]"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-lg font-bold tabular-nums transition-colors",
                  device.value < 30 ? "text-destructive" : "text-[hsl(var(--cyan))]"
                )}>
                  {Math.round(device.value)}
                </span>
                <span className="text-[10px] text-muted-foreground">{device.unit}</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-muted/20 mt-1.5 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000 ease-out",
                    device.value < 15 ? "bg-destructive" : device.value < 30 ? "bg-accent" : "bg-[hsl(var(--cyan))]"
                  )}
                  style={{ width: `${device.value}%` }}
                />
              </div>
            </div>
          </div>
        ))}

        {/* Flow & irrigation devices */}
        {devices.filter(d => d.type !== "tank").map(device => (
          <div key={device.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/5 border border-border/5">
            <div className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center",
              device.active ? "bg-[hsl(var(--cyan))]/10" : "bg-muted/20"
            )}>
              {device.type === "flow" ? (
                <Waves className={cn("w-4 h-4 transition-colors", device.active ? "text-[hsl(var(--cyan))]" : "text-muted-foreground/40")} />
              ) : (
                <Droplets className={cn("w-4 h-4 transition-colors", device.active ? "text-[hsl(var(--cyan))]" : "text-muted-foreground/40")} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <EditableDeviceName
                  name={device.name}
                  onRename={(n) => rename(device.id, n)}
                />
                <Switch
                  checked={device.active}
                  onCheckedChange={() => toggle(device.id)}
                  className="scale-75 data-[state=checked]:bg-[hsl(var(--cyan))]"
                />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn(
                  "text-sm font-bold tabular-nums",
                  device.active ? "text-[hsl(var(--cyan))]" : "text-muted-foreground/40"
                )}>
                  {device.value}
                </span>
                <span className="text-[10px] text-muted-foreground">{device.unit}</span>
                {device.type === "flow" && device.active && device.value > 0 && (
                  <Gauge className="w-3 h-3 text-[hsl(var(--cyan))]/60 animate-pulse" />
                )}
              </div>
            </div>
          </div>
        ))}

        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { icon: TrendingDown, label: "Usage", val: "847 L" },
            { icon: AlertTriangle, label: "Leaks", val: "None" },
            { icon: Clock, label: "Schedule", val: "2 active" },
          ].map(({ icon: Icon, label, val }) => (
            <div key={label} className="text-center p-2 rounded-xl bg-muted/5 border border-border/5">
              <Icon className="w-3.5 h-3.5 text-[hsl(var(--cyan))] mx-auto mb-1" />
              <p className="text-xs font-bold text-foreground">{val}</p>
              <p className="text-[8px] text-muted-foreground uppercase">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </ModuleCard>
  );
}
