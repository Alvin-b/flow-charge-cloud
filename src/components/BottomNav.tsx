import { Link, useLocation } from "react-router-dom";
import { Home, Zap, BarChart3, Cpu, User } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sounds } from "@/lib/sounds";

const tabs = [
  { path: "/", icon: Home, label: "Home" },
  { path: "/iot", icon: Cpu, label: "IoT Hub" },
  { path: "/recharge", icon: null, label: "Recharge" },
  { path: "/analytics", icon: BarChart3, label: "Stats" },
  { path: "/profile", icon: User, label: "Profile" },
];

interface BottomNavProps {
  active: string;
}

const BottomNav = ({ active }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-lg mx-auto px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] bg-background/95 backdrop-blur-lg border-t border-border">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        className="flex items-center justify-around py-1.5"
      >
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = active === path;
          const isCenter = label === "Recharge";

          if (isCenter) {
            return (
              <Link
                key={path}
                to={path}
                className="relative -mt-6 flex flex-col items-center gap-0.5"
                onClick={() => Sounds.navigate()}
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "w-13 h-13 rounded-2xl gradient-cyan flex items-center justify-center shadow-md transition-shadow",
                    isActive ? "glow-cyan-strong" : ""
                  )}
                >
                  <Zap className="w-6 h-6 text-primary-foreground" strokeWidth={2.5} />
                </motion.div>
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
              className="flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all duration-200 relative min-w-[52px]"
              onClick={() => Sounds.navigate()}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-0.5 w-6 h-[2.5px] rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
              <motion.div
                whileTap={{ scale: 0.85 }}
                className={cn(
                  "p-1.5 rounded-xl transition-all duration-200",
                  isActive && "bg-primary/8"
                )}
              >
                {Icon && (
                  <Icon
                    className={cn(
                      "w-5 h-5 transition-colors duration-200",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )}
                    strokeWidth={isActive ? 2.2 : 1.5}
                  />
                )}
              </motion.div>
              <span className={cn(
                "text-[9px] font-medium transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )}>
                {label}
              </span>
            </Link>
          );
        })}
      </motion.div>
    </nav>
  );
};

export default BottomNav;
