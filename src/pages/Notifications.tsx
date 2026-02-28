import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell, BellOff, Loader2 } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  created_at: string;
}

const typeColors: Record<string, string> = {
  success: "border-l-success bg-success/5",
  warning: "border-l-accent bg-accent/5",
  danger: "border-l-destructive bg-destructive/5",
  info: "border-l-primary bg-primary/5",
  payment: "border-l-success bg-success/5",
  transfer: "border-l-primary bg-primary/5",
  meter: "border-l-accent bg-accent/5",
  alert: "border-l-destructive bg-destructive/5",
};

const typeIcons: Record<string, string> = {
  success: "✅", warning: "⚠️", danger: "🔴", info: "ℹ️",
  payment: "💳", transfer: "🔄", meter: "⚡", alert: "🔔",
};

const getTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      setNotifications(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ read: true }).in("id", unreadIds);
    setNotifications((ns) => ns.map((n) => ({ ...n, read: true })));
  };

  const markOneRead = async (id: string) => {
    await supabase.from("notifications").update({ read: true }).eq("id", id);
    setNotifications((ns) => ns.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  if (loading) {
    return (
      <div className="min-h-screen gradient-navy flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

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
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center">
              <BellOff className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">No notifications yet</p>
          </div>
        ) : (
          <>
            {notifications.map((n, i) => (
              <div
                key={n.id}
                onClick={() => markOneRead(n.id)}
                className={`relative glass-card rounded-2xl p-4 border-l-4 border border-border/20 cursor-pointer transition-all hover:border-primary/20 animate-fade-in-up ${typeColors[n.type] || typeColors.info} ${!n.read ? "opacity-100" : "opacity-70"}`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                {!n.read && (
                  <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-primary glow-cyan" />
                )}
                <div className="flex items-start gap-3">
                  <span className="text-2xl mt-0.5">{typeIcons[n.type] || "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-2">{getTimeAgo(n.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}

            {notifications.length > 0 && notifications.every((n) => n.read) && (
              <div className="flex flex-col items-center justify-center py-8 gap-3 animate-fade-in">
                <Bell className="w-6 h-6 text-muted-foreground" />
                <p className="text-muted-foreground text-sm">All caught up!</p>
              </div>
            )}
          </>
        )}
      </div>

      <BottomNav active="/" />
    </div>
  );
};

export default Notifications;
