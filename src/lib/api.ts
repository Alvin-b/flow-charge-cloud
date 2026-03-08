import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

/**
 * Get the current user's auth token
 */
async function getAuthToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");
  return session.access_token;
}

/**
 * M-Pesa Payment API
 */
export const mpesaApi = {
  /**
   * Initiate M-Pesa STK Push for wallet recharge
   */
  async initiateSTKPush(phone: string, amountKES: number) {
    const token = await getAuthToken();
    const url = `${SUPABASE_URL}/functions/v1/mpesa-payment?action=initiate_stk_push`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ phone, amount_kes: amountKES }),
    });

    const data = await response.json();
    
    if (!response.ok || data.error) {
      throw new Error(data.error || "Failed to initiate payment");
    }

    return data;
  },

  /**
   * Check transaction status (DB lookup)
   */
  async checkStatus(transactionId: string) {
    const token = await getAuthToken();
    const url = `${SUPABASE_URL}/functions/v1/mpesa-payment?action=check_status&transaction_id=${transactionId}`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });

    const data = await response.json();
    
    if (!response.ok || data.error) {
      throw new Error(data.error || "Failed to check status");
    }

    return data;
  },

  /**
   * Query STK Push status directly from Safaricom
   */
  async querySTKStatus(checkoutRequestId: string) {
    const token = await getAuthToken();
    const url = `${SUPABASE_URL}/functions/v1/daraja-stk-query`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ checkout_request_id: checkoutRequestId }),
    });

    const data = await response.json();
    
    if (!response.ok || data.error) {
      throw new Error(data.error || "Failed to query STK status");
    }

    return data as {
      status: "completed" | "pending" | "failed" | "cancelled" | "timeout";
      result_code: number;
      result_desc: string;
      checkout_request_id: string;
    };
  },
};

/**
 * Meter API (physical 4G meters)
 */
export const meterApi = {
  /**
   * Connect to a meter by code (QR scan or manual entry)
   */
  async connect(meterCode: string, connectionType: "qr_scan" | "manual_code" = "manual_code") {
    const token = await getAuthToken();
    const url = `${SUPABASE_URL}/functions/v1/meter-connect?action=connect`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ meter_code: meterCode, connection_type: connectionType }),
    });

    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || "Failed to connect");
    return data;
  },

  /**
   * Disconnect from current meter
   */
  async disconnect(connectionId: string) {
    const token = await getAuthToken();
    const url = `${SUPABASE_URL}/functions/v1/meter-connect?action=disconnect`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ connection_id: connectionId }),
    });

    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || "Failed to disconnect");
    return data;
  },

  /**
   * Get active meter connection
   */
  async getActiveConnection() {
    const token = await getAuthToken();
    const url = `${SUPABASE_URL}/functions/v1/meter-connect?action=active`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });

    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || "Failed to fetch connection");
    return data;
  },

  /**
   * Get connection history
   */
  async getHistory() {
    const token = await getAuthToken();
    const url = `${SUPABASE_URL}/functions/v1/meter-connect?action=history`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });

    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || "Failed to fetch history");
    return data;
  },

  /**
   * Get consumption stats for the active connection
   */
  async getConsumptionStats() {
    const token = await getAuthToken();
    const url = `${SUPABASE_URL}/functions/v1/meter-connect?action=consumption_stats`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });

    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || "Failed to fetch stats");
    return data as {
      connected: boolean;
      total_consumed: number;
      rate_per_hour: number;
      wallet_balance: number;
      estimated_hours_remaining: number;
      estimated_days_remaining: number;
    };
  },
};

/**
 * P2P Transfer API
 */
export const transferApi = {
  /**
   * Send energy to another user by User ID
   */
  async send(recipientId: string, amountKwh: number) {
    const token = await getAuthToken();
    const url = `${SUPABASE_URL}/functions/v1/p2p-transfer?action=send`;
    
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ recipient_id: recipientId, amount_kwh: amountKwh }),
    });

    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || "Transfer failed");
    return data;
  },

  /**
   * Get daily transfer usage
   */
  async getDailyUsage() {
    const token = await getAuthToken();
    const url = `${SUPABASE_URL}/functions/v1/p2p-transfer?action=daily_usage`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });

    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || "Failed to get usage");
    return data as { used_today: number; daily_limit: number; remaining: number };
  },

  /**
   * Get transfer history
   */
  async getHistory() {
    const token = await getAuthToken();
    const url = `${SUPABASE_URL}/functions/v1/p2p-transfer?action=history`;
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      },
    });

    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || "Failed to get history");
    return data;
  },
};

/**
 * Consumption Stats API
 */
export const consumptionApi = {
  async getDaily() {
    const token = await getAuthToken();
    const url = `${SUPABASE_URL}/functions/v1/consumption-stats?action=daily`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || "Failed to fetch daily stats");
    return data.data as { day: string; date: string; kwh: number }[];
  },

  async getWeekly() {
    const token = await getAuthToken();
    const url = `${SUPABASE_URL}/functions/v1/consumption-stats?action=weekly`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || "Failed to fetch weekly stats");
    return data.data as { week: string; kwh: number }[];
  },

  async getMonthly() {
    const token = await getAuthToken();
    const url = `${SUPABASE_URL}/functions/v1/consumption-stats?action=monthly`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || "Failed to fetch monthly stats");
    return data.data as { month: string; kwh: number; cost: number }[];
  },

  async getHourly() {
    const token = await getAuthToken();
    const url = `${SUPABASE_URL}/functions/v1/consumption-stats?action=hourly`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || "Failed to fetch hourly stats");
    return data.data as { hr: string; kw: number }[];
  },

  async getSummary() {
    const token = await getAuthToken();
    const url = `${SUPABASE_URL}/functions/v1/consumption-stats?action=summary`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || "Failed to fetch summary");
    return data as {
      this_month: number;
      last_month: number;
      week_total: number;
      daily_avg: number;
      change_percent: number;
      peak_hour: string;
    };
  },
};

/**
 * Transaction API
 */
export const transactionApi = {
  /**
   * Get user's transaction history
   */
  async getTransactions(limit = 20) {
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data;
  },

  /**
   * Get transaction summary
   */
  async getSummary() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    // Get recent transactions summary directly
    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) throw error;

    const completed = (data || []).filter(t => t.status === "completed");
    return {
      total_recharges: completed.filter(t => t.type === "recharge").length,
      total_kwh: completed.reduce((sum, t) => sum + Number(t.amount_kwh), 0),
      total_kes: completed.reduce((sum, t) => sum + Number(t.amount_kes), 0),
    };
  },
};
