import { useState } from "react";
import { Droplets, Waves, AlertTriangle, Clock, TrendingDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ModuleCard } from "./ModuleCard";

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

  const toggle = (id: string) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, active: !d.active } : d));
  };

  const lowTanks = devices.filter(d => d.type === "tank" && d.value < 40);
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
        {devices.map(device => (
          <div key={device.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/5 border border-border/5">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--cyan))]/10 flex items-center justify-center">
              {device.type === "tank" ? (
                <div className="relative w-5 h-6 rounded-sm border border-[hsl(var(--cyan))]/40 overflow-hidden">
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-[hsl(var(--cyan))]/30 transition-all duration-500"
                    style={{ height: `${device.value}%` }}
                  />
                </div>
              ) : device.type === "flow" ? (
                <Waves className="w-4 h-4 text-[hsl(var(--cyan))]" />
              ) : (
                <Droplets className="w-4 h-4 text-[hsl(var(--cyan))]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-foreground block">{device.name}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn(
                  "text-sm font-bold",
                  device.type === "tank" && device.value < 40 ? "text-destructive" : "text-[hsl(var(--cyan))]"
                )}>
                  {device.value}
                </span>
                <span className="text-[10px] text-muted-foreground">{device.unit}</span>
              </div>
              {device.type === "tank" && (
                <div className="w-full h-1 rounded-full bg-muted/20 mt-1 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      device.value < 40 ? "bg-destructive" : "bg-[hsl(var(--cyan))]"
                    )}
                    style={{ width: `${device.value}%` }}
                  />
                </div>
              )}
            </div>
            <Switch
              checked={device.active}
              onCheckedChange={() => toggle(device.id)}
              className="scale-75 data-[state=checked]:bg-[hsl(var(--cyan))]"
            />
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
