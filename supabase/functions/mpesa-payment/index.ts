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
const MPESA_TILL_NUMBER = "4159923";
const MPESA_SHORTCODE = Deno.env.get("DARAJA_SHORTCODE")!;
const MPESA_PASSKEY = Deno.env.get("DARAJA_PASSKEY")!;
const MPESA_CALLBACK_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/mpesa-payment?action=callback`;

// M-Pesa API URLs (Production only)
const MPESA_BASE_URL = "https://api.safaricom.co.ke";

const KES_PER_KWH = 24;

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

// Format phone number to 254 format
function formatPhoneNumber(phone: string): string {
  // Remove spaces, dashes, and plus signs
  phone = phone.replace(/[\s\-+]/g, "");
  
  // If starts with 0, replace with 254
  if (phone.startsWith("0")) {
    phone = "254" + phone.substring(1);
  }
  
  // If doesn't start with 254, prepend it
  if (!phone.startsWith("254")) {
    phone = "254" + phone;
  }
  
  return phone;
}

// Initiate STK Push
async function initiateSTKPush(
  supabase: any,
  userId: string,
  phone: string,
  amountKES: number
) {
  const accessToken = await getMpesaAccessToken();
  const timestamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);
  const password = generateMpesaPassword(timestamp);
  const formattedPhone = formatPhoneNumber(phone);

  // Validate amount
  if (amountKES < 10) {
    throw new Error("Minimum amount is KES 10");
  }
  if (amountKES > 150000) {
    throw new Error("Maximum amount is KES 150,000");
  }

  // Calculate kWh
  const kwhAmount = parseFloat((amountKES / KES_PER_KWH).toFixed(2));

  // Create pending transaction
  const { data: transaction, error: txError } = await supabase
    .from("transactions")
    .insert({
      user_id: userId,
      type: "recharge",
      amount_kwh: kwhAmount,
      amount_kes: amountKES,
      status: "pending",
      phone_number: formattedPhone,
      metadata: {
        timestamp,
        initiated_at: new Date().toISOString(),
      },
    })
    .select()
    .single();

  if (txError) {
    throw new Error(`Failed to create transaction: ${txError.message}`);
  }

  // Prepare STK Push request (Buy Goods)
  const stkPushPayload = {
    BusinessShortCode: MPESA_SHORTCODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerBuyGoodsOnline",
    Amount: Math.round(amountKES),
    PartyA: formattedPhone,
    PartyB: MPESA_TILL_NUMBER, // Till Number for Buy Goods
    PhoneNumber: formattedPhone,
    CallBackURL: MPESA_CALLBACK_URL,
    AccountReference: `PF${transaction.id.slice(0, 8)}`,
    TransactionDesc: `Energy ${kwhAmount}kWh`,
  };

  // Send STK Push
  const stkResponse = await fetch(
    `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(stkPushPayload),
    }
  );

  const stkData = await stkResponse.json();

  if (stkData.ResponseCode !== "0") {
    // Update transaction as failed
    await supabase
      .from("transactions")
      .update({
        status: "failed",
        error_message: stkData.ResponseDescription || "STK push failed",
      })
      .eq("id", transaction.id);

    throw new Error(stkData.ResponseDescription || "STK push request failed");
  }

  // Update transaction with checkout request ID
  await supabase
    .from("transactions")
    .update({
      mpesa_checkout_request_id: stkData.CheckoutRequestID,
      metadata: {
        ...transaction.metadata,
        merchant_request_id: stkData.MerchantRequestID,
      },
    })
    .eq("id", transaction.id);

  return {
    success: true,
    transaction_id: transaction.id,
    checkout_request_id: stkData.CheckoutRequestID,
    merchant_request_id: stkData.MerchantRequestID,
    message: "STK push sent successfully",
  };
}

// Handle M-Pesa callback
async function handleCallback(supabase: any, body: any) {
  console.log("M-Pesa Callback received:", JSON.stringify(body, null, 2));

  const callbackData = body.Body?.stkCallback;
  if (!callbackData) {
    throw new Error("Invalid callback format");
  }

  const checkoutRequestID = callbackData.CheckoutRequestID;
  const resultCode = callbackData.ResultCode;
  const resultDesc = callbackData.ResultDesc;

  // Find transaction by checkout request ID
  const { data: transaction, error: findError } = await supabase
    .from("transactions")
    .select("*")
    .eq("mpesa_checkout_request_id", checkoutRequestID)
    .single();

  if (findError || !transaction) {
    console.error("Transaction not found:", checkoutRequestID);
    throw new Error("Transaction not found");
  }

  // Check if transaction was successful
  if (resultCode === 0) {
    // Parse callback metadata
    const callbackMetadata = callbackData.CallbackMetadata?.Item || [];
    const mpesaReceiptNumber = callbackMetadata.find(
      (item: any) => item.Name === "MpesaReceiptNumber"
    )?.Value;
    const transactionDate = callbackMetadata.find(
      (item: any) => item.Name === "TransactionDate"
    )?.Value;
    const phoneNumber = callbackMetadata.find(
      (item: any) => item.Name === "PhoneNumber"
    )?.Value;
    const amount = callbackMetadata.find(
      (item: any) => item.Name === "Amount"
    )?.Value;

    // Atomically credit wallet (race-condition safe, no read-then-write)
    const { data: newBalance, error: creditError } = await supabase
      .rpc("credit_wallet", {
        p_user_id: transaction.user_id,
        p_amount_kwh: parseFloat(transaction.amount_kwh),
      });

    if (creditError) {
      throw new Error(`Failed to update wallet: ${creditError.message}`);
    }

    // Update transaction as completed
    await supabase
      .from("transactions")
      .update({
        status: "completed",
        mpesa_receipt_number: mpesaReceiptNumber,
        mpesa_transaction_id: transactionDate?.toString(),
        completed_at: new Date().toISOString(),
        metadata: {
          ...transaction.metadata,
          mpesa_phone: phoneNumber,
          mpesa_amount: amount,
          callback_received_at: new Date().toISOString(),
        },
      })
      .eq("id", transaction.id);

    console.log(`✅ Transaction ${transaction.id} completed. Added ${transaction.amount_kwh} kWh to wallet.`);

    // ── Payment Split: commission + KPLC forwarding ──
    try {
      // Read commission_percent from system_settings
      const { data: commSetting } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "commission_percent")
        .single();
      const commissionPct = parseFloat(commSetting?.value || "10");
      const originalKes = parseFloat(transaction.amount_kes);
      const commissionKes = parseFloat((originalKes * commissionPct / 100).toFixed(2));
      const kplcKes = parseFloat((originalKes - commissionKes).toFixed(2));

      // Insert payment split record
      await supabase.from("payment_splits").insert({
        transaction_id: transaction.id,
        user_id: transaction.user_id,
        original_amount_kes: originalKes,
        commission_percent: commissionPct,
        commission_amount_kes: commissionKes,
        kplc_amount_kes: kplcKes,
      });

      console.log(`💰 Split: KES ${originalKes} → commission ${commissionKes} + KPLC ${kplcKes}`);

      // Check if pool balance meets threshold, trigger B2B if so
      const { data: poolBalance } = await supabase.rpc("get_kplc_pool_balance");
      const { data: minSetting } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "kplc_min_payment")
        .single();
      const minPayment = parseFloat(minSetting?.value || "25");

      if (parseFloat(poolBalance || "0") >= minPayment) {
        // Fire-and-forget pool processing (don't block callback response)
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
      // Don't fail the callback if split processing fails
      console.error("Payment split error (non-fatal):", splitErr);
    }

    // ── Auto-reconnect meter if user was previously connected ──
    try {
      const { data: reconnResult } = await supabase.rpc("auto_reconnect_on_recharge", {
        p_user_id: transaction.user_id,
      });
      if (reconnResult?.reconnected) {
        console.log(`⚡ Auto-reconnected user ${transaction.user_id} to meter ${reconnResult.meter_code}`);
        await supabase.rpc("insert_notification", {
          p_user_id: transaction.user_id,
          p_type: "meter",
          p_title: "Meter Reconnected",
          p_body: `Automatically reconnected to ${reconnResult.meter_name || "meter"} (${reconnResult.meter_code}) after recharge.`,
          p_icon: "⚡",
        });
      }
    } catch (reconnErr) {
      console.error("Auto-reconnect error (non-fatal):", reconnErr);
    }

    // Notification: payment success
    await supabase.rpc("insert_notification", {
      p_user_id: transaction.user_id,
      p_type: "payment",
      p_title: "Payment Confirmed",
      p_body: `KES ${transaction.amount_kes} recharge — ${transaction.amount_kwh} kWh added to wallet`,
      p_icon: "💳",
    });
  } else {
    // Transaction failed or cancelled
    await supabase
      .from("transactions")
      .update({
        status: resultCode === 1032 ? "cancelled" : "failed",
        error_message: resultDesc,
        completed_at: new Date().toISOString(),
      })
      .eq("id", transaction.id);

    // Notification: payment failed
    await supabase.rpc("insert_notification", {
      p_user_id: transaction.user_id,
      p_type: "payment",
      p_title: resultCode === 1032 ? "Payment Cancelled" : "Payment Failed",
      p_body: `KES ${transaction.amount_kes} recharge was not completed: ${resultDesc}`,
      p_icon: "❌",
    });

    console.log(`❌ Transaction ${transaction.id} failed: ${resultDesc}`);
  }

  return { success: true, result_code: resultCode };
}

// Check transaction status
async function checkStatus(supabase: any, transactionId: string, userId: string) {
  const { data: transaction, error } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", transactionId)
    .eq("user_id", userId)
    .single();

  if (error) {
    throw new Error("Transaction not found");
  }

  return {
    transaction_id: transaction.id,
    status: transaction.status,
    amount_kwh: transaction.amount_kwh,
    amount_kes: transaction.amount_kes,
    mpesa_receipt_number: transaction.mpesa_receipt_number,
    created_at: transaction.created_at,
    completed_at: transaction.completed_at,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    // Handle callback (no auth required - comes from Safaricom)
    if (action === "callback" && req.method === "POST") {
      const body = await req.json();
      
      // Create service role client for callback
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const result = await handleCallback(supabase, body);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // All other actions require authentication
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

    // Service role client for DB writes (bypasses RLS)
    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Handle different actions
    if (action === "initiate_stk_push" && req.method === "POST") {
      const body = await req.json();
      const { phone, amount_kes } = body;

      if (!phone || !amount_kes) {
        return new Response(
          JSON.stringify({ error: "Phone and amount_kes are required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Use service role client so transaction writes aren't blocked by RLS
      const result = await initiateSTKPush(serviceSupabase, userId, phone, amount_kes);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "check_status") {
      const transactionId = url.searchParams.get("transaction_id");
      if (!transactionId) {
        return new Response(
          JSON.stringify({ error: "transaction_id is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const result = await checkStatus(serviceSupabase, transactionId, userId);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    const msg = err instanceof Error ? err.message : "Server error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
