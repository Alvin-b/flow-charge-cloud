import { useNavigate, Link } from "react-router-dom";
import { Home, Zap, BarChart3, ArrowLeftRight, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";

const tabs = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/recharge", icon: Zap, label: "Recharge" },
  { path: "/analytics", icon: BarChart3, label: "Analytics" },
  { path: "/transfer", icon: ArrowLeftRight, label: "Transfer" },
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
      <div className="flex items-center justify-around px-2 py-2 pb-safe max-w-lg mx-auto">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = active === path;
          return (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all duration-200"
            >
              <div className={cn(
                "p-1.5 rounded-xl transition-all duration-200",
                isActive && "bg-primary/15"
              )}>
                <Icon
                  className={cn(
                    "w-5 h-5 transition-all duration-200",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
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
