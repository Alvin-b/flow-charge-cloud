import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// M-Pesa B2B Configuration (env variables)
const MPESA_CONSUMER_KEY = Deno.env.get("MPESA_CONSUMER_KEY")!;
const MPESA_CONSUMER_SECRET = Deno.env.get("MPESA_CONSUMER_SECRET")!;
const MPESA_SHORTCODE = Deno.env.get("MPESA_SHORTCODE")!;
const MPESA_B2B_INITIATOR_NAME = Deno.env.get("MPESA_B2B_INITIATOR_NAME") || "";
const MPESA_B2B_SECURITY_CREDENTIAL = Deno.env.get("MPESA_B2B_SECURITY_CREDENTIAL") || "";
const MPESA_B2B_RESULT_URL = Deno.env.get("MPESA_B2B_RESULT_URL") || "";
const MPESA_B2B_TIMEOUT_URL = Deno.env.get("MPESA_B2B_TIMEOUT_URL") || "";

const MPESA_BASE_URL = "https://api.safaricom.co.ke";

// Get M-Pesa OAuth access token
async function getMpesaAccessToken(): Promise<string> {
  const auth = btoa(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`);
  const response = await fetch(
    `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );
  if (!response.ok) {
    throw new Error(`Failed to get M-Pesa token: ${response.statusText}`);
  }
  const data = await response.json();
  return data.access_token;
}

// Get a system setting from DB
async function getSetting(supabase: any, key: string): Promise<string> {
  const { data } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", key)
    .single();
  return data?.value || "";
}

// Get multiple settings
async function getSettings(supabase: any, keys: string[]): Promise<Record<string, string>> {
  const { data } = await supabase
    .from("system_settings")
    .select("key, value")
    .in("key", keys);
  const result: Record<string, string> = {};
  for (const row of data || []) {
    result[row.key] = row.value;
  }
  return result;
}

// Initiate B2B payment to KPLC
async function initiateB2BPayment(
  supabase: any,
  amount: number,
  paybill: string,
  accountNumber: string,
  initiatorName: string,
  securityCredential: string
) {
  const accessToken = await getMpesaAccessToken();

  // Round down to whole KES (M-Pesa B2B requires integer amounts)
  const roundedAmount = Math.floor(amount);
  if (roundedAmount < 1) {
    throw new Error("Amount too small for B2B payment");
  }

  // Create kplc_payments record
  const { data: kplcPayment, error: createErr } = await supabase
    .from("kplc_payments")
    .insert({
      amount_kes: roundedAmount,
      kplc_paybill: paybill,
      kplc_account_number: accountNumber,
      status: "pending",
      metadata: { initiated_by: "pool_processor" },
    })
    .select()
    .single();

  if (createErr || !kplcPayment) {
    throw new Error(`Failed to create kplc_payment: ${createErr?.message}`);
  }

  // Mark all unforwarded splits as part of this payment
  const { data: splits, error: splitErr } = await supabase
    .from("payment_splits")
    .update({
      forwarded: true,
      kplc_payment_id: kplcPayment.id,
    })
    .eq("forwarded", false)
    .select("id");

  if (splitErr) {
    console.error("Failed to mark splits:", splitErr);
  }

  const splitsCount = splits?.length || 0;

  // Update splits count
  await supabase
    .from("kplc_payments")
    .update({ splits_count: splitsCount })
    .eq("id", kplcPayment.id);

  // Use env vars if DB settings are empty
  const finalInitiator = initiatorName || MPESA_B2B_INITIATOR_NAME;
  const finalCredential = securityCredential || MPESA_B2B_SECURITY_CREDENTIAL;
  const resultUrl = MPESA_B2B_RESULT_URL;
  const timeoutUrl = MPESA_B2B_TIMEOUT_URL;

  if (!finalInitiator || !finalCredential || !resultUrl) {
    // B2B not configured yet — keep the payment pending for manual processing
    console.warn("B2B credentials not configured. Payment queued for manual processing.");
    await supabase
      .from("kplc_payments")
      .update({
        status: "pending",
        result_desc: "B2B credentials not configured. Queued for manual processing.",
      })
      .eq("id", kplcPayment.id);
    return { queued: true, kplc_payment_id: kplcPayment.id, amount: roundedAmount };
  }

  // Call Safaricom B2B API
  const b2bPayload = {
    Initiator: finalInitiator,
    SecurityCredential: finalCredential,
    CommandID: "BusinessPayBill",
    SenderIdentifierType: "4",
    RecieverIdentifierType: "4",
    Amount: roundedAmount,
    PartyA: MPESA_SHORTCODE,
    PartyB: paybill,
    AccountReference: accountNumber,
    Remarks: `KPLC top-up ${roundedAmount} KES`,
    QueueTimeOutURL: timeoutUrl || resultUrl,
    ResultURL: resultUrl,
  };

  console.log("Initiating B2B payment:", JSON.stringify({
    amount: roundedAmount,
    paybill,
    account: accountNumber,
    splits: splitsCount,
  }));

  const b2bResponse = await fetch(
    `${MPESA_BASE_URL}/mpesa/b2b/v1/paymentrequest`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(b2bPayload),
    }
  );

  const b2bData = await b2bResponse.json();

  if (b2bData.ResponseCode === "0") {
    // B2B request accepted — update with conversation IDs
    await supabase
      .from("kplc_payments")
      .update({
        mpesa_conversation_id: b2bData.ConversationID,
        mpesa_originator_conversation_id: b2bData.OriginatorConversationID,
      })
      .eq("id", kplcPayment.id);

    console.log(`✅ B2B payment initiated: ${roundedAmount} KES to ${paybill} (${accountNumber})`);

    return {
      success: true,
      kplc_payment_id: kplcPayment.id,
      conversation_id: b2bData.ConversationID,
      amount: roundedAmount,
      splits: splitsCount,
    };
  } else {
    // B2B request failed — unmark splits so they re-enter pool
    console.error("B2B API error:", b2bData);

    await supabase
      .from("kplc_payments")
      .update({
        status: "failed",
        result_code: parseInt(b2bData.ResponseCode || "-1"),
        result_desc: b2bData.ResponseDescription || b2bData.errorMessage || "B2B request failed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", kplcPayment.id);

    // Unmark splits — return them to the pool
    await supabase
      .from("payment_splits")
      .update({ forwarded: false, kplc_payment_id: null })
      .eq("kplc_payment_id", kplcPayment.id);

    throw new Error(b2bData.ResponseDescription || b2bData.errorMessage || "B2B payment failed");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Service role client for all actions
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ─── PROCESS POOL ───────────────────────────────────────
    // Called by cron or inline from mpesa-payment callback
    if (action === "process_pool") {
      // Check if there's already a pending B2B payment (avoid double-sending)
      const { data: pendingPayments } = await supabase
        .from("kplc_payments")
        .select("id")
        .eq("status", "pending")
        .not("mpesa_conversation_id", "is", null);

      if (pendingPayments && pendingPayments.length > 0) {
        return new Response(
          JSON.stringify({
            skipped: true,
            reason: "A B2B payment is already pending",
            pending_count: pendingPayments.length,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get pool balance
      const { data: poolData } = await supabase.rpc("get_kplc_pool_balance");
      const poolBalance = parseFloat(poolData || "0");

      // Get minimum threshold
      const minPayment = parseFloat(await getSetting(supabase, "kplc_min_payment") || "25");

      if (poolBalance < minPayment) {
        return new Response(
          JSON.stringify({
            queued: true,
            pool_balance: poolBalance,
            threshold: minPayment,
            message: `Pool KES ${poolBalance.toFixed(2)} is below threshold KES ${minPayment}`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get B2B settings
      const settings = await getSettings(supabase, [
        "kplc_paybill",
        "kplc_account_number",
        "b2b_initiator_name",
      ]);

      if (!settings.kplc_account_number) {
        return new Response(
          JSON.stringify({
            error: "KPLC account number not configured. Set it in system_settings.",
            pool_balance: poolBalance,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await initiateB2BPayment(
        supabase,
        poolBalance,
        settings.kplc_paybill || "888880",
        settings.kplc_account_number,
        settings.b2b_initiator_name || "",
        "" // security credential from env
      );

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── B2B CALLBACK ───────────────────────────────────────
    // Called by Safaricom after B2B payment completes
    if (action === "b2b_callback" && req.method === "POST") {
      const body = await req.json();
      console.log("B2B Callback received:", {
        conversationId: body.Result?.ConversationID?.substring(0, 8) + "...",
        resultCode: body.Result?.ResultCode,
        timestamp: new Date().toISOString(),
      });

      const result = body.Result;
      if (!result) {
        return new Response(
          JSON.stringify({ error: "Invalid callback format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const conversationId = result.ConversationID;
      const resultCode = result.ResultCode;
      const resultDesc = result.ResultDesc;
      const transactionId = result.TransactionID;

      // Find the kplc_payment by conversation ID
      const { data: kplcPayment, error: findErr } = await supabase
        .from("kplc_payments")
        .select("*")
        .eq("mpesa_conversation_id", conversationId)
        .single();

      if (findErr || !kplcPayment) {
        // Try originator conversation ID
        const { data: kplcPayment2 } = await supabase
          .from("kplc_payments")
          .select("*")
          .eq("mpesa_originator_conversation_id", result.OriginatorConversationID)
          .single();

        if (!kplcPayment2) {
          console.error("KPLC payment not found for conversation:", conversationId);
          return new Response(
            JSON.stringify({ error: "Payment not found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      const paymentId = kplcPayment?.id || null;

      if (resultCode === 0) {
        // Success — mark payment as completed
        await supabase
          .from("kplc_payments")
          .update({
            status: "completed",
            result_code: resultCode,
            result_desc: resultDesc,
            mpesa_transaction_id: transactionId,
            completed_at: new Date().toISOString(),
            metadata: {
              ...(kplcPayment?.metadata || {}),
              callback_received_at: new Date().toISOString(),
              result_parameters: result.ResultParameters,
            },
          })
          .eq("id", paymentId);

        console.log(`✅ KPLC B2B payment completed: ${kplcPayment?.amount_kes} KES (${transactionId})`);
      } else {
        // Failure — mark payment as failed, unmark splits
        await supabase
          .from("kplc_payments")
          .update({
            status: "failed",
            result_code: resultCode,
            result_desc: resultDesc,
            completed_at: new Date().toISOString(),
          })
          .eq("id", paymentId);

        // Return splits to the pool for retry
        await supabase
          .from("payment_splits")
          .update({ forwarded: false, kplc_payment_id: null })
          .eq("kplc_payment_id", paymentId);

        console.log(`❌ KPLC B2B payment failed: ${resultDesc} (code ${resultCode})`);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── B2B TIMEOUT ────────────────────────────────────────
    if (action === "b2b_timeout" && req.method === "POST") {
      const body = await req.json();
      console.log("B2B Timeout received:", {
        conversationId: body.Result?.ConversationID?.substring(0, 8) + "...",
        timestamp: new Date().toISOString(),
      });

      const result = body.Result;
      if (result?.ConversationID) {
        await supabase
          .from("kplc_payments")
          .update({
            status: "timeout",
            result_desc: "Transaction timed out",
            completed_at: new Date().toISOString(),
          })
          .eq("mpesa_conversation_id", result.ConversationID);

        // Return splits to pool
        const { data: payment } = await supabase
          .from("kplc_payments")
          .select("id")
          .eq("mpesa_conversation_id", result.ConversationID)
          .single();

        if (payment) {
          await supabase
            .from("payment_splits")
            .update({ forwarded: false, kplc_payment_id: null })
            .eq("kplc_payment_id", payment.id);
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── POOL STATUS (admin) ────────────────────────────────
    if (action === "pool_status") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate JWT and check admin role
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } }
      );
      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: userErr } = await userClient.auth.getUser(token);
      if (userErr || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!roleData) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Pool balance
      const { data: poolData } = await supabase.rpc("get_kplc_pool_balance");
      const poolBalance = parseFloat(poolData || "0");

      // Unforwarded splits count
      const { count: pendingSplits } = await supabase
        .from("payment_splits")
        .select("id", { count: "exact", head: true })
        .eq("forwarded", false);

      // Recent KPLC payments
      const { data: recentPayments } = await supabase
        .from("kplc_payments")
        .select("*")
        .order("initiated_at", { ascending: false })
        .limit(10);

      // Total commission earned
      const { data: commissionData } = await supabase
        .from("payment_splits")
        .select("commission_amount_kes");
      const totalCommission = (commissionData || []).reduce(
        (sum: number, r: any) => sum + parseFloat(r.commission_amount_kes || "0"),
        0
      );

      // Total forwarded to KPLC
      const { data: forwardedData } = await supabase
        .from("kplc_payments")
        .select("amount_kes")
        .eq("status", "completed");
      const totalForwarded = (forwardedData || []).reduce(
        (sum: number, r: any) => sum + parseFloat(r.amount_kes || "0"),
        0
      );

      // Get settings
      const settings = await getSettings(supabase, [
        "commission_percent",
        "kplc_paybill",
        "kplc_account_number",
        "kplc_min_payment",
        "resale_rate_kes_per_kwh",
      ]);

      return new Response(
        JSON.stringify({
          pool_balance: poolBalance,
          pending_splits: pendingSplits || 0,
          total_commission_earned: parseFloat(totalCommission.toFixed(2)),
          total_forwarded_to_kplc: parseFloat(totalForwarded.toFixed(2)),
          recent_kplc_payments: recentPayments || [],
          settings,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── UPDATE SETTINGS (admin) ────────────────────────────
    if (action === "update_settings" && req.method === "POST") {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const body = await req.json();
      const allowedKeys = [
        "commission_percent",
        "kplc_paybill",
        "kplc_account_number",
        "kplc_min_payment",
        "resale_rate_kes_per_kwh",
        "b2b_initiator_name",
      ];

      const updates: { key: string; value: string }[] = [];
      for (const [key, value] of Object.entries(body)) {
        if (allowedKeys.includes(key) && typeof value === "string") {
          updates.push({ key, value });
        }
      }

      if (updates.length === 0) {
        return new Response(
          JSON.stringify({ error: "No valid settings to update" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      for (const { key, value } of updates) {
        await supabase
          .from("system_settings")
          .update({ value })
          .eq("key", key);
      }

      return new Response(
        JSON.stringify({ success: true, updated: updates.map((u) => u.key) }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: process_pool, b2b_callback, b2b_timeout, pool_status, update_settings" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("KPLC B2B error:", err);
    const msg = err instanceof Error ? err.message : "Server error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
