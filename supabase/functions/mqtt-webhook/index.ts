import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * MQTT Webhook Handler
 * 
 * Receives meter data pushes from MQTT broker via webhook.
 * Many MQTT brokers (like EMQX, HiveMQ) support webhooks to forward messages to HTTP endpoints.
 * 
 * Expected webhook payload format:
 * {
 *   "topic": "meters/{meter_id}/status",
 *   "payload": "{...}",
 *   "qos": 1,
 *   "timestamp": 1234567890
 * }
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Use service role for webhook (no user auth)
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { topic, payload: payloadStr, timestamp } = body;

    if (!topic || !payloadStr) {
      return new Response(
        JSON.stringify({ error: "Missing topic or payload" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse payload
    let payload;
    try {
      payload = typeof payloadStr === "string" ? JSON.parse(payloadStr) : payloadStr;
    } catch {
      payload = { raw: payloadStr };
    }

    console.log(`[MQTT Webhook] Topic: ${topic}, Payload:`, payload);

    // Extract meter_id from topic
    const topicParts = topic.split("/");
    if (topicParts[0] !== "meters" || topicParts.length < 3) {
      return new Response(
        JSON.stringify({ error: "Invalid topic format. Expected: meters/{meter_id}/{type}" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const meterId = topicParts[1];
    const messageType = topicParts[2];

    // Get meter from database
    const { data: meter } = await supabase
      .from("meters")
      .select("*")
      .eq("id", meterId)
      .maybeSingle();

    if (!meter) {
      console.warn(`Meter ${meterId} not found in database`);
      return new Response(
        JSON.stringify({ success: true, message: "Meter not found, ignored" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Handle different message types
    if (messageType === "status") {
      // Meter status update
      const { online, voltage, current, power, temperature } = payload;

      // Update meter status in database
      await supabase
        .from("meters")
        .update({
          status: online ? "connected" : "offline",
          updated_at: new Date().toISOString(),
        })
        .eq("id", meterId);

      // Store detailed status in metadata (optional)
      console.log(`[Meter ${meterId}] Status: ${online ? "online" : "offline"}`);
    } else if (messageType === "consumption") {
      // Real-time consumption data from meter
      const { kwh_consumed, power_draw_kw, timestamp: consumedAt } = payload;

      // Get active connection for this meter
      const { data: connection } = await supabase
        .from("meter_connections")
        .select("*")
        .eq("meter_id", meterId)
        .eq("is_active", true)
        .maybeSingle();

      if (connection) {
        // Get user's wallet balance
        const { data: wallet } = await supabase
          .from("wallets")
          .select("balance_kwh")
          .eq("user_id", connection.user_id)
          .single();

        const balanceBefore = wallet?.balance_kwh || 0;

        // Deduct from wallet
        if (kwh_consumed > 0 && balanceBefore >= kwh_consumed) {
          const newBalance = balanceBefore - kwh_consumed;

          await supabase
            .from("wallets")
            .update({ balance_kwh: newBalance })
            .eq("user_id", connection.user_id);

          // Log consumption
          await supabase.from("consumption_logs").insert({
            user_id: connection.user_id,
            meter_id: meterId,
            connection_id: connection.id,
            kwh_consumed,
            wallet_balance_before: balanceBefore,
            wallet_balance_after: newBalance,
            meter_balance_before: 0,
            meter_balance_after: 0,
            consumed_at: consumedAt || new Date().toISOString(),
          });

          console.log(`[Meter ${meterId}] Consumed ${kwh_consumed} kWh, new balance: ${newBalance}`);

          // Low balance alert
          if (newBalance <= 5 && balanceBefore > 5) {
            await supabase.rpc("insert_notification", {
              p_user_id: connection.user_id,
              p_type: "low_balance",
              p_title: "Low Balance Alert",
              p_body: `Your wallet balance is ${newBalance.toFixed(1)} kWh. Recharge soon!`,
              p_icon: "🟡",
            });
          }
        } else if (balanceBefore <= 0) {
          // No balance, send notification
          await supabase.rpc("insert_notification", {
            p_user_id: connection.user_id,
            p_type: "low_balance",
            p_title: "Wallet Empty",
            p_body: "Your wallet balance is 0 kWh. Recharge to continue using energy.",
            p_icon: "🔴",
          });
        }
      }
    } else if (messageType === "response") {
      // Meter response to a command
      // These are typically handled by the mqtt-meter function waiting for responses
      // Just log for debugging
      console.log(`[Meter ${meterId}] Response:`, payload);
    } else if (messageType === "alert") {
      // Meter sent an alert (e.g., overload, fault)
      const { alert_type, message } = payload;

      // Get active connection
      const { data: connection } = await supabase
        .from("meter_connections")
        .select("user_id")
        .eq("meter_id", meterId)
        .eq("is_active", true)
        .maybeSingle();

      if (connection) {
        await supabase.rpc("insert_notification", {
          p_user_id: connection.user_id,
          p_type: "system",
          p_title: `Meter Alert: ${alert_type}`,
          p_body: message || "Your meter has reported an issue.",
          p_icon: "⚠️",
        });
      }

      console.log(`[Meter ${meterId}] Alert: ${alert_type} - ${message}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Webhook processed" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("MQTT webhook error:", err);
    const msg = err instanceof Error ? err.message : "Server error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
