import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface Wallet { balance_kwh: number; max_kwh: number; }
export interface Transaction { id: string; type: string; amount_kwh: number; amount_kes: number; status: string; created_at: string; metadata: any; }

export interface HomeData {
  wallet: Wallet;
  recentTxs: Transaction[];
  meterCount: number;
  unreadCount: number;
  balance: number;
  max: number;
  pct: number;
  isLow: boolean;
  firstName: string;
  greeting: string;
  navigate: ReturnType<typeof useNavigate>;
  profile: any;
}

export function useHomeData() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [recentTxs, setRecentTxs] = useState<Transaction[]>([]);
  const [meterCount, setMeterCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    let mounted = true;
    const fetchData = async () => {
      try {
        const [walletRes, txRes, notifRes, metersRes] = await Promise.all([
          supabase.from("wallets").select("balance_kwh, max_kwh").maybeSingle(),
          supabase.from("transactions").select("id, type, amount_kwh, amount_kes, status, created_at, metadata").order("created_at", { ascending: false }).limit(5),
          supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false),
          supabase.from("meters").select("id", { count: "exact", head: true }),
        ]);
        if (!mounted) return;
        setWallet(walletRes.data ?? { balance_kwh: 0, max_kwh: 200 });
        setRecentTxs((txRes.data as Transaction[]) ?? []);
        setUnreadCount(notifRes.count ?? 0);
        setMeterCount(metersRes.count ?? 0);
      } catch (err) {
        console.error("Home fetch error:", err);
        if (mounted) setWallet(prev => prev ?? { balance_kwh: 0, max_kwh: 200 });
      } finally {
        if (mounted) setDataLoading(false);
      }
    };
    fetchData();

    const channel = supabase
      .channel("home-wallet")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "wallets" }, (payload) => {
        if (mounted) setWallet({ balance_kwh: payload.new.balance_kwh, max_kwh: payload.new.max_kwh });
      })
      .subscribe();

    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [authLoading, user]);

  const balance = wallet?.balance_kwh ?? 0;
  const max = wallet?.max_kwh ?? 200;
  const pct = max > 0 ? Math.min(100, Math.round((balance / max) * 100)) : 0;
  const isLow = pct < 20;
  const firstName = profile?.full_name?.split(" ")[0] || "User";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const loading = authLoading || dataLoading;

  return {
    loading,
    data: {
      wallet: wallet ?? { balance_kwh: 0, max_kwh: 200 },
      recentTxs,
      meterCount,
      unreadCount,
      balance,
      max,
      pct,
      isLow,
      firstName,
      greeting,
      navigate,
      profile,
    } as HomeData,
  };
}

export const getTimeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};
