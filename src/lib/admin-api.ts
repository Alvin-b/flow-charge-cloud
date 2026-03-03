import { supabase } from "@/integrations/supabase/client";

const ADMIN_FUNCTION = "admin-api";

async function callAdmin<T = any>(action: string, params: Record<string, any> = {}): Promise<T> {
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
  const url = `https://${projectId}.supabase.co/functions/v1/${ADMIN_FUNCTION}?action=${action}`;

  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token || ""}`,
      "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || "Admin API error");
  }

  return res.json();
}

export const adminApi = {
  // Dashboard
  getDashboardStats: () => callAdmin("dashboard_stats"),

  // Users
  listUsers: (page = 1, limit = 50, search = "") =>
    callAdmin("list_users", { page, limit, search }),
  getUser: (userId: string) => callAdmin("get_user", { user_id: userId }),
  suspendUser: (userId: string) => callAdmin("suspend_user", { user_id: userId }),
  unsuspendUser: (userId: string) => callAdmin("unsuspend_user", { user_id: userId }),
  resetUserPin: (userId: string) => callAdmin("reset_user_pin", { user_id: userId }),
  adjustWallet: (userId: string, amountKwh: number, reason: string) =>
    callAdmin("adjust_wallet", { user_id: userId, amount_kwh: amountKwh, reason }),

  // Meters
  listMeters: (page = 1, limit = 50, search = "") =>
    callAdmin("list_meters", { page, limit, search }),
  getMeter: (meterId: string) => callAdmin("get_meter", { meter_id: meterId }),
  updateMeterStatus: (meterId: string, status: string) =>
    callAdmin("update_meter_status", { meter_id: meterId, status }),
  assignMeter: (meterId: string, userId: string) =>
    callAdmin("assign_meter", { meter_id: meterId, user_id: userId }),
  unassignMeter: (meterId: string) => callAdmin("unassign_meter", { meter_id: meterId }),
  registerMeter: (meterData: Record<string, any>) =>
    callAdmin("register_meter", meterData),

  // Transactions
  listTransactions: (page = 1, limit = 50, filters: Record<string, any> = {}) =>
    callAdmin("list_transactions", { page, limit, ...filters }),
  getTransactionSummary: (period: string) =>
    callAdmin("transaction_summary", { period }),

  // System Settings
  getSettings: () => callAdmin("get_settings"),
  updateSetting: (key: string, value: string) =>
    callAdmin("update_setting", { key, value }),

  // Notifications
  sendBroadcast: (title: string, body: string, type = "system") =>
    callAdmin("send_broadcast", { title, body, type }),

  // Activity Log
  getActivityLog: (page = 1, limit = 50) =>
    callAdmin("activity_log", { page, limit }),
};
