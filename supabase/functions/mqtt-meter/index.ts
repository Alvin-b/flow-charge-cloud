import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * MQTT Meter Edge Function
 *
 * Since Supabase Edge Functions can't maintain persistent MQTT connections,
 * this function publishes commands to meters via an MQTT broker's HTTP API.
 *
 * Supported brokers with HTTP publish APIs:
 * - EMQX: POST /api/v5/publish
 * - HiveMQ: POST /api/v1/mqtt/publish
 *
 * The broker URL and credentials are configured via secrets:
 * - MQTT_HTTP_API_URL: e.g. https://broker.example.com/api/v5/publish
 * - MQTT_HTTP_API_KEY: API key or Basic auth for the HTTP API
 * - MQTT_USERNAME / MQTT_PASSWORD: fallback Basic auth
 */

const MQTT_HTTP_API_URL = Deno.env.get("MQTT_HTTP_API_URL") || "";
const MQTT_HTTP_API_KEY = Deno.env.get("MQTT_HTTP_API_KEY") || "";
const MQTT_USERNAME = Deno.env.get("MQTT_USERNAME") || "";
const MQTT_PASSWORD = Deno.env.get("MQTT_PASSWORD") || "";

// Topic structure: meters/{meter_id}/{action}
const TOPICS = {
  status: (meterId: string) => `meters/${meterId}/status`,
  command: (meterId: string) => `meters/${meterId}/command`,
};

/**
 * Publish a message to the MQTT broker via its HTTP API.
 * Returns true if published successfully, false otherwise.
 */
async function publishViaMqttHttp(topic: string, payload: Record<string, unknown>): Promise<boolean> {
  if (!MQTT_HTTP_API_URL) {
    console.warn("MQTT_HTTP_API_URL not configured – skipping MQTT publish");
    return false;
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (MQTT_HTTP_API_KEY) {
    headers["Authorization"] = `Bearer ${MQTT_HTTP_API_KEY}`;
  } else if (MQTT_USERNAME) {
    headers["Authorization"] = `Basic ${btoa(`${MQTT_USERNAME}:${MQTT_PASSWORD}`)}`;
  }

  try {
    const res = await fetch(MQTT_HTTP_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({
        topic,
        payload: JSON.stringify(payload),
        qos: 1,
        retain: false,
      }),
    });

    if (!res.ok) {
      console.error(`MQTT HTTP publish failed: ${res.status} ${await res.text()}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("MQTT HTTP publish error:", err);
    return false;
  }
}

/**
 * Send a command to a meter and return immediately.
 * Meter responses arrive asynchronously via mqtt-webhook.
 */
async function sendMeterCommand(meterId: string, command: string, payload: Record<string, unknown>) {
  const message = {
    command,
    payload,
    timestamp: new Date().toISOString(),
    request_id: crypto.randomUUID(),
  };

  const published = await publishViaMqttHttp(TOPICS.command(meterId), message);
  return { sent: published, request_id: message.request_id };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const serviceSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
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

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const userId = user.id;

    // ── device_info: look up meter from DB, optionally send status request ──
    if (action === "device_info" && req.method === "POST") {
      const { meter_id } = await req.json();

      if (!meter_id) {
        return new Response(JSON.stringify({ error: "meter_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify user owns meter
      const { data: meter } = await supabase
        .from("meters")
        .select("*")
        .eq("id", meter_id)
        .single();

      if (!meter) {
        return new Response(JSON.stringify({ error: "Meter not found or access denied" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Fire a status request to the meter (response arrives via webhook)
      const cmd = await sendMeterCommand(meter.id, "get_status", {});

      return new Response(
        JSON.stringify({
          success: true,
          meter: {
            id: meter.id,
            name: meter.name,
            property_name: meter.property_name,
            status: meter.status,
            balance_kwh: meter.balance_kwh,
            max_kwh: meter.max_kwh,
            last_sync: meter.last_sync,
          },
          mqtt: cmd,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── sync_connection: tell meter a user connected ──
    if (action === "sync_connection" && req.method === "POST") {
      const { meter_id } = await req.json();

      if (!meter_id) {
        return new Response(JSON.stringify({ error: "meter_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const cmd = await sendMeterCommand(meter_id, "connect_user", {
        user_id: userId,
        connected_at: new Date().toISOString(),
      });

      return new Response(JSON.stringify({ success: true, mqtt: cmd }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── sync_disconnection: tell meter a user disconnected ──
    if (action === "sync_disconnection" && req.method === "POST") {
      const { meter_id } = await req.json();

      if (!meter_id) {
        return new Response(JSON.stringify({ error: "meter_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const cmd = await sendMeterCommand(meter_id, "disconnect_user", {
        user_id: userId,
        disconnected_at: new Date().toISOString(),
      });

      return new Response(JSON.stringify({ success: true, mqtt: cmd }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── update_balance: push new balance to physical meter ──
    if (action === "update_balance" && req.method === "POST") {
      const { meter_id, balance_kwh } = await req.json();

      if (!meter_id || balance_kwh === undefined) {
        return new Response(
          JSON.stringify({ error: "meter_id and balance_kwh are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const cmd = await sendMeterCommand(meter_id, "set_balance", {
        balance_kwh,
        updated_at: new Date().toISOString(),
      });

      // Also update DB
      await serviceSupabase
        .from("meters")
        .update({ balance_kwh, updated_at: new Date().toISOString() })
        .eq("id", meter_id);

      return new Response(JSON.stringify({ success: true, mqtt: cmd }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        error: "Unknown action. Use: device_info, sync_connection, sync_disconnection, update_balance",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("MQTT meter error:", err);
    const msg = err instanceof Error ? err.message : "Server error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
