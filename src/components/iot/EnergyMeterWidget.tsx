import { useNavigate } from "react-router-dom";
import { Zap, Battery, TrendingUp, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModuleCard } from "./ModuleCard";

interface EnergyMeterWidgetProps {
  balance: number;
  meterCount: number;
  pct: number;
}

export function EnergyMeterWidget({ balance, meterCount, pct }: EnergyMeterWidgetProps) {
  const navigate = useNavigate();
  const isLow = pct < 20;

  return (
    <ModuleCard
      icon={Zap}
      title="Energy Meters"
      subtitle={`${meterCount} meter${meterCount !== 1 ? "s" : ""} linked`}
      color="text-primary"
      bgColor="bg-primary/10"
      onClick={() => navigate("/meters")}
      badge={
        <span className={cn(
          "text-[9px] px-1.5 py-0.5 rounded-full font-medium",
          isLow ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"
        )}>
          {isLow ? "LOW" : "OK"}
        </span>
      }
    >
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2.5 rounded-xl bg-muted/5 border border-border/5">
            <Battery className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className={cn("text-sm font-bold", isLow ? "text-destructive" : "text-primary")}>{balance.toFixed(1)}</p>
            <p className="text-[8px] text-muted-foreground uppercase">kWh</p>
          </div>
          <div className="text-center p-2.5 rounded-xl bg-muted/5 border border-border/5">
            <Zap className="w-4 h-4 text-accent mx-auto mb-1" />
            <p className="text-sm font-bold text-foreground">{meterCount}</p>
            <p className="text-[8px] text-muted-foreground uppercase">Meters</p>
          </div>
          <div className="text-center p-2.5 rounded-xl bg-muted/5 border border-border/5">
            <TrendingUp className="w-4 h-4 text-success mx-auto mb-1" />
            <p className="text-sm font-bold text-foreground">{pct}%</p>
            <p className="text-[8px] text-muted-foreground uppercase">Capacity</p>
          </div>
        </div>

        <button
          onClick={() => navigate("/recharge")}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors card-interactive"
        >
          <span className="text-xs font-semibold text-primary">Recharge Wallet</span>
          <ArrowRight className="w-4 h-4 text-primary" />
        </button>
      </div>
    </ModuleCard>
  );
}
