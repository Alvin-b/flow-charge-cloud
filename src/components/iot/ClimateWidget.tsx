import { useState } from "react";
import { Thermometer, Fan, Droplets, ArrowUp, ArrowDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ModuleCard } from "./ModuleCard";
import { EditableDeviceName } from "./EditableDeviceName";

interface ClimateDevice {
  id: string;
  name: string;
  type: "thermostat" | "fan" | "humidity";
  temp?: number;
  target?: number;
  humidity?: number;
  fanSpeed?: number;
  on: boolean;
}

const mockDevices: ClimateDevice[] = [
  { id: "1", name: "Living Room AC", type: "thermostat", temp: 24, target: 22, on: true },
  { id: "2", name: "Bedroom Fan", type: "fan", fanSpeed: 2, on: true },
  { id: "3", name: "Humidity Sensor", type: "humidity", humidity: 62, on: true },
  { id: "4", name: "Kitchen AC", type: "thermostat", temp: 26, target: 23, on: false },
];

export function ClimateWidget() {
  const [devices, setDevices] = useState(mockDevices);

  const toggle = (id: string) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, on: !d.on } : d));
  };

  const rename = (id: string, newName: string) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, name: newName } : d));
  };

  const adjustTemp = (id: string, delta: number) => {
    setDevices(prev => prev.map(d =>
      d.id === id && d.target != null ? { ...d, target: Math.max(16, Math.min(30, d.target + delta)) } : d
    ));
  };

  const avgTemp = devices.filter(d => d.temp != null).reduce((s, d) => s + (d.temp ?? 0), 0) /
    Math.max(1, devices.filter(d => d.temp != null).length);

  return (
    <ModuleCard
      icon={Thermometer}
      title="Climate & HVAC"
      subtitle={`Avg: ${avgTemp.toFixed(0)}°C`}
      color="text-success"
      bgColor="bg-success/10"
    >
      <div className="space-y-3">
        {devices.map(device => (
          <div key={device.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/5 border border-border/5">
            <div className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center",
              device.on ? "bg-success/10" : "bg-muted/20"
            )}>
              {device.type === "thermostat" && <Thermometer className={cn("w-4 h-4", device.on ? "text-success" : "text-muted-foreground/40")} />}
              {device.type === "fan" && <Fan className={cn("w-4 h-4", device.on ? "text-success animate-spin" : "text-muted-foreground/40")} style={device.on ? { animationDuration: "2s" } : {}} />}
              {device.type === "humidity" && <Droplets className={cn("w-4 h-4", device.on ? "text-[hsl(var(--cyan))]" : "text-muted-foreground/40")} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <EditableDeviceName
                  name={device.name}
                  onRename={(n) => rename(device.id, n)}
                />
                <Switch checked={device.on} onCheckedChange={() => toggle(device.id)} className="scale-75 data-[state=checked]:bg-success" />
              </div>
              {device.type === "thermostat" && device.on && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-muted-foreground tabular-nums">Now: {device.temp}°C</span>
                  <span className="text-[10px] text-muted-foreground">→</span>
                  <div className="flex items-center gap-1">
                    <button onClick={() => adjustTemp(device.id, -1)} className="w-5 h-5 rounded bg-muted/20 flex items-center justify-center hover:bg-muted/40">
                      <ArrowDown className="w-3 h-3 text-muted-foreground" />
                    </button>
                    <span className="text-xs font-bold text-success w-8 text-center tabular-nums">{device.target}°C</span>
                    <button onClick={() => adjustTemp(device.id, 1)} className="w-5 h-5 rounded bg-muted/20 flex items-center justify-center hover:bg-muted/40">
                      <ArrowUp className="w-3 h-3 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              )}
              {device.type === "fan" && device.on && (
                <span className="text-[10px] text-muted-foreground">Speed: {device.fanSpeed}/3</span>
              )}
              {device.type === "humidity" && device.on && (
                <span className="text-[10px] text-muted-foreground tabular-nums">Humidity: {device.humidity}%</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </ModuleCard>
  );
}
