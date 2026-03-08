import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  if (!action) {
    return json({ error: "Missing action parameter" }, 400);
  }

  // ── Auth: verify JWT and check admin role ──
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Verify token and extract user ID
  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return json({ error: "Invalid token" }, 401);
  }

  const userId = claimsData.claims.sub as string;

  // Check admin role in user_roles table (falls back to is_admin on profiles)
  const { data: roleRow } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (!roleRow) {
    // Fallback: check legacy is_admin flag on profiles
    const { data: profileRow } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profileRow?.is_admin) {
      return json({ error: "Forbidden: admin role required" }, 403);
    }
  }

  let body: any = {};
  if (req.method === "POST") {
    try { body = await req.json(); } catch { body = {}; }
  }

  try {
    switch (action) {
      case "dashboard_stats":
        return json(await getDashboardStats(supabaseAdmin));
      case "list_users":
        return json(await listUsers(supabaseAdmin, body));
      case "get_user":
        return json(await getUser(supabaseAdmin, body.user_id));
      case "suspend_user":
        return json(await suspendUser(supabaseAdmin, body.user_id, true));
      case "unsuspend_user":
        return json(await suspendUser(supabaseAdmin, body.user_id, false));
      case "reset_user_pin":
        return json(await resetUserPin(supabaseAdmin, body.user_id));
      case "adjust_wallet":
        return json(await adjustWallet(supabaseAdmin, body));
      case "list_meters":
        return json(await listMeters(supabaseAdmin, body));
      case "get_meter":
        return json(await getMeter(supabaseAdmin, body.meter_id));
      case "update_meter_status":
        return json(await updateMeterStatus(supabaseAdmin, body));
      case "register_meter":
        return json(await registerMeter(supabaseAdmin, body));
      case "assign_meter":
        return json(await assignMeter(supabaseAdmin, body));
      case "unassign_meter":
        return json(await unassignMeter(supabaseAdmin, body.meter_id));
      case "list_transactions":
        return json(await listTransactions(supabaseAdmin, body));
      case "transaction_summary":
        return json(await transactionSummary(supabaseAdmin, body.period));
      case "get_settings":
        return json(await getSettings(supabaseAdmin));
      case "update_setting":
        return json(await updateSetting(supabaseAdmin, body));
      case "send_broadcast":
        return json(await sendBroadcast(supabaseAdmin, body));
      case "activity_log":
        return json(await activityLog(supabaseAdmin, body));
      case "list_wallets":
        return json(await listWallets(supabaseAdmin, body));
      case "list_meter_commands":
        return json(await listMeterCommands(supabaseAdmin, body));
      case "list_kplc_payments":
        return json(await listKplcPayments(supabaseAdmin, body));
      case "kplc_pool_status":
        return json(await kplcPoolStatus(supabaseAdmin));
      case "analytics_overview":
        return json(await analyticsOverview(supabaseAdmin, body));
      case "list_rate_limits":
        return json(await listRateLimits(supabaseAdmin, body));
      case "test_mqtt":
        return json(await testMqttConnection(supabaseAdmin));
      case "register_meters_bulk":
        return json(await registerMetersBulk(supabaseAdmin, body, userId));
      case "list_meter_registry":
        return json(await listMeterRegistry(supabaseAdmin, body));
      case "delete_registry_entry":
        return json(await deleteRegistryEntry(supabaseAdmin, body.id));
      default:
        return json({ error: `Unknown action: ${action}` }, 400);
    }
  } catch (err: any) {
    console.error(`[Admin API] Error in ${action}:`, err.message);
    return json({ error: err.message || "Internal error" }, 500);
  }
});

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Dashboard ───────────────────────────────────────────

async function getDashboardStats(sb: any) {
  const [
    { count: totalUsers },
    { count: activeMeters },
    { count: offlineMeters },
    { count: todayTxns },
    { count: pendingTxns },
    { data: recentTxns },
    { data: recentUsers },
    { data: walletAgg },
    { data: revenueAgg },
  ] = await Promise.all([
    sb.from("profiles").select("*", { count: "exact", head: true }),
    sb.from("meters").select("*", { count: "exact", head: true }).eq("status", "connected"),
    sb.from("meters").select("*", { count: "exact", head: true }).eq("status", "offline"),
    sb.from("transactions").select("*", { count: "exact", head: true })
      .gte("created_at", new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    sb.from("transactions").select("*", { count: "exact", head: true }).eq("status", "pending"),
    sb.from("transactions").select("*").order("created_at", { ascending: false }).limit(10),
    sb.from("profiles").select("user_id, full_name, phone, created_at").order("created_at", { ascending: false }).limit(10),
    sb.from("wallets").select("balance_kwh"),
    sb.from("transactions").select("amount_kes, amount_kwh").eq("status", "completed").eq("type", "recharge"),
  ]);

  const totalWalletBalance = (walletAgg || []).reduce((sum: number, w: any) => sum + (w.balance_kwh || 0), 0);
  const totalRevenue = (revenueAgg || []).reduce((sum: number, t: any) => sum + (t.amount_kes || 0), 0);
  const totalKwhSold = (revenueAgg || []).reduce((sum: number, t: any) => sum + (t.amount_kwh || 0), 0);

  return {
    total_users: totalUsers ?? 0,
    active_meters: activeMeters ?? 0,
    offline_meters: offlineMeters ?? 0,
    today_transactions: todayTxns ?? 0,
    pending_transactions: pendingTxns ?? 0,
    total_wallet_balance: totalWalletBalance,
    total_revenue: totalRevenue,
    total_kwh_sold: totalKwhSold,
    recent_transactions: recentTxns || [],
    recent_users: recentUsers || [],
  };
}

// ─── Users ───────────────────────────────────────────────

async function listUsers(sb: any, opts: any) {
  const { page = 1, limit = 50, search = "" } = opts;
  const offset = (page - 1) * limit;

  let query = sb.from("profiles").select("user_id, full_name, phone, email, created_at", { count: "exact" });

  if (search) {
    query = query.or(`full_name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
  }

  const { data: profiles, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Get wallet balances for these users
  const userIds = (profiles || []).map((p: any) => p.user_id);
  const { data: wallets } = userIds.length > 0
    ? await sb.from("wallets").select("user_id, balance_kwh").in("user_id", userIds)
    : { data: [] };

  const walletMap: Record<string, number> = {};
  (wallets || []).forEach((w: any) => { walletMap[w.user_id] = w.balance_kwh; });

  const users = (profiles || []).map((p: any) => ({
    ...p,
    balance_kwh: walletMap[p.user_id] ?? 0,
    suspended: false, // TODO: implement suspension tracking
  }));

  return { users, total: count ?? 0 };
}

async function getUser(sb: any, userId: string) {
  const [{ data: profile }, { data: wallet }, { data: meters }] = await Promise.all([
    sb.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    sb.from("wallets").select("*").eq("user_id", userId).maybeSingle(),
    sb.from("meters").select("*").eq("user_id", userId),
  ]);
  return { profile, wallet, meters };
}

async function suspendUser(sb: any, userId: string, suspend: boolean) {
  // Ban/unban via Supabase Auth admin API
  const { error } = await sb.auth.admin.updateUserById(userId, { ban_duration: suspend ? "876000h" : "none" });
  if (error) throw error;
  return { success: true, suspended: suspend };
}

async function resetUserPin(sb: any, userId: string) {
  const { error } = await sb.from("profiles").update({ pin_hash: null }).eq("user_id", userId);
  if (error) throw error;
  return { success: true };
}

async function adjustWallet(sb: any, opts: any) {
  const { user_id, amount_kwh, reason } = opts;
  if (!user_id || amount_kwh === undefined) throw new Error("Missing user_id or amount_kwh");

  if (amount_kwh > 0) {
    const { data, error } = await sb.rpc("credit_wallet", { p_user_id: user_id, p_amount_kwh: amount_kwh });
    if (error) throw error;
    return { success: true, new_balance: data };
  } else {
    const { data, error } = await sb.rpc("debit_wallet", { p_user_id: user_id, p_amount_kwh: Math.abs(amount_kwh) });
    if (error) throw error;
    return { success: true, new_balance: data };
  }
}

// ─── Meters ──────────────────────────────────────────────

async function listMeters(sb: any, opts: any) {
  const { page = 1, limit = 50, search = "" } = opts;
  const offset = (page - 1) * limit;

  let query = sb.from("meters").select("*", { count: "exact" });

  if (search) {
    query = query.or(`name.ilike.%${search}%,tuya_device_id.ilike.%${search}%,property_name.ilike.%${search}%`);
  }

  const { data, count } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  // Get owner names
  const userIds = [...new Set((data || []).map((m: any) => m.user_id).filter(Boolean))];
  const { data: profiles } = userIds.length > 0
    ? await sb.from("profiles").select("user_id, full_name").in("user_id", userIds)
    : { data: [] };

  const nameMap: Record<string, string> = {};
  (profiles || []).forEach((p: any) => { nameMap[p.user_id] = p.full_name; });

  const meters = (data || []).map((m: any) => ({
    ...m,
    owner_name: nameMap[m.user_id] || null,
  }));

  return { meters, total: count ?? 0 };
}

async function getMeter(sb: any, meterId: string) {
  const { data, error } = await sb.from("meters").select("*").eq("id", meterId).maybeSingle();
  if (error) throw error;
  return { meter: data };
}

async function updateMeterStatus(sb: any, opts: any) {
  const { meter_id, status } = opts;
  const validStatuses = ["available", "connected", "offline", "maintenance"];
  if (!validStatuses.includes(status)) throw new Error(`Invalid status: ${status}`);

  const { error } = await sb.from("meters").update({ status }).eq("id", meter_id);
  if (error) throw error;
  return { success: true };
}

async function registerMeter(sb: any, data: any) {
  const { name, tuya_device_id, property_name, mqtt_meter_id } = data;
  if (!name) throw new Error("Name required");
  if (!mqtt_meter_id && !tuya_device_id) throw new Error("MQTT Meter ID or Device ID required");

  const { data: meter, error } = await sb.from("meters").insert({
    name,
    tuya_device_id: tuya_device_id || mqtt_meter_id || "pending",
    mqtt_meter_id: mqtt_meter_id || null,
    property_name: property_name || null,
    status: "available",
    user_id: "00000000-0000-0000-0000-000000000000",
  }).select().single();
  if (error) throw error;
  return { success: true, meter };
}

async function assignMeter(sb: any, opts: any) {
  const { meter_id, user_id } = opts;
  const { error } = await sb.from("meters").update({ user_id, status: "connected" }).eq("id", meter_id);
  if (error) throw error;
  return { success: true };
}

async function unassignMeter(sb: any, meterId: string) {
  const { error } = await sb.from("meters").update({
    user_id: "00000000-0000-0000-0000-000000000000",
    status: "available",
  }).eq("id", meterId);
  if (error) throw error;
  return { success: true };
}

// ─── Transactions ────────────────────────────────────────

async function listTransactions(sb: any, opts: any) {
  const { page = 1, limit = 50, search, type, status } = opts;
  const offset = (page - 1) * limit;

  let query = sb.from("transactions").select("*", { count: "exact" });

  if (type) query = query.eq("type", type);
  if (status) query = query.eq("status", status);
  if (search) {
    query = query.or(`phone_number.ilike.%${search}%,mpesa_receipt_number.ilike.%${search}%`);
  }

  const { data, count } = await query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  return { transactions: data || [], total: count ?? 0 };
}

async function transactionSummary(sb: any, period: string) {
  // Simple aggregation — completed recharges
  const { data } = await sb.from("transactions")
    .select("amount_kes, amount_kwh, type, status")
    .eq("status", "completed");

  const summary = {
    total_recharges_kes: 0,
    total_recharges_kwh: 0,
    total_transfers_kwh: 0,
    count_recharges: 0,
    count_transfers: 0,
  };

  (data || []).forEach((t: any) => {
    if (t.type === "recharge") {
      summary.total_recharges_kes += t.amount_kes;
      summary.total_recharges_kwh += t.amount_kwh;
      summary.count_recharges++;
    } else if (t.type === "transfer_out") {
      summary.total_transfers_kwh += t.amount_kwh;
      summary.count_transfers++;
    }
  });

  return summary;
}

// ─── Settings ────────────────────────────────────────────

async function getSettings(sb: any) {
  const { data, error } = await sb.from("system_settings").select("*");
  if (error) {
    // Table may not exist yet
    console.warn("system_settings not found:", error.message);
    return { settings: [] };
  }
  return { settings: data || [] };
}

async function updateSetting(sb: any, opts: any) {
  const { key, value } = opts;
  if (!key) throw new Error("Setting key required");

  const { error } = await sb.from("system_settings")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw error;
  return { success: true };
}

// ─── Broadcast Notifications ─────────────────────────────

async function sendBroadcast(sb: any, opts: any) {
  const { title, body, type = "system" } = opts;
  if (!title || !body) throw new Error("Title and body required");

  // Get all user IDs
  const { data: profiles } = await sb.from("profiles").select("user_id");
  if (!profiles?.length) return { success: true, sent: 0 };

  const notifications = profiles.map((p: any) => ({
    user_id: p.user_id,
    type,
    title,
    body,
  }));

  // Insert in batches of 100
  for (let i = 0; i < notifications.length; i += 100) {
    const batch = notifications.slice(i, i + 100);
    await sb.from("notifications").insert(batch);
  }

  return { success: true, sent: notifications.length };
}

// ─── Activity Log ────────────────────────────────────────

async function activityLog(sb: any, opts: any) {
  const { page = 1, limit = 50 } = opts;
  const offset = (page - 1) * limit;

  // Use recent transactions as a proxy for activity log
  const { data, count } = await sb.from("transactions")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return { activities: data || [], total: count ?? 0 };
}

// ─── Wallets ─────────────────────────────────────────────

async function listWallets(sb: any, opts: any) {
  const { page = 1, limit = 50, search = "" } = opts;
  const offset = (page - 1) * limit;

  // Get all wallets with count
  const { data: wallets, count } = await sb.from("wallets")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Get profile names for wallet owners
  const userIds = (wallets || []).map((w: any) => w.user_id);
  const { data: profiles } = userIds.length > 0
    ? await sb.from("profiles").select("user_id, full_name, phone, email").in("user_id", userIds)
    : { data: [] };

  const profileMap: Record<string, any> = {};
  (profiles || []).forEach((p: any) => { profileMap[p.user_id] = p; });

  // Get aggregate stats
  const { data: allWallets } = await sb.from("wallets").select("balance_kwh");
  const totalBalance = (allWallets || []).reduce((s: number, w: any) => s + (w.balance_kwh || 0), 0);
  const activeCount = (allWallets || []).filter((w: any) => w.balance_kwh > 0).length;
  const zeroCount = (allWallets || []).filter((w: any) => w.balance_kwh <= 0).length;

  // Filter by search if provided (search by owner name/phone/email)
  let enriched = (wallets || []).map((w: any) => ({
    ...w,
    owner_name: profileMap[w.user_id]?.full_name || null,
    owner_phone: profileMap[w.user_id]?.phone || null,
    owner_email: profileMap[w.user_id]?.email || null,
  }));

  if (search) {
    const q = search.toLowerCase();
    enriched = enriched.filter((w: any) =>
      (w.owner_name || "").toLowerCase().includes(q) ||
      (w.owner_phone || "").toLowerCase().includes(q) ||
      (w.owner_email || "").toLowerCase().includes(q)
    );
  }

  return {
    wallets: enriched,
    total: count ?? 0,
    stats: {
      total_balance: totalBalance,
      total_wallets: (allWallets || []).length,
      active_wallets: activeCount,
      zero_wallets: zeroCount,
    },
  };
}

// ─── Meter Commands ──────────────────────────────────────

async function listMeterCommands(sb: any, opts: any) {
  const { page = 1, limit = 50, search = "" } = opts;
  const offset = (page - 1) * limit;

  let query = sb.from("meter_commands").select("*", { count: "exact" });
  if (search) {
    query = query.or(`command_type.ilike.%${search}%,status.ilike.%${search}%`);
  }

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Get meter names
  const meterIds = [...new Set((data || []).map((c: any) => c.meter_id).filter(Boolean))];
  const { data: meters } = meterIds.length > 0
    ? await sb.from("meters").select("id, name, mqtt_meter_id").in("id", meterIds)
    : { data: [] };

  const meterMap: Record<string, any> = {};
  (meters || []).forEach((m: any) => { meterMap[m.id] = m; });

  const commands = (data || []).map((c: any) => ({
    ...c,
    meter_name: meterMap[c.meter_id]?.name || null,
    mqtt_meter_id: meterMap[c.meter_id]?.mqtt_meter_id || null,
  }));

  return { commands, total: count ?? 0 };
}

// ─── KPLC Payments ───────────────────────────────────────

async function listKplcPayments(sb: any, opts: any) {
  const { page = 1, limit = 50 } = opts;
  const offset = (page - 1) * limit;

  const { data, count } = await sb.from("kplc_payments")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  return { payments: data || [], total: count ?? 0 };
}

async function kplcPoolStatus(sb: any) {
  // Unforwarded pool
  const { data: poolRows } = await sb.from("payment_splits")
    .select("kplc_amount_kes, commission_amount_kes")
    .eq("forwarded", false);

  const poolBalance = (poolRows || []).reduce((s: number, r: any) => s + (r.kplc_amount_kes || 0), 0);
  const pendingCommission = (poolRows || []).reduce((s: number, r: any) => s + (r.commission_amount_kes || 0), 0);

  // Total forwarded
  const { data: fwdRows } = await sb.from("payment_splits")
    .select("kplc_amount_kes, commission_amount_kes")
    .eq("forwarded", true);

  const totalForwarded = (fwdRows || []).reduce((s: number, r: any) => s + (r.kplc_amount_kes || 0), 0);
  const totalCommission = (fwdRows || []).reduce((s: number, r: any) => s + (r.commission_amount_kes || 0), 0)
    + pendingCommission;

  // Settings
  const { data: settings } = await sb.from("system_settings")
    .select("key, value")
    .in("key", ["kplc_min_payment", "commission_percent", "kplc_paybill", "kplc_account_number"]);

  const settingsMap: Record<string, string> = {};
  (settings || []).forEach((s: any) => { settingsMap[s.key] = s.value; });

  // Recent KPLC payments
  const { data: recentPayments } = await sb.from("kplc_payments")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  return {
    pool_balance_kes: poolBalance,
    pending_splits: (poolRows || []).length,
    total_forwarded_kes: totalForwarded,
    total_commission_kes: totalCommission,
    min_payment: parseFloat(settingsMap.kplc_min_payment || "25"),
    commission_percent: parseFloat(settingsMap.commission_percent || "10"),
    kplc_paybill: settingsMap.kplc_paybill || "888880",
    kplc_account: settingsMap.kplc_account_number || "",
    recent_payments: recentPayments || [],
  };
}

// ─── Analytics Overview ──────────────────────────────────

async function analyticsOverview(sb: any, opts: any) {
  const { period = "30d" } = opts;
  const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
  const since = new Date(Date.now() - days * 86400000).toISOString();

  // Transactions in period
  const { data: txns } = await sb.from("transactions")
    .select("amount_kes, amount_kwh, type, status, created_at")
    .gte("created_at", since);

  const completed = (txns || []).filter((t: any) => t.status === "completed");
  const recharges = completed.filter((t: any) => t.type === "recharge");
  const transfers = completed.filter((t: any) => t.type === "transfer_out");

  // Daily breakdown
  const dailyMap: Record<string, { revenue: number; kwh: number; count: number }> = {};
  recharges.forEach((t: any) => {
    const day = t.created_at.slice(0, 10);
    if (!dailyMap[day]) dailyMap[day] = { revenue: 0, kwh: 0, count: 0 };
    dailyMap[day].revenue += t.amount_kes || 0;
    dailyMap[day].kwh += t.amount_kwh || 0;
    dailyMap[day].count++;
  });

  const dailyData = Object.entries(dailyMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({ date, ...d }));

  // New users in period
  const { count: newUsers } = await sb.from("profiles")
    .select("*", { count: "exact", head: true })
    .gte("created_at", since);

  return {
    period: days,
    total_revenue_kes: recharges.reduce((s: number, t: any) => s + (t.amount_kes || 0), 0),
    total_kwh_sold: recharges.reduce((s: number, t: any) => s + (t.amount_kwh || 0), 0),
    total_recharges: recharges.length,
    total_transfers: transfers.length,
    total_transactions: (txns || []).length,
    failed_transactions: (txns || []).filter((t: any) => t.status === "failed").length,
    new_users: newUsers ?? 0,
    daily: dailyData,
  };
}

// ─── Rate Limits / Security ──────────────────────────────

async function listRateLimits(sb: any, opts: any) {
  const { page = 1, limit = 50 } = opts;
  const offset = (page - 1) * limit;

  const { data, count } = await sb.from("rate_limit_events")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Get user names
  const userIds = [...new Set((data || []).map((e: any) => e.user_id).filter(Boolean))];
  const { data: profiles } = userIds.length > 0
    ? await sb.from("profiles").select("user_id, full_name, phone").in("user_id", userIds)
    : { data: [] };

  const nameMap: Record<string, any> = {};
  (profiles || []).forEach((p: any) => { nameMap[p.user_id] = p; });

  const events = (data || []).map((e: any) => ({
    ...e,
    user_name: nameMap[e.user_id]?.full_name || null,
    user_phone: nameMap[e.user_id]?.phone || null,
  }));

  // Count by action
  const { data: allEvents } = await sb.from("rate_limit_events")
    .select("action")
    .gte("created_at", new Date(Date.now() - 3600000).toISOString());

  const actionCounts: Record<string, number> = {};
  (allEvents || []).forEach((e: any) => {
    actionCounts[e.action] = (actionCounts[e.action] || 0) + 1;
  });

  // User roles summary
  const { data: roles } = await sb.from("user_roles").select("role");
  const roleCounts: Record<string, number> = {};
  (roles || []).forEach((r: any) => {
    roleCounts[r.role] = (roleCounts[r.role] || 0) + 1;
  });

  return {
    events,
    total: count ?? 0,
    hourly_action_counts: actionCounts,
    role_counts: roleCounts,
  };
}

// ─── MQTT Connection Test ────────────────────────────────

async function testMqttConnection(sb: any) {
  // Try to reach EMQX HTTP API
  const apiUrl = Deno.env.get("MQTT_HTTP_API_URL");
  const apiKey = Deno.env.get("MQTT_HTTP_API_KEY");

  if (!apiUrl || !apiKey) {
    // Fallback: check system_settings
    const { data: settings } = await sb.from("system_settings")
      .select("key, value")
      .in("key", ["mqtt_broker_host", "mqtt_dashboard_port"]);

    const map: Record<string, string> = {};
    (settings || []).forEach((s: any) => { map[s.key] = s.value; });

    if (!map.mqtt_broker_host) {
      return { connected: false, error: "MQTT_HTTP_API_URL secret not set and no broker host configured in settings" };
    }

    const port = map.mqtt_dashboard_port || "18083";
    const testUrl = `http://${map.mqtt_broker_host}:${port}/api/v5/status`;

    try {
      const res = await fetch(testUrl, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        return {
          connected: true,
          version: data.rel_vsn || data.version || "unknown",
          nodes: data.node_name ? 1 : (data.running_nodes || 1),
        };
      }
      return { connected: false, error: `HTTP ${res.status}: ${res.statusText}` };
    } catch (e: any) {
      return { connected: false, error: e.message || "Network error" };
    }
  }

  // Use configured API URL
  const statusUrl = apiUrl.replace(/\/api\/v5\/?$/, "/api/v5/status").replace(/\/$/, "");
  const finalUrl = statusUrl.includes("/status") ? statusUrl : `${apiUrl.replace(/\/$/, "")}/status`;

  try {
    const res = await fetch(finalUrl, {
      headers: { "Authorization": `Basic ${apiKey}` },
      signal: AbortSignal.timeout(8000),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        connected: true,
        version: data.rel_vsn || data.version || "unknown",
        nodes: data.node_name ? 1 : (data.running_nodes || 1),
      };
    }

    // Try without auth (status endpoint is often public)
    const res2 = await fetch(finalUrl, { signal: AbortSignal.timeout(5000) });
    if (res2.ok) {
      const data = await res2.json().catch(() => ({}));
      return { connected: true, version: data.rel_vsn || "unknown", nodes: 1 };
    }

    return { connected: false, error: `HTTP ${res.status}: ${res.statusText}` };
  } catch (e: any) {
    return { connected: false, error: e.message || "Network error reaching broker" };
  }
}
