import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface ModuleCardProps {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  color: string;
  bgColor: string;
  onClick?: () => void;
  children: React.ReactNode;
  badge?: React.ReactNode;
}

export function ModuleCard({ icon: Icon, title, subtitle, color, bgColor, onClick, children, badge }: ModuleCardProps) {
  return (
    <div className="glass-card-elevated rounded-2xl border border-border/10 overflow-hidden animate-fade-in-up">
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/10 transition-colors text-left"
      >
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", bgColor)}>
          <Icon className={cn("w-5 h-5", color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{title}</span>
            {badge}
          </div>
          <span className="text-[10px] text-muted-foreground">{subtitle}</span>
        </div>
        {onClick && <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />}
      </button>
      <div className="px-4 pb-4 pt-1">
        {children}
      </div>
    </div>
  );
}
