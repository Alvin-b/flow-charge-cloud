import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TUYA_CLIENT_ID = Deno.env.get("TUYA_CLIENT_ID")!;
const TUYA_CLIENT_SECRET = Deno.env.get("TUYA_CLIENT_SECRET")!;
const TUYA_BASE_URL = Deno.env.get("TUYA_BASE_URL") || "https://openapi.tuyaeu.com";

// Compute HMAC-SHA256 signature for Tuya API
async function hmacSha256(key: string, data: string): Promise<string> {
  const keyBytes = new TextEncoder().encode(key);
  const dataBytes = new TextEncoder().encode(data);
  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, dataBytes);
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Get Tuya access token
async function getTuyaToken(): Promise<string> {
  const ts = Date.now().toString();
  const stringToSign = TUYA_CLIENT_ID + ts + "GET\n\n\n\n/v1.0/token?grant_type=1";
  const sign = (await hmacSha256(TUYA_CLIENT_SECRET, stringToSign)).toUpperCase();

  const res = await fetch(`${TUYA_BASE_URL}/v1.0/token?grant_type=1`, {
    headers: {
      client_id: TUYA_CLIENT_ID,
      t: ts,
      sign,
      sign_method: "HMAC-SHA256",
      "Content-Type": "application/json",
    },
  });
  const data = await res.json();
  if (!data.success) throw new Error(`Tuya token error: ${data.msg}`);
  return data.result.access_token;
}

// Call Tuya API with auth
async function tuyaRequest(path: string, method = "GET", body?: object) {
  const token = await getTuyaToken();
  const ts = Date.now().toString();
  const bodyStr = body ? JSON.stringify(body) : "";
  const stringToSign = TUYA_CLIENT_ID + token + ts + `${method}\n\n\n\n${path}`;
  const sign = (await hmacSha256(TUYA_CLIENT_SECRET, stringToSign)).toUpperCase();

  const res = await fetch(`${TUYA_BASE_URL}${path}`, {
    method,
    headers: {
      client_id: TUYA_CLIENT_ID,
      access_token: token,
      t: ts,
      sign,
      sign_method: "HMAC-SHA256",
      "Content-Type": "application/json",
    },
    body: body ? bodyStr : undefined,
  });
  return res.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = user.id;

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const deviceId = url.searchParams.get("device_id");

  try {
    // Fetch device info from Tuya
    if (action === "device_info" && deviceId) {
      const data = await tuyaRequest(`/v1.0/devices/${deviceId}`);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch device status (real-time data points like kWh, power state)
    if (action === "device_status" && deviceId) {
      const data = await tuyaRequest(`/v1.0/devices/${deviceId}/status`);
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Link a meter to this user
    if (action === "link_meter" && req.method === "POST") {
      const body = await req.json();
      const { tuya_device_id, name, property_name } = body;

      // Input validation
      if (!tuya_device_id || typeof tuya_device_id !== "string" || tuya_device_id.length > 100 || !/^[a-zA-Z0-9_-]+$/.test(tuya_device_id)) {
        return new Response(JSON.stringify({ error: "Invalid device ID format" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (name && (typeof name !== "string" || name.length > 200)) {
        return new Response(JSON.stringify({ error: "Name must be under 200 characters" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (property_name && (typeof property_name !== "string" || property_name.length > 500)) {
        return new Response(JSON.stringify({ error: "Property name must be under 500 characters" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Rate limit: 5 Tuya operations per minute
      const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      const { data: canProceed } = await serviceClient.rpc('check_rate_limit', {
        p_user_id: userId, p_action: 'tuya_operation', p_limit: 5, p_window_seconds: 60
      });
      if (!canProceed) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please wait before retrying." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify device exists in Tuya
      const deviceData = await tuyaRequest(`/v1.0/devices/${tuya_device_id}`);
      if (!deviceData.success) {
        return new Response(JSON.stringify({ error: "Device not found in Tuya. Check the Device ID and try again." }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const device = deviceData.result;

      // Insert meter record
      const { data: meter, error } = await supabase.from("meters").insert({
        user_id: userId,
        tuya_device_id,
        name: name || device.name || "My Meter",
        property_name: property_name || "",
        status: device.online ? "online" : "offline",
        linked_at: new Date().toISOString(),
        last_sync: new Date().toISOString(),
      }).select().single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, meter, device }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Unlink (move out) — removes meter from user account
    if (action === "unlink_meter" && req.method === "POST") {
      const body = await req.json();
      const { meter_id } = body;

      const { error } = await supabase.from("meters").delete()
        .eq("id", meter_id).eq("user_id", userId);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sync all user meters from Tuya
    if (action === "sync_meters") {
      const { data: meters } = await supabase.from("meters")
        .select("*").eq("user_id", userId);

      if (!meters?.length) {
        return new Response(JSON.stringify({ success: true, updated: 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let updated = 0;
      for (const meter of meters) {
        try {
          const statusData = await tuyaRequest(`/v1.0/devices/${meter.tuya_device_id}/status`);
          if (statusData.success) {
            // Parse energy data points (Tuya dp codes vary by device)
            const dps = statusData.result as Array<{ code: string; value: unknown }>;
            const energyDp = dps.find((d) => d.code === "phase_a" || d.code === "energy" || d.code === "cur_electricity");
            const onlineDp = dps.find((d) => d.code === "switch" || d.code === "switch_1");

            await supabase.from("meters").update({
              status: onlineDp ? "online" : "offline",
              last_sync: new Date().toISOString(),
            }).eq("id", meter.id);
            updated++;
          }
        } catch (_) {
          // Continue syncing other meters
        }
      }

      return new Response(JSON.stringify({ success: true, updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Transfer kWh from wallet to meter
    if (action === "transfer_to_meter" && req.method === "POST") {
      const body = await req.json();
      const { meter_id, kwh_amount } = body;

      // Validate meter_id is UUID format and kwh_amount is reasonable
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!meter_id || typeof meter_id !== "string" || !uuidRegex.test(meter_id)) {
        return new Response(
          JSON.stringify({ error: "Valid meter_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const parsedKwh = parseFloat(kwh_amount);
      if (!kwh_amount || isNaN(parsedKwh) || parsedKwh <= 0 || parsedKwh > 10000) {
        return new Response(
          JSON.stringify({ error: "kwh_amount must be between 0 and 10,000" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Create service role client for transaction
      const serviceSupabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Verify user owns the meter
      const { data: meter, error: meterError } = await supabase
        .from("meters")
        .select("*")
        .eq("id", meter_id)
        .eq("user_id", userId)
        .single();

      if (meterError || !meter) {
        return new Response(
          JSON.stringify({ error: "Meter not found or unauthorized" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user's wallet
      const { data: wallet, error: walletError } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (walletError || !wallet) {
        return new Response(
          JSON.stringify({ error: "Wallet not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check sufficient balance
      const walletBalance = parseFloat(wallet.balance_kwh);
      const transferAmount = parseFloat(kwh_amount);
      
      if (walletBalance < transferAmount) {
        return new Response(
          JSON.stringify({ 
            error: "Insufficient wallet balance",
            wallet_balance: walletBalance,
            requested: transferAmount
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check meter capacity
      const meterBalance = parseFloat(meter.balance_kwh);
      const meterMax = parseFloat(meter.max_kwh);
      const newMeterBalance = meterBalance + transferAmount;

      if (newMeterBalance > meterMax) {
        return new Response(
          JSON.stringify({ 
            error: "Transfer would exceed meter capacity",
            meter_balance: meterBalance,
            meter_max: meterMax,
            available_capacity: meterMax - meterBalance
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      try {
        // Start transaction: Create transaction record
        const { data: transaction, error: txError } = await serviceSupabase
          .from("transactions")
          .insert({
            user_id: userId,
            type: "meter_transfer",
            amount_kwh: transferAmount,
            amount_kes: 0,
            status: "pending",
            metadata: {
              initiated_at: new Date().toISOString(),
              meter_id: meter_id,
              meter_name: meter.name,
              tuya_device_id: meter.tuya_device_id,
            },
          })
          .select()
          .single();

        if (txError) {
          throw new Error(`Failed to create transaction: ${txError.message}`);
        }

        // Deduct from wallet
        const newWalletBalance = walletBalance - transferAmount;
        const { error: walletUpdateError } = await serviceSupabase
          .from("wallets")
          .update({ balance_kwh: newWalletBalance })
          .eq("id", wallet.id);

        if (walletUpdateError) {
          // Rollback: mark transaction as failed
          await serviceSupabase
            .from("transactions")
            .update({ status: "failed", error_message: "Wallet update failed" })
            .eq("id", transaction.id);
          throw new Error(`Failed to update wallet: ${walletUpdateError.message}`);
        }

        // Add to meter
        const { error: meterUpdateError } = await serviceSupabase
          .from("meters")
          .update({ balance_kwh: newMeterBalance })
          .eq("id", meter_id);

        if (meterUpdateError) {
          // Rollback wallet
          await serviceSupabase
            .from("wallets")
            .update({ balance_kwh: walletBalance })
            .eq("id", wallet.id);
          // Mark transaction as failed
          await serviceSupabase
            .from("transactions")
            .update({ status: "failed", error_message: "Meter update failed" })
            .eq("id", transaction.id);
          throw new Error(`Failed to update meter: ${meterUpdateError.message}`);
        }

        // Create meter_transfer record
        await serviceSupabase.from("meter_transfers").insert({
          transaction_id: transaction.id,
          wallet_id: wallet.id,
          meter_id: meter_id,
          kwh_amount: transferAmount,
          wallet_balance_before: walletBalance,
          wallet_balance_after: newWalletBalance,
          meter_balance_before: meterBalance,
          meter_balance_after: newMeterBalance,
        });

        // Mark transaction as completed
        await serviceSupabase
          .from("transactions")
          .update({ 
            status: "completed", 
            completed_at: new Date().toISOString() 
          })
          .eq("id", transaction.id);

        // Optional: Send command to Tuya meter (if supported)
        // Some Tuya meters support balance updates via commands
        try {
          // This is device-specific and may not work for all meters
          // Example: Update a data point for meter balance
          // await tuyaRequest(`/v1.0/devices/${meter.tuya_device_id}/commands`, "POST", {
          //   commands: [{ code: "balance", value: newMeterBalance * 100 }] // Value format varies
          // });
        } catch (tuyaError) {
          // Tuya command failed - continue anyway as DB is updated
          console.warn("Tuya command failed (non-critical):", tuyaError);
        }

        return new Response(
          JSON.stringify({
            success: true,
            transaction_id: transaction.id,
            wallet_balance: newWalletBalance,
            meter_balance: newMeterBalance,
            transferred: transferAmount,
            message: `Successfully transferred ${transferAmount} kWh to ${meter.name}`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (err) {
        console.error("Transfer error:", err);
        const msg = err instanceof Error ? err.message : "Transfer failed";
        return new Response(
          JSON.stringify({ error: msg }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Server error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
