import { useState } from "react";
import { Lightbulb, Sun, Palette, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { ModuleCard } from "./ModuleCard";

interface Light {
  id: string;
  name: string;
  on: boolean;
  brightness: number;
  color: string;
  room: string;
}

const mockLights: Light[] = [
  { id: "1", name: "Living Room", on: true, brightness: 80, color: "#FFD700", room: "Living" },
  { id: "2", name: "Bedroom", on: false, brightness: 40, color: "#87CEEB", room: "Bedroom" },
  { id: "3", name: "Kitchen", on: true, brightness: 100, color: "#FFFFFF", room: "Kitchen" },
  { id: "4", name: "Porch Light", on: true, brightness: 60, color: "#FFA500", room: "Outdoor" },
];

export function SmartLightingWidget() {
  const [lights, setLights] = useState(mockLights);

  const toggle = (id: string) => {
    setLights(prev => prev.map(l => l.id === id ? { ...l, on: !l.on } : l));
  };

  const setBrightness = (id: string, val: number) => {
    setLights(prev => prev.map(l => l.id === id ? { ...l, brightness: val } : l));
  };

  const onCount = lights.filter(l => l.on).length;

  return (
    <ModuleCard
      icon={Lightbulb}
      title="Smart Lighting"
      subtitle={`${onCount}/${lights.length} lights on`}
      color="text-accent"
      bgColor="bg-accent/10"
      badge={
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-medium">
          {onCount} ON
        </span>
      }
    >
      <div className="space-y-3">
        {lights.map(light => (
          <div key={light.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/5 border border-border/5">
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300",
                light.on ? "bg-accent/20 shadow-sm" : "bg-muted/20"
              )}
              style={light.on ? { boxShadow: `0 0 12px ${light.color}40` } : {}}
            >
              <Lightbulb
                className={cn("w-4 h-4 transition-colors", light.on ? "text-accent" : "text-muted-foreground/40")}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground">{light.name}</span>
                <Switch
                  checked={light.on}
                  onCheckedChange={() => toggle(light.id)}
                  className="scale-75 data-[state=checked]:bg-accent"
                />
              </div>
              {light.on && (
                <div className="flex items-center gap-2">
                  <Sun className="w-3 h-3 text-muted-foreground/50" />
                  <Slider
                    value={[light.brightness]}
                    onValueChange={([v]) => setBrightness(light.id, v)}
                    max={100}
                    step={5}
                    className="flex-1 [&_[role=slider]]:h-3 [&_[role=slider]]:w-3"
                  />
                  <span className="text-[10px] text-muted-foreground w-7 text-right">{light.brightness}%</span>
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="grid grid-cols-3 gap-2 pt-1">
          {[
            { icon: Sun, label: "All On", action: () => setLights(prev => prev.map(l => ({ ...l, on: true }))) },
            { icon: Palette, label: "Scenes", action: () => {} },
            { icon: Clock, label: "Schedules", action: () => {} },
          ].map(({ icon: Icon, label, action }) => (
            <button key={label} onClick={action}
              className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-muted/5 border border-border/5 hover:bg-muted/10 transition-colors card-interactive">
              <Icon className="w-4 h-4 text-accent" />
              <span className="text-[9px] text-muted-foreground font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </ModuleCard>
  );
}
