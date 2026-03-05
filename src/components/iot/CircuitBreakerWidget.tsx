import { useState } from "react";
import { CircuitBoard, Power, AlertTriangle, Activity, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ModuleCard } from "./ModuleCard";
import { EditableDeviceName } from "./EditableDeviceName";

interface Breaker {
  id: string;
  name: string;
  on: boolean;
  currentA: number;
  ratedA: number;
  powerW: number;
  tripped: boolean;
}

const mockBreakers: Breaker[] = [
  { id: "1", name: "Main Supply", on: true, currentA: 28.5, ratedA: 60, powerW: 6270, tripped: false },
  { id: "2", name: "Lighting Circuit", on: true, currentA: 4.2, ratedA: 16, powerW: 924, tripped: false },
  { id: "3", name: "Sockets Ring", on: true, currentA: 12.8, ratedA: 32, powerW: 2816, tripped: false },
  { id: "4", name: "Water Heater", on: false, currentA: 0, ratedA: 20, powerW: 0, tripped: true },
];

export function CircuitBreakerWidget() {
  const [breakers, setBreakers] = useState(mockBreakers);

  const toggle = (id: string) => {
    setBreakers(prev => prev.map(b =>
      b.id === id ? { ...b, on: !b.on, tripped: false, currentA: !b.on ? b.ratedA * 0.4 : 0, powerW: !b.on ? b.ratedA * 0.4 * 220 : 0 } : b
    ));
  };

  const rename = (id: string, newName: string) => {
    setBreakers(prev => prev.map(b => b.id === id ? { ...b, name: newName } : b));
  };

  const totalPower = breakers.filter(b => b.on).reduce((s, b) => s + b.powerW, 0);
  const trippedCount = breakers.filter(b => b.tripped).length;

  return (
    <ModuleCard
      icon={CircuitBoard}
      title="Circuit Breakers"
      subtitle={`Total: ${(totalPower / 1000).toFixed(1)} kW`}
      color="text-[hsl(var(--purple))]"
      bgColor="bg-[hsl(var(--purple))]/10"
      badge={trippedCount > 0 ? (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive font-medium flex items-center gap-0.5 animate-pulse">
          <AlertTriangle className="w-2.5 h-2.5" /> {trippedCount} tripped
        </span>
      ) : undefined}
    >
      <div className="space-y-3">
        {breakers.map(breaker => {
          const loadPct = breaker.ratedA > 0 ? (breaker.currentA / breaker.ratedA) * 100 : 0;
          const overloaded = loadPct > 80;
          return (
            <div key={breaker.id} className={cn(
              "flex items-center gap-3 p-2.5 rounded-xl border transition-all",
              breaker.tripped ? "bg-destructive/5 border-destructive/20" : "bg-muted/5 border-border/5"
            )}>
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center",
                breaker.tripped ? "bg-destructive/15" : breaker.on ? "bg-[hsl(var(--purple))]/10" : "bg-muted/20"
              )}>
                {breaker.tripped ? (
                  <AlertTriangle className="w-4 h-4 text-destructive" />
                ) : (
                  <Power className={cn("w-4 h-4", breaker.on ? "text-[hsl(var(--purple))]" : "text-muted-foreground/40")} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <EditableDeviceName
                    name={breaker.name}
                    onRename={(n) => rename(breaker.id, n)}
                  />
                  <Switch checked={breaker.on} onCheckedChange={() => toggle(breaker.id)} className="scale-75 data-[state=checked]:bg-[hsl(var(--purple))]" />
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-[10px] text-muted-foreground tabular-nums">{breaker.currentA.toFixed(1)}A / {breaker.ratedA}A</span>
                  <span className={cn("text-[10px] font-medium tabular-nums", overloaded ? "text-destructive" : "text-muted-foreground")}>
                    {breaker.powerW > 0 ? `${breaker.powerW}W` : "OFF"}
                  </span>
                </div>
                <div className="w-full h-1 rounded-full bg-muted/20 mt-1 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", overloaded ? "bg-destructive" : "bg-[hsl(var(--purple))]")}
                    style={{ width: `${Math.min(loadPct, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="text-center p-2.5 rounded-xl bg-muted/5 border border-border/5">
            <Zap className="w-4 h-4 text-[hsl(var(--purple))] mx-auto mb-1" />
            <p className="text-sm font-bold text-foreground tabular-nums">{(totalPower / 1000).toFixed(1)} kW</p>
            <p className="text-[8px] text-muted-foreground uppercase">Total Load</p>
          </div>
          <div className="text-center p-2.5 rounded-xl bg-muted/5 border border-border/5">
            <Activity className="w-4 h-4 text-success mx-auto mb-1" />
            <p className="text-sm font-bold text-foreground">{breakers.filter(b => b.on).length}/{breakers.length}</p>
            <p className="text-[8px] text-muted-foreground uppercase">Active</p>
          </div>
        </div>
      </div>
    </ModuleCard>
  );
}
