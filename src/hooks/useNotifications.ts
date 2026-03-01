import { useState, useEffect, useCallback } from "react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

interface NotificationPermission {
  status: "default" | "granted" | "denied"
}

interface LowBalanceAlertOptions {
  threshold: number // kWh
  checkInterval?: number // ms
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission["status"]>("default")
  const [isSupported, setIsSupported] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setIsSupported(true)
      setPermission(Notification.permission as NotificationPermission["status"])
    }
  }, [])

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false
    
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === "granted"
    } catch (error) {
      console.error("Failed to request notification permission:", error)
      return false
    }
  }, [isSupported])

  const sendLocalNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (permission === "granted") {
      new Notification(title, {
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        ...options
      })
    }
  }, [permission])

  return {
    permission,
    isSupported,
    requestPermission,
    sendLocalNotification
  }
}

// Low balance alert hook
export function useLowBalanceAlert({ threshold, checkInterval = 30000 }: LowBalanceAlertOptions) {
  const { toast } = useToast()
  const [hasAlerted, setHasAlerted] = useState(false)
  const [currentBalance, setCurrentBalance] = useState(0)

  useEffect(() => {
    let mounted = true

    const checkBalance = async () => {
      try {
        const { data } = await supabase
          .from("wallets")
          .select("balance_kwh")
          .maybeSingle()

        if (data && mounted) {
          setCurrentBalance(data.balance_kwh)
          
          if (data.balance_kwh < threshold && !hasAlerted) {
            setHasAlerted(true)
            toast({
              title: "Low Balance Alert",
              description: `Your wallet balance is ${data.balance_kwh.toFixed(1)} kWh. Consider recharging soon.`,
              variant: "warning"
            })
          } else if (data.balance_kwh >= threshold) {
            setHasAlerted(false)
          }
        }
      } catch (error) {
        console.error("Failed to check balance:", error)
      }
    }

    checkBalance()
    const interval = setInterval(checkBalance, checkInterval)

    return () => {
      mounted = false
      clearInterval(interval)
    }
  }, [threshold, checkInterval, hasAlerted, toast])

  return { currentBalance, hasAlerted }
}

// In-app notifications hook
export function useInAppNotifications() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20)

        if (data) {
          setNotifications(data)
          setUnreadCount(data.filter(n => !n.read).length)
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error)
      }
    }

    fetchNotifications()

    // Subscribe to new notifications
    const channel = supabase
      .channel("notifications")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "notifications"
      }, (payload) => {
        setNotifications(prev => [payload.new, ...prev])
        setUnreadCount(prev => prev + 1)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId)

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Failed to mark notification as read:", error)
    }
  }, [])

  const markAllAsRead = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false)

      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error)
    }
  }, [])

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead
  }
}
