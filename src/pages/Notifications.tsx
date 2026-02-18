import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, BellOff } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const allNotifications = [
  { id: 1, type: "success", icon: "💳", title: "Payment Confirmed", desc: "KES 500 recharge — 24.5 kWh added to wallet", time: "2h ago", read: false },
  { id: 2, type: "warning", icon: "🟡", title: "Low Balance Alert", desc: "Your balance is below 5 kWh. Recharge now to avoid disconnection.", time: "5h ago", read: false },
  { id: 3, type: "danger", icon: "🔴", title: "Meter Offline", desc: "Meter KE-01139 has gone offline. SMS fallback activated.", time: "8h ago", read: false },
  { id: 4, type: "info", icon: "🟠", title: "Abnormal Usage Detected", desc: "Usage spike detected at 6PM — 2.3x above your average.", time: "1d ago", read: true },
  { id: 5, type: "success", icon: "🟢", title: "Transfer Received", desc: "5 kWh received from John Mwangi (+KES 102)", time: "1d ago", read: true },
  { id: 6, type: "warning", icon: "⚪", title: "Overconsumption Warning", desc: "You've used 18% more than yesterday. Check your appliances.", time: "2d ago", read: true },
];

const typeColors: Record<string, string> = {
  success: "border-l-success bg-success/5",
  warning: "border-l-accent bg-accent/5",
  danger: "border-l-destructive bg-destructive/5",
  info: "border-l-amber bg-amber/5",
};

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(allNotifications);
  const unread = notifications.filter((n) => !n.read).length;

  const markAllRead = () => setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));

  return (
    <div className="min-h-screen gradient-navy pb-24">
      <div className="px-5 pt-14 pb-4 flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="p-2 rounded-xl hover:bg-muted/30 transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Notifications</h1>
            {unread > 0 && <p className="text-xs text-primary">{unread} unread</p>}
          </div>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="text-xs text-primary font-medium hover:underline">Mark all read</button>
        )}
      </div>

      <div className="px-5 space-y-3">
        {notifications.map((n, i) => (
          <div
            key={n.id}
            onClick={() => setNotifications((ns) => ns.map((x) => x.id === n.id ? { ...x, read: true } : x))}
            className={`relative glass-card rounded-2xl p-4 border-l-4 border border-border/20 cursor-pointer transition-all hover:border-primary/20 animate-fade-in-up ${typeColors[n.type]} ${!n.read ? "opacity-100" : "opacity-70"}`}
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            {!n.read && (
              <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary glow-cyan" />
            )}
            <div className="flex items-start gap-3">
              <span className="text-2xl mt-0.5">{n.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.desc}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-2">{n.time}</p>
              </div>
            </div>
          </div>
        ))}

        {notifications.every((n) => n.read) && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">All caught up!</p>
          </div>
        )}
      </div>

      <BottomNav active="/" />
    </div>
  );
};

export default Notifications;
