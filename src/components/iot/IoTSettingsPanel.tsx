import { iotModules, protocolInfo, type ModuleId } from "@/lib/iot-modules";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Lock, Cpu } from "lucide-react";

interface IoTSettingsPanelProps {
  enabledModules: ModuleId[];
  onToggle: (id: ModuleId) => void;
}

export function IoTSettingsPanel({ enabledModules, onToggle }: IoTSettingsPanelProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 px-1">
        <Cpu className="w-4 h-4 text-primary" />
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">IoT Modules</p>
      </div>

      <div className="glass-card-elevated rounded-2xl overflow-hidden border border-border/10">
        {iotModules.map((mod, i) => {
          const enabled = enabledModules.includes(mod.id);
          const Icon = mod.icon;
          return (
            <div key={mod.id} className={cn(
              "flex items-center gap-3 px-4 py-3.5 transition-colors",
              i < iotModules.length - 1 && "border-b border-border/10"
            )}>
              <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center", mod.bgColor)}>
                <Icon className={cn("w-4 h-4", mod.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{mod.name}</span>
                  {mod.isCore && (
                    <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-semibold flex items-center gap-0.5">
                      <Lock className="w-2 h-2" /> CORE
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground block mt-0.5">{mod.description}</span>
                <div className="flex items-center gap-1.5 mt-1">
                  {mod.protocols.map(p => {
                    const proto = protocolInfo[p];
                    return (
                      <span key={p} className="text-[8px] px-1.5 py-0.5 rounded-full bg-muted/30 text-muted-foreground font-medium">
                        {proto.name}
                      </span>
                    );
                  })}
                </div>
              </div>
              <Switch
                checked={enabled}
                onCheckedChange={() => onToggle(mod.id)}
                disabled={mod.isCore}
                className={cn("data-[state=checked]:bg-primary", mod.isCore && "opacity-50")}
              />
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground/60 text-center px-4">
        Enable modules to add them to your IoT Hub dashboard. Core modules cannot be disabled.
      </p>
    </div>
  );
}
