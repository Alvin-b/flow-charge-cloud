import { Link } from "react-router-dom";
import { Home, Zap, BarChart3, Cpu, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";
import { Sounds } from "@/lib/sounds";

const tabs = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/iot", icon: Cpu, label: "IoT Hub" },
  { path: "/recharge", icon: null, label: "Recharge" }, // Center FAB
  { path: "/analytics", icon: BarChart3, label: "Stats" },
  { path: "/profile", icon: User, label: "Profile" },
];

interface BottomNavProps {
  active: string;
}

const BottomNav = ({ active }: BottomNavProps) => {
  const { theme } = useTheme();

  return (
    <nav className={cn(
      "fixed bottom-0 left-0 right-0 z-40 max-w-lg mx-auto px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
      theme === "dark" ? "bottom-nav" : "bottom-nav-light"
    )}>
      <div className={cn(
        "flex items-center justify-around px-2 py-2.5 rounded-[24px] border border-primary/10",
        theme === "dark" 
          ? "bg-[hsl(228,50%,8%)]/95 backdrop-blur-xl shadow-2xl shadow-black/30" 
          : "bg-white/95 backdrop-blur-xl shadow-2xl shadow-black/10"
      )}>
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = active === path;
          const isCenter = label === "Recharge";

          if (isCenter) {
            return (
              <Link
                key={path}
                to={path}
                className="relative -mt-7 flex flex-col items-center gap-0.5"
                onClick={() => Sounds.navigate()}
              >
                <div className={cn(
                  "w-14 h-14 rounded-[20px] gradient-cyan flex items-center justify-center shadow-lg transition-all duration-300 ring-[3px] ring-primary/20",
                  isActive ? "glow-cyan-strong scale-110" : "glow-cyan hover:scale-105"
                )}>
                  <Zap className="w-6 h-6 text-[hsl(var(--navy))]" strokeWidth={2.5} />
                </div>
                <span className={cn(
                  "text-[9px] font-semibold mt-0.5",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-2xl transition-all duration-200 relative min-w-[52px]"
              onClick={() => Sounds.navigate()}
            >
              {isActive && (
                <div className="absolute -top-0.5 w-8 h-0.5 rounded-full bg-primary glow-cyan" />
              )}
              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-300",
                isActive && "bg-primary/10"
              )}>
                {Icon && (
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-all duration-300",
                      isActive ? "text-primary" : "text-muted-foreground/60"
                    )}
                    strokeWidth={isActive ? 2.5 : 1.5}
                  />
                )}
              </div>
              <span className={cn(
                "text-[9px] font-medium transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground/60"
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
