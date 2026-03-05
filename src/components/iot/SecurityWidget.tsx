import { useState } from "react";
import { Camera, Lock, Unlock, ShieldAlert, Eye, Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ModuleCard } from "./ModuleCard";
import { EditableDeviceName } from "./EditableDeviceName";

interface SecurityDevice {
  id: string;
  name: string;
  type: "camera" | "lock" | "motion";
  status: "online" | "offline" | "alert";
  armed: boolean;
}

const mockDevices: SecurityDevice[] = [
  { id: "1", name: "Front Door Cam", type: "camera", status: "online", armed: true },
  { id: "2", name: "Back Door Lock", type: "lock", status: "online", armed: true },
  { id: "3", name: "Living Room Motion", type: "motion", status: "online", armed: false },
  { id: "4", name: "Gate Camera", type: "camera", status: "offline", armed: true },
];

const typeIcon = { camera: Camera, lock: Lock, motion: Eye };
const statusColors = {
  online: "bg-success",
  offline: "bg-muted-foreground/40",
  alert: "bg-destructive animate-pulse",
};

export function SecurityWidget() {
  const [devices, setDevices] = useState(mockDevices);
  const [systemArmed, setSystemArmed] = useState(true);

  const toggle = (id: string) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, armed: !d.armed } : d));
  };

  const rename = (id: string, newName: string) => {
    setDevices(prev => prev.map(d => d.id === id ? { ...d, name: newName } : d));
  };

  const onlineCount = devices.filter(d => d.status === "online").length;

  return (
    <ModuleCard
      icon={Camera}
      title="Security & Access"
      subtitle={`${onlineCount}/${devices.length} devices online`}
      color="text-destructive"
      bgColor="bg-destructive/10"
      badge={
        <span className={cn(
          "text-[9px] px-1.5 py-0.5 rounded-full font-medium",
          systemArmed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
        )}>
          {systemArmed ? "ARMED" : "DISARMED"}
        </span>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-xl border border-border/10 bg-muted/5">
          <div className="flex items-center gap-2">
            {systemArmed ? <ShieldAlert className="w-4 h-4 text-success" /> : <Unlock className="w-4 h-4 text-destructive" />}
            <span className="text-xs font-semibold text-foreground">System {systemArmed ? "Armed" : "Disarmed"}</span>
          </div>
          <Switch checked={systemArmed} onCheckedChange={setSystemArmed} className="data-[state=checked]:bg-success" />
        </div>

        {devices.map(device => {
          const DevIcon = typeIcon[device.type];
          return (
            <div key={device.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/5 border border-border/5">
              <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center",
                device.status === "online" ? "bg-success/10" : "bg-muted/20"
              )}>
                <DevIcon className={cn("w-4 h-4", device.status === "online" ? "text-foreground" : "text-muted-foreground/40")} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <EditableDeviceName
                    name={device.name}
                    onRename={(n) => rename(device.id, n)}
                  />
                  <Switch checked={device.armed} onCheckedChange={() => toggle(device.id)} className="scale-75 data-[state=checked]:bg-success" />
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={cn("w-1.5 h-1.5 rounded-full", statusColors[device.status])} />
                  <span className="text-[10px] text-muted-foreground capitalize">{device.status}</span>
                </div>
              </div>
            </div>
          );
        })}

        <div className="grid grid-cols-2 gap-2 pt-1">
          <button className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/5 border border-border/5 hover:bg-muted/10 transition-colors card-interactive">
            <Bell className="w-4 h-4 text-destructive" />
            <span className="text-[10px] text-muted-foreground font-medium">Alert History</span>
          </button>
          <button className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/5 border border-border/5 hover:bg-muted/10 transition-colors card-interactive">
            <Camera className="w-4 h-4 text-primary" />
            <span className="text-[10px] text-muted-foreground font-medium">Live View</span>
          </button>
        </div>
      </div>
    </ModuleCard>
  );
}
