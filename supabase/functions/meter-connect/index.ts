import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MQTT_HTTP_API_URL = Deno.env.get("MQTT_HTTP_API_URL") || "";
const MQTT_HTTP_API_KEY = Deno.env.get("MQTT_HTTP_API_KEY") || "";

// ── MQTT Helpers ─────────────────────────────────────────────

function last8(meterId: string): string {
  return meterId.slice(-8);
}

async function mqttPublish(topic: string, payload: Record<string, unknown>): Promise<boolean> {
  if (!MQTT_HTTP_API_URL) return false;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (MQTT_HTTP_API_KEY) headers["Authorization"] = `Basic ${MQTT_HTTP_API_KEY}`;

  try {
    const res = await fetch(MQTT_HTTP_API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ topic, payload: JSON.stringify(payload), qos: 1, retain: false }),
      tls: false,
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`MQTT publish failed [${res.status}]: ${text}`);
      return false;
    }
    await res.text();
    console.log(`[MQTT] Published to ${topic}`);
    return true;
  } catch (err) {
    console.error("MQTT publish error:", err);
    return false;
  }
}

async function sendRelayOn(mqttMeterId: string): Promise<boolean> {
  const oprid = crypto.randomUUID().replace(/-/g, "");
  const topic = `MQTT_TELECTRL_${last8(mqttMeterId)}`;
  console.log(`⚡ RELAY ON: ${mqttMeterId} → ${topic}`);
  return await mqttPublish(topic, { do1: "1", oprid });
}

async function sendRelayOff(mqttMeterId: string): Promise<boolean> {
  const oprid = crypto.randomUUID().replace(/-/g, "");
  const topic = `MQTT_TELECTRL_${last8(mqttMeterId)}`;
  console.log(`⚡ RELAY OFF: ${mqttMeterId} → ${topic}`);
  return await mqttPublish(topic, { do1: "0", oprid });
}

/**
 * MQTT Live Validation: Send a time sync ping and wait for response.
 * Returns true if meter responds within timeout, proving it's a real COMPERE device.
 */
async function mqttPingValidate(
  mqttMeterId: string,
  serviceSupabase: any,
): Promise<{ valid: boolean; error?: string }> {
  if (!MQTT_HTTP_API_URL) {
    return { valid: false, error: "MQTT broker not configured. Contact support." };
  }

  const oprid = crypto.randomUUID().replace(/-/g, "");
  const topic = `MQTT_SETTIME_${last8(mqttMeterId)}`;
  const now = new Date();
  const timeStr = now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");

  // Record the operation for tracking
  await serviceSupabase.from("mqtt_operations").insert({
    meter_id: mqttMeterId,
    operation_id: oprid,
    operation_type: "time_sync",
    command_type: "validation_ping",
    status: "pending",
  });

  // Send time sync command
  const sent = await mqttPublish(topic, { oprid, time: timeStr });
  if (!sent) {
    return { valid: false, error: "Failed to reach meter. Check that it's powered on with 4G signal." };
  }

  // Poll for response (up to 12 seconds, checking every 2s)
  const maxWait = 12000;
  const interval = 2000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    await new Promise((r) => setTimeout(r, interval));

    const { data: op } = await serviceSupabase
      .from("mqtt_operations")
      .select("status, response_code")
      .eq("operation_id", oprid)
      .maybeSingle();

    if (op && op.status === "completed") {
      return { valid: op.response_code === "01" };
    }
    if (op && op.status === "failed") {
      return { valid: false, error: "Meter rejected the validation command." };
    }
  }

  // Timeout — meter didn't respond
  await serviceSupabase
    .from("mqtt_operations")
    .update({ status: "timeout" })
    .eq("operation_id", oprid);

  return { valid: false, error: "Meter did not respond within 12 seconds. Ensure it's powered on with active 4G." };
}

// ── Main handler ─────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);

  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = user.id;
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  const serviceSupabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // ── Connect to meter (HYBRID: registry check + MQTT ping fallback) ──
    if (action === "connect" && req.method === "POST") {
      const body = await req.json();
      const { meter_code, connection_type } = body;

      if (!meter_code || typeof meter_code !== "string" || meter_code.trim().length === 0 || meter_code.trim().length > 50) {
        return new Response(
          JSON.stringify({ error: "Valid meter number is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const validTypes = ["manual_code", "qr_scan", "nfc"];
      const connType = connection_type && validTypes.includes(connection_type) ? connection_type : "manual_code";
      const trimmedCode = meter_code.trim();

      // Rate limit
      const { data: canProceed } = await serviceSupabase.rpc('check_rate_limit', {
        p_user_id: userId,
        p_action: 'meter_connect',
        p_limit: 3,
        p_window_seconds: 60
      });

      if (!canProceed) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait before retrying." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check existing active connection
      const { data: existingConnection } = await supabase
        .from("meter_connections")
        .select("id, meter_id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (existingConnection) {
        return new Response(
          JSON.stringify({ error: "You already have an active meter connection. Disconnect first." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // ─── STEP 1: Check if meter already exists in meters table ───
      const { data: existingMeter } = await serviceSupabase
        .from("meters")
        .select("*")
        .eq("mqtt_meter_id", trimmedCode)
        .maybeSingle();

      if (existingMeter) {
        // Meter already known — check availability
        if (existingMeter.status !== "available") {
          const statusMsg: Record<string, string> = {
            connected: "This meter is already connected to another user.",
            offline: "This meter is currently offline.",
            maintenance: "This meter is under maintenance.",
          };
          return new Response(
            JSON.stringify({ error: statusMsg[existingMeter.status] || "Meter is not available." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Connect to existing meter
        return await connectToMeter(supabase, serviceSupabase, userId, existingMeter);
      }

      // ─── STEP 2: Check meter_registry (pre-registered by admin) ───
      const { data: registryEntry } = await serviceSupabase
        .from("meter_registry")
        .select("*")
        .eq("mqtt_meter_id", trimmedCode)
        .maybeSingle();

      if (registryEntry) {
        if (registryEntry.is_claimed) {
          return new Response(
            JSON.stringify({ error: "This meter has already been claimed by another user." }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`✅ Registry match: ${trimmedCode} — creating meter record`);

        // Create meter from registry info
        const meter = await createMeterFromRegistry(serviceSupabase, registryEntry, userId);

        // Mark as claimed in registry
        await serviceSupabase.from("meter_registry").update({
          is_claimed: true,
          claimed_by: userId,
          claimed_at: new Date().toISOString(),
        }).eq("id", registryEntry.id);

        return await connectToMeter(supabase, serviceSupabase, userId, meter);
      }

      // ─── STEP 3: MQTT live validation (unknown meter) ───
      console.log(`🔍 Unknown meter ${trimmedCode} — attempting MQTT live validation`);

      const validation = await mqttPingValidate(trimmedCode, serviceSupabase);

      if (!validation.valid) {
        return new Response(
          JSON.stringify({
            error: validation.error || "Meter validation failed. Ensure it's a genuine COMPERE meter, powered on with 4G signal.",
            validation_method: "mqtt_ping",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`✅ MQTT validated: ${trimmedCode} — creating meter record`);

      // Create new meter record (self-registration)
      const { data: newMeter, error: createErr } = await serviceSupabase
        .from("meters")
        .insert({
          name: `Meter ${trimmedCode.slice(-6)}`,
          tuya_device_id: trimmedCode,
          mqtt_meter_id: trimmedCode,
          status: "available",
          user_id: userId,
        })
        .select()
        .single();

      if (createErr) {
        return new Response(
          JSON.stringify({ error: "Failed to register meter. Please try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return await connectToMeter(supabase, serviceSupabase, userId, newMeter);
    }

    // ── Disconnect from meter ──
    if (action === "disconnect" && req.method === "POST") {
      const body = await req.json();
      const { connection_id } = body;

      if (!connection_id) {
        return new Response(
          JSON.stringify({ error: "connection_id is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get meter info before disconnecting
      const { data: connInfo } = await serviceSupabase
        .from("meter_connections")
        .select("meter_id, meters(name, mqtt_meter_id)")
        .eq("id", connection_id)
        .eq("user_id", userId)
        .single();

      // Disconnect via DB function
      const { error } = await supabase.rpc("disconnect_from_meter", {
        p_connection_id: connection_id,
      });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send MQTT relay OFF
      const meterData = (connInfo as any)?.meters;
      if (meterData?.mqtt_meter_id) {
        const sent = await sendRelayOff(meterData.mqtt_meter_id);
        if (sent) {
          await serviceSupabase.from("meters").update({ is_relay_on: false }).eq("mqtt_meter_id", meterData.mqtt_meter_id);
          console.log(`🔌 Relay OFF sent for meter ${meterData.mqtt_meter_id}`);
        }
      }

      // Notification
      const meterName = meterData?.name || "meter";
      await serviceSupabase.rpc("insert_notification", {
        p_user_id: userId,
        p_type: "meter",
        p_title: "Meter Disconnected",
        p_body: `Disconnected from ${meterName}. Power has been turned off. Your wallet balance is preserved.`,
        p_icon: "🔌",
      });

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Get active connection ──
    if (action === "active") {
      const { data: activeConn } = await supabase
        .from("meter_connections")
        .select("*, meters(id, name, mqtt_meter_id, property_name, balance_kwh, max_kwh, status, is_relay_on, last_sync)")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      return new Response(
        JSON.stringify({ connection: activeConn ?? null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Connection history ──
    if (action === "history") {
      const { data } = await supabase
        .from("meter_connections")
        .select("*, meters(name, mqtt_meter_id, property_name)")
        .eq("user_id", userId)
        .order("connected_at", { ascending: false })
        .limit(20);

      return new Response(
        JSON.stringify({ connections: data ?? [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Meter connect error:", err);
    const msg = err instanceof Error ? err.message : "Server error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Helper: Create meter record from registry entry ──────────

async function createMeterFromRegistry(serviceSupabase: any, registry: any, userId: string) {
  const { data: meter, error } = await serviceSupabase
    .from("meters")
    .insert({
      name: registry.name || `Meter ${registry.mqtt_meter_id.slice(-6)}`,
      tuya_device_id: registry.mqtt_meter_id,
      mqtt_meter_id: registry.mqtt_meter_id,
      property_name: registry.property_name || null,
      status: "available",
      user_id: userId,
    })
    .select()
    .single();

  if (error) throw new Error("Failed to create meter record: " + error.message);
  return meter;
}

// ── Helper: Connect user to a meter and send relay ON ────────

async function connectToMeter(supabase: any, serviceSupabase: any, userId: string, meter: any) {
  // Get wallet balance
  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance_kwh")
    .eq("user_id", userId)
    .maybeSingle();

  // Create connection
  const { data: connection, error: connError } = await supabase
    .from("meter_connections")
    .insert({
      user_id: userId,
      meter_id: meter.id,
      is_active: true,
    })
    .select()
    .single();

  if (connError) {
    return new Response(
      JSON.stringify({ error: connError.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Send MQTT relay ON if wallet has balance
  if (wallet && wallet.balance_kwh > 0 && meter.mqtt_meter_id) {
    const sent = await sendRelayOn(meter.mqtt_meter_id);
    if (sent) {
      await serviceSupabase.from("meters").update({ is_relay_on: true }).eq("id", meter.id);
      console.log(`⚡ Relay ON sent for meter ${meter.mqtt_meter_id}`);
    }
  }

  // Notification
  await serviceSupabase.rpc("insert_notification", {
    p_user_id: userId,
    p_type: "meter",
    p_title: "Meter Connected",
    p_body: `Connected to ${meter.name || "meter"} (${meter.mqtt_meter_id}). Your wallet balance will power this meter.`,
    p_icon: "⚡",
  });

  return new Response(
    JSON.stringify({
      success: true,
      connection,
      meter: {
        id: meter.id,
        name: meter.name,
        mqtt_meter_id: meter.mqtt_meter_id,
        property_name: meter.property_name,
        balance_kwh: meter.balance_kwh,
        max_kwh: meter.max_kwh,
        status: "connected",
      },
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
