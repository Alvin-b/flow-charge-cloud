import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// M-Pesa Configuration — uses DARAJA_ secret names
const MPESA_CONSUMER_KEY = Deno.env.get("DARAJA_CONSUMER_KEY")!;
const MPESA_CONSUMER_SECRET = Deno.env.get("DARAJA_CONSUMER_SECRET")!;
const MPESA_SHORTCODE = Deno.env.get("DARAJA_SHORTCODE")!;
const MPESA_PASSKEY = Deno.env.get("DARAJA_PASSKEY")!;

// Production API
const MPESA_BASE_URL = "https://api.safaricom.co.ke";

// Result code descriptions
const RESULT_CODES: Record<number, string> = {
  0: "Transaction successful",
  1: "Insufficient balance",
  1032: "Transaction cancelled by user",
  1037: "Timeout - Phone unreachable",
  1025: "Transaction timed out",
  1019: "Transaction expired",
  2001: "Wrong PIN entered",
  1001: "Unable to lock subscriber",
};

// Get M-Pesa OAuth access token
async function getMpesaAccessToken(): Promise<string> {
  const auth = btoa(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`);

  const response = await fetch(
    `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization: `Basic ${auth}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get M-Pesa token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Generate M-Pesa password
function generateMpesaPassword(timestamp: string): string {
  const str = `${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`;
  return btoa(str);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Require authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get CheckoutRequestID from request
    const body = await req.json();
    const { checkout_request_id } = body;

    if (!checkout_request_id) {
      return new Response(
        JSON.stringify({ error: "checkout_request_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get OAuth token
    const accessToken = await getMpesaAccessToken();

    // Generate timestamp and password
    const timestamp = new Date()
      .toISOString()
      .replace(/[^0-9]/g, "")
      .slice(0, 14);
    const password = generateMpesaPassword(timestamp);

    // Query STK Push status
    const queryResponse = await fetch(
      `${MPESA_BASE_URL}/mpesa/stkpushquery/v1/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          BusinessShortCode: MPESA_SHORTCODE,
          Password: password,
          Timestamp: timestamp,
          CheckoutRequestID: checkout_request_id,
        }),
      }
    );

    const queryData = await queryResponse.json();

    const resultCode = parseInt(queryData.ResultCode ?? "-1");
    const resultDesc =
      queryData.ResultDesc || RESULT_CODES[resultCode] || "Unknown status";

    // Map to app status
    let status: string;
    if (resultCode === 0) {
      status = "completed";
    } else if (resultCode === 1032) {
      status = "cancelled";
    } else if (
      resultCode === 1037 ||
      resultCode === 1025 ||
      resultCode === 1019
    ) {
      status = "timeout";
    } else if (resultCode === -1) {
      // Query itself failed — transaction still pending
      status = "pending";
    } else {
      status = "failed";
    }

    // If completed, also update the transaction in DB (in case callback was missed)
    if (status === "completed") {
      const serviceSupabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Find the transaction
      const { data: transaction } = await serviceSupabase
        .from("transactions")
        .select("*")
        .eq("mpesa_checkout_request_id", checkout_request_id)
        .eq("user_id", user.id)
        .single();

      if (transaction && transaction.status === "pending") {
        // Get wallet
        const { data: wallet } = await serviceSupabase
          .from("wallets")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (wallet) {
          const newBalance =
            parseFloat(wallet.balance_kwh) +
            parseFloat(transaction.amount_kwh);

          // Update wallet
          await serviceSupabase
            .from("wallets")
            .update({ balance_kwh: newBalance })
            .eq("id", wallet.id);

          // Update transaction
          await serviceSupabase
            .from("transactions")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
            })
            .eq("id", transaction.id);

          // ── Auto-reconnect meter if user was previously connected ──
          try {
            const { data: reconnResult } = await serviceSupabase.rpc("auto_reconnect_on_recharge", {
              p_user_id: user.id,
            });
            if (reconnResult?.reconnected) {
              console.log(`⚡ Auto-reconnected user ${user.id} to meter ${reconnResult.meter_code}`);
              await serviceSupabase.rpc("insert_notification", {
                p_user_id: user.id,
                p_type: "meter",
                p_title: "Meter Reconnected",
                p_body: `Automatically reconnected to ${reconnResult.meter_name || "meter"} (${reconnResult.meter_code}) after recharge.`,
                p_icon: "⚡",
              });
            }
          } catch (reconnErr) {
            console.error("Auto-reconnect error (non-fatal):", reconnErr);
          }

          // ── Payment Split (same logic as mpesa-payment callback) ──
          try {
            const { data: commSetting } = await serviceSupabase
              .from("system_settings")
              .select("value")
              .eq("key", "commission_percent")
              .single();
            const commissionPct = parseFloat(commSetting?.value || "10");
            const originalKes = parseFloat(transaction.amount_kes);
            const commissionKes = parseFloat((originalKes * commissionPct / 100).toFixed(2));
            const kplcKes = parseFloat((originalKes - commissionKes).toFixed(2));

            // Check if split already exists (callback may have already created it)
            const { data: existingSplit } = await serviceSupabase
              .from("payment_splits")
              .select("id")
              .eq("transaction_id", transaction.id)
              .maybeSingle();

            if (!existingSplit) {
              await serviceSupabase.from("payment_splits").insert({
                transaction_id: transaction.id,
                user_id: transaction.user_id,
                original_amount_kes: originalKes,
                commission_percent: commissionPct,
                commission_amount_kes: commissionKes,
                kplc_amount_kes: kplcKes,
              });

              // Fire-and-forget pool check
              const kplcB2bUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/kplc-b2b?action=process_pool`;
              fetch(kplcB2bUrl, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                  "Content-Type": "application/json",
                },
              }).catch((e) => console.error("Pool trigger failed:", e));
            }
          } catch (splitErr) {
            console.error("Payment split error (non-fatal):", splitErr);
          }
        }
      }
    } else if (status === "failed" || status === "cancelled" || status === "timeout") {
      // Update transaction status if still pending
      const serviceSupabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      await serviceSupabase
        .from("transactions")
        .update({
          status: status === "timeout" ? "failed" : status,
          error_message: resultDesc,
          completed_at: new Date().toISOString(),
        })
        .eq("mpesa_checkout_request_id", checkout_request_id)
        .eq("user_id", user.id)
        .eq("status", "pending");
    }

    return new Response(
      JSON.stringify({
        status,
        result_code: resultCode,
        result_desc: resultDesc,
        checkout_request_id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("STK Query Error:", err);
    const msg = err instanceof Error ? err.message : "Server error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
