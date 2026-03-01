import { Link } from "react-router-dom";
import { Home, Zap, BarChart3, ArrowLeftRight, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";
import { Sounds } from "@/lib/sounds";

const tabs = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/meters", icon: Zap, label: "Meters" },
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
      "fixed bottom-3 left-3 right-3 z-50 max-w-lg mx-auto",
      theme === "dark" ? "bottom-nav" : "bottom-nav-light"
    )}>
      <div className={cn(
        "flex items-center justify-around px-4 py-3 pb-safe rounded-[28px] border border-primary/10",
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
                className="relative -mt-8 flex flex-col items-center gap-1"
                onClick={() => Sounds.navigate()}
              >
                <div className={cn(
                  "w-16 h-16 rounded-[22px] gradient-cyan flex items-center justify-center shadow-lg transition-all duration-300 ring-4 ring-primary/20",
                  isActive ? "glow-cyan-strong scale-110" : "glow-cyan hover:scale-105"
                )}>
                  <Zap className="w-7 h-7 text-[hsl(var(--navy))]" strokeWidth={2.5} />
                </div>
                <span className={cn(
                  "text-[10px] font-semibold mt-1",
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
              className="flex flex-col items-center gap-0.5 py-2 px-4 rounded-2xl transition-all duration-200 relative min-w-[60px]"
              onClick={() => Sounds.navigate()}
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute -top-0.5 w-10 h-1 rounded-full bg-primary glow-cyan" />
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
                "text-[10px] font-medium transition-colors duration-200",
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
