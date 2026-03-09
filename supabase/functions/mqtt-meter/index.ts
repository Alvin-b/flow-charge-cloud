import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * MQTT Meter Command Edge Function — COMPERE Protocol V1.9
 *
 * Sends commands to DDS666 4G smart meters via EMQX HTTP publish API.
 * All outbound topics follow COMPERE naming: MQTT_TELECTRL_{last8}, etc.
 *
 * Actions:
 *   relay_control   — Turn relay on/off (MQTT_TELECTRL)
 *   time_sync       — Sync meter clock (MQTT_SETTIME)
 *   param_read      — Read Modbus register (MQTT_SYS_READ)
 *   param_set       — Write Modbus register (MQTT_SYS__CFG)
 *   upload_freq_set — Set telemetry upload interval (MQTT_COMMOD_SET)
 *   upload_freq_read— Read telemetry upload interval (MQTT_COMMOD_READ)
 *   reconfig        — Reset meter MQTT connection (MQTT_RECONFIG)
 *   data_recall     — Recall monthly frozen data (MQTT_RECALL)
 *   device_info     — Get meter info from DB + request status via MQTT
 */

const MQTT_HTTP_API_URL = Deno.env.get("MQTT_HTTP_API_URL") || "";
const MQTT_HTTP_API_KEY = Deno.env.get("MQTT_HTTP_API_KEY") || "";

// ── Helpers ──────────────────────────────────────────────────

function last8(meterId: string): string {
  return meterId.slice(-8);
}

function generateOprid(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

function formatCompereTime(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) +
    pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds());
}

/**
 * Publish a message to the EMQX broker via its HTTP publish API.
 */
async function mqttPublish(topic: string, payload: Record<string, unknown>): Promise<boolean> {
  if (!MQTT_HTTP_API_URL) {
    console.warn("MQTT_HTTP_API_URL not configured — skipping publish");
    return false;
  }

  console.log(`[MQTT DEBUG] URL: ${MQTT_HTTP_API_URL}`);
  console.log(`[MQTT DEBUG] API_KEY length: ${MQTT_HTTP_API_KEY.length}, starts with: ${MQTT_HTTP_API_KEY.substring(0, 10)}...`);

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (MQTT_HTTP_API_KEY) {
    headers["Authorization"] = `Basic ${MQTT_HTTP_API_KEY}`;
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
      tls: false,
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(`MQTT publish failed [${res.status}]: ${text}`);
      return false;
    }
    await res.text(); // consume body
    console.log(`[MQTT] Published to ${topic}`);
    return true;
  } catch (err) {
    console.error("MQTT publish error:", err);
    return false;
  }
}

type SB = ReturnType<typeof createClient>;

// ── Action handlers ──────────────────────────────────────────

async function relayControl(sb: SB, userId: string, body: any) {
  const { meter_id, state } = body; // state: "1"=on, "0"=off
  if (!meter_id || !["0", "1"].includes(state)) {
    return { error: "meter_id and state ('0' or '1') required", status: 400 };
  }

  const oprid = generateOprid();
  const topic = `MQTT_TELECTRL_${last8(meter_id)}`;

  // Record command in DB
  await sb.from("meter_commands").insert({
    meter_id, user_id: userId, command_type: "relay_control",
    oprid, payload: { do1: state },
    status: "pending",
  });

  const sent = await mqttPublish(topic, { do1: state, oprid });
  return { data: { success: sent, oprid, topic }, status: 200 };
}

async function timeSync(sb: SB, userId: string, body: any) {
  const { meter_id } = body;
  if (!meter_id) return { error: "meter_id required", status: 400 };

  const oprid = generateOprid();
  const topic = `MQTT_SETTIME_${last8(meter_id)}`;
  const time = formatCompereTime(new Date());

  await sb.from("mqtt_operations").insert({
    meter_id, operation_id: oprid, operation_type: "time_sync", status: "pending",
  });

  const sent = await mqttPublish(topic, { oprid, time });
  return { data: { success: sent, oprid, topic }, status: 200 };
}

async function paramRead(sb: SB, userId: string, body: any) {
  const { meter_id, addr, lenth = "1", type = "1" } = body;
  if (!meter_id || !addr) return { error: "meter_id and addr required", status: 400 };

  const oprid = generateOprid();
  const topic = `MQTT_SYS_READ_${last8(meter_id)}`;

  await sb.from("mqtt_operations").insert({
    meter_id, operation_id: oprid, operation_type: "parameter_read",
    modbus_address: addr, parameter_length: parseInt(lenth), data_type: type,
    status: "pending",
  });

  const sent = await mqttPublish(topic, { oprid, addr, lenth, type });
  return { data: { success: sent, oprid, topic }, status: 200 };
}

async function paramSet(sb: SB, userId: string, body: any) {
  const { meter_id, addr, value, type = "1" } = body;
  if (!meter_id || !addr || value === undefined) {
    return { error: "meter_id, addr, and value required", status: 400 };
  }

  const oprid = generateOprid();
  const topic = `MQTT_SYS__CFG_${last8(meter_id)}`;

  await sb.from("mqtt_operations").insert({
    meter_id, operation_id: oprid, operation_type: "parameter_set",
    modbus_address: addr, requested_value: String(value), data_type: type,
    status: "pending",
  });

  const sent = await mqttPublish(topic, { oprid, addr, value: String(value), type });
  return { data: { success: sent, oprid, topic }, status: 200 };
}

async function uploadFreqSet(sb: SB, userId: string, body: any) {
  const { meter_id, level, frequency } = body; // level: "second"|"minute"
  if (!meter_id || !level || !frequency) {
    return { error: "meter_id, level, and frequency required", status: 400 };
  }

  const Cmd = level === "second" ? "0000" : "0001";
  const validSec = [30, 60, 300, 600, 900, 1200, 1800, 3600];
  const validMin = [1, 5, 10, 15, 20, 30, 60, 1440];
  const valid = level === "second" ? validSec : validMin;

  if (!valid.includes(Number(frequency))) {
    return { error: `Invalid ${level}-level frequency: ${frequency}. Valid: ${valid.join(",")}`, status: 400 };
  }

  const oprid = generateOprid();
  const topic = `MQTT_COMMOD_SET_${last8(meter_id)}`;

  await sb.from("mqtt_operations").insert({
    meter_id, operation_id: oprid, operation_type: "upload_freq_set",
    command_type: Cmd, requested_value: String(frequency), status: "pending",
  });

  const sent = await mqttPublish(topic, { oprid, Cmd, value: String(frequency), types: "1" });
  return { data: { success: sent, oprid, topic }, status: 200 };
}

async function uploadFreqRead(sb: SB, userId: string, body: any) {
  const { meter_id, level } = body;
  if (!meter_id || !level) return { error: "meter_id and level required", status: 400 };

  const Cmd = level === "second" ? "0000" : "0001";
  const oprid = generateOprid();
  const topic = `MQTT_COMMOD_READ_${last8(meter_id)}`;

  await sb.from("mqtt_operations").insert({
    meter_id, operation_id: oprid, operation_type: "upload_freq_read",
    command_type: Cmd, status: "pending",
  });

  const sent = await mqttPublish(topic, { oprid, Cmd, types: "1" });
  return { data: { success: sent, oprid, topic }, status: 200 };
}

async function reconfig(sb: SB, userId: string, body: any) {
  const { meter_id } = body;
  if (!meter_id) return { error: "meter_id required", status: 400 };

  const oprid = generateOprid();
  const topic = `MQTT_RECONFIG_${last8(meter_id)}`;

  await sb.from("mqtt_operations").insert({
    meter_id, operation_id: oprid, operation_type: "reconfig", status: "pending",
  });

  const sent = await mqttPublish(topic, { oprid });
  return { data: { success: sent, oprid, topic }, status: 200 };
}

async function dataRecall(sb: SB, userId: string, body: any) {
  const { meter_id, date } = body; // date: "yyyyMM"
  if (!meter_id || !date) return { error: "meter_id and date (yyyyMM) required", status: 400 };

  const oprid = generateOprid();
  const topic = `MQTT_RECALL_${last8(meter_id)}`;

  await sb.from("mqtt_operations").insert({
    meter_id, operation_id: oprid, operation_type: "data_recall",
    recall_date: date, recall_type: "2", status: "pending",
  });

  const sent = await mqttPublish(topic, { oprid, date, oprtype: "2" });
  return { data: { success: sent, oprid, topic }, status: 200 };
}

async function deviceInfo(sb: SB, userId: string, body: any) {
  const { meter_id } = body;
  if (!meter_id) return { error: "meter_id required", status: 400 };

  // Look up meter from DB
  const { data: meter } = await sb.from("meters").select("*").eq("id", meter_id).single();
  if (!meter) return { error: "Meter not found", status: 404 };

  // Get latest MQTT reading
  const { data: latestReading } = await sb.from("mqtt_meter_readings")
    .select("ua,ia,zyggl,f,zglys,reading_time")
    .eq("meter_id", meter_id)
    .order("reading_time", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    data: {
      success: true,
      meter: {
        id: meter.id, name: meter.name, property_name: meter.property_name,
        status: meter.status, balance_kwh: meter.balance_kwh,
        max_kwh: meter.max_kwh, last_sync: meter.last_sync,
      },
      latest_reading: latestReading,
    },
    status: 200,
  };
}

// ── Main serve ───────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const serviceSb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await sb.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");
    const body = req.method === "POST" ? await req.json() : {};

    const handlers: Record<string, (sb: SB, userId: string, body: any) => Promise<any>> = {
      relay_control: relayControl,
      time_sync: timeSync,
      param_read: paramRead,
      param_set: paramSet,
      upload_freq_set: uploadFreqSet,
      upload_freq_read: uploadFreqRead,
      reconfig: reconfig,
      data_recall: dataRecall,
      device_info: deviceInfo,
    };

    const handler = action ? handlers[action] : null;
    if (!handler) {
      return new Response(
        JSON.stringify({ error: `Unknown action. Use: ${Object.keys(handlers).join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service client for DB operations (commands/operations tables have service_role policies)
    const result = await handler(serviceSb, user.id, body);

    return new Response(JSON.stringify(result.data || { error: result.error }), {
      status: result.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[mqtt-meter] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
