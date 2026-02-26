import { Link } from "react-router-dom";
import { Home, Zap, BarChart3, ArrowLeftRight, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";

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
      "fixed bottom-0 left-0 right-0 z-50 safe-bottom",
      theme === "dark" ? "bottom-nav" : "bottom-nav-light"
    )}>
      <div className="flex items-center justify-around px-3 py-2 pb-safe max-w-lg mx-auto relative">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = active === path;
          const isCenter = label === "Recharge";

          if (isCenter) {
            return (
              <Link
                key={path}
                to={path}
                className="relative -mt-7 flex flex-col items-center gap-1"
              >
                <div className={cn(
                  "w-14 h-14 rounded-2xl gradient-cyan flex items-center justify-center shadow-lg transition-all duration-300",
                  isActive ? "glow-cyan-strong scale-110" : "glow-cyan"
                )}>
                  <Zap className="w-6 h-6 text-[hsl(var(--navy))]" strokeWidth={2.5} />
                </div>
                <span className={cn(
                  "text-[9px] font-semibold",
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
              className="flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 relative"
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute -top-1 w-8 h-0.5 rounded-full bg-primary glow-cyan" />
              )}
              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-300",
                isActive && "bg-primary/10"
              )}>
                {Icon && (
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-all duration-300",
                      isActive ? "text-primary" : "text-muted-foreground/70"
                    )}
                    strokeWidth={isActive ? 2.5 : 1.5}
                  />
                )}
              </div>
              <span className={cn(
                "text-[9px] font-medium transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground/70"
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
