import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * MQTT Webhook Handler — COMPERE Protocol V1.9
 *
 * Receives meter telemetry from EMQX broker webhook rule.
 *
 * Expected body from EMQX webhook action:
 * {
 *   "topic": "MQTT_RT_DATA",          // COMPERE topic name
 *   "payload": "{\"id\":\"...\", ...}",  // JSON string or object
 *   "clientid": "meter_client_id",
 *   "timestamp": 1234567890
 * }
 */

// ── Helpers ──────────────────────────────────────────────────

function parsePayload(raw: unknown): Record<string, any> | null {
  try {
    if (typeof raw === "string") return JSON.parse(raw);
    if (raw && typeof raw === "object") return raw as Record<string, any>;
    return null;
  } catch {
    return null;
  }
}

function extractMeterId(payload: Record<string, any>): string | null {
  // COMPERE uses MN (Meter Number), also check id/code for compatibility
  return payload.MN || payload.id || payload.code || null;
}

/** Get a value from payload trying both original and lowercase keys */
function pv(payload: Record<string, any>, ...keys: string[]): any {
  for (const k of keys) {
    if (payload[k] !== undefined) return payload[k];
    const lower = k.toLowerCase();
    if (payload[lower] !== undefined) return payload[lower];
    // Try uppercase first letter
    const upper = k.charAt(0).toUpperCase() + k.slice(1);
    if (payload[upper] !== undefined) return payload[upper];
  }
  return undefined;
}

function parseCompereTime(t: string): Date | null {
  if (!t || t.length < 8) return null;
  try {
    const y = parseInt(t.substring(0, 4));
    const m = parseInt(t.substring(4, 6));
    const d = parseInt(t.substring(6, 8));
    const H = t.length >= 10 ? parseInt(t.substring(8, 10)) : 0;
    const M = t.length >= 12 ? parseInt(t.substring(10, 12)) : 0;
    const S = t.length >= 14 ? parseInt(t.substring(12, 14)) : 0;
    return new Date(Date.UTC(y, m - 1, d, H, M, S));
  } catch {
    return null;
  }
}

type SB = ReturnType<typeof createClient>;

// ── MQTT_RT_DATA ─────────────────────────────────────────────

async function handleRtData(sb: SB, p: Record<string, any>, meterId: string) {
  const timeStr = p.time || p.Ts || p.ts;
  const readingTime = timeStr ? parseCompereTime(timeStr) : new Date();

  const { error } = await sb.from("mqtt_meter_readings").insert({
    meter_id: meterId,
    ua: pv(p, "ua", "Ua"), ub: pv(p, "ub", "Ub"), uc: pv(p, "uc", "Uc"),
    ia: pv(p, "ia", "Ia"), ib: pv(p, "ib", "Ib"), ic: pv(p, "ic", "Ic"),
    uab: pv(p, "uab", "Uab"), ubc: pv(p, "ubc", "Ubc"), uca: pv(p, "uca", "Uca"),
    pa: pv(p, "pa", "Pa"), pb: pv(p, "pb", "Pb"), pc: pv(p, "pc", "Pc"),
    zyggl: pv(p, "zyggl", "Zyggl"),
    qa: pv(p, "qa", "Qa"), qb: pv(p, "qb", "Qb"), qc: pv(p, "qc", "Qc"),
    zwggl: pv(p, "zwggl", "Zwggl"),
    sa: pv(p, "sa", "Sa"), sb: pv(p, "sb", "Sb"), sc: pv(p, "sc", "Sc"),
    zszgl: pv(p, "zszgl", "Zszgl"),
    pfa: pv(p, "pfa", "PFa", "Pfa"), pfb: pv(p, "pfb", "PFb", "Pfb"), pfc: pv(p, "pfc", "PFc", "Pfc"),
    zglys: pv(p, "zglys", "Zglys"),
    f: pv(p, "f", "F"),
    u_zero_seq: p.U0, u_pos_seq: p["U+"], u_neg_seq: p["U-"],
    i_zero_seq: p.I0, i_pos_seq: p["I+"], i_neg_seq: p["I-"],
    ua_phase_angle: p.UXJA, ub_phase_angle: p.UXJB, uc_phase_angle: p.UXJC,
    ia_phase_angle: p.IXJA, ib_phase_angle: p.IXJB, ic_phase_angle: p.IXJC,
    voltage_unbalance_rate: p.unb, current_unbalance_rate: p.inb,
    active_power_demand: p.pdm, reactive_power_demand: p.qdm, apparent_power_demand: p.sdm,
    residual_current: p.ig,
    temp_a: p.ta, temp_b: p.tb, temp_c: p.tc, temp_n: p.tn,
    reading_time: readingTime,
    mqtt_raw_payload: p,
  });

  if (error) console.error("[RT_DATA] Insert error:", error);
  else console.log(`[RT_DATA] Stored for ${meterId}`);

  // Legacy meter_readings table uses UUID meter_id — skip if not valid UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(meterId)) {
    await sb.from("meter_readings").insert({
      meter_id: meterId,
      voltage: pv(p, "ua", "Ua"),
      current_amps: pv(p, "ia", "Ia"),
      power_watts: pv(p, "zyggl", "Zyggl") ? pv(p, "zyggl", "Zyggl") * 1000 : null,
      energy_kwh: null,
      frequency_hz: pv(p, "f", "F"),
      power_factor: pv(p, "zglys", "Zglys") ?? pv(p, "pfa", "PFa"),
      raw_payload: p,
    }).then(({ error: e }) => { if (e) console.error("[RT_DATA] Legacy insert error:", e); });
  }
}

// ── MQTT_ENY_NOW ─────────────────────────────────────────────

async function handleEnyNow(sb: SB, p: Record<string, any>, meterId: string) {
  const readingTime = p.time ? parseCompereTime(p.time) : new Date();

  const { error } = await sb.from("mqtt_energy_readings").insert({
    meter_id: meterId,
    import_total_active: p.zygsz, export_total_active: p.fygsz,
    import_total_reactive: p.zwgsz, export_total_reactive: p.fwgsz,
    import_tariff1_active: p.zyjsz, export_tariff1_active: p.fyjsz,
    import_tariff2_active: p.zyfsz, export_tariff2_active: p.fyfsz,
    import_tariff3_active: p.zypsz, export_tariff3_active: p.fypsz,
    import_tariff4_active: p.zyvsz, export_tariff4_active: p.fyvsz,
    import_tariff5_active: p.zydvsz, export_tariff5_active: p.fydvsz,
    import_tariff6_active: p.zy6sz, export_tariff6_active: p.fy6sz,
    monthly_max_active_power_demand: p.dmpmax,
    monthly_max_active_power_timestamp: p.dmpmaxoct ? new Date(p.dmpmaxoct * 1000) : null,
    monthly_max_apparent_power_demand: p.dmsmax,
    monthly_max_apparent_power_timestamp: p.dmsmaxoct ? new Date(p.dmsmaxoct * 1000) : null,
    ua_thd: p.uathd, ub_thd: p.ubthd, uc_thd: p.ucthd,
    ia_thd: p.iathd, ib_thd: p.ibthd, ic_thd: p.icthd,
    ua_3rd_harmonic: p.uaxbl3, ub_3rd_harmonic: p.ubxbl3, uc_3rd_harmonic: p.ucxbl3,
    ia_3rd_harmonic: p.iaxbl3, ib_3rd_harmonic: p.ibxbl3, ic_3rd_harmonic: p.icxbl3,
    ua_5th_harmonic: p.uaxbl5, ub_5th_harmonic: p.ubxbl5, uc_5th_harmonic: p.ucxbl5,
    ia_5th_harmonic: p.iaxbl5, ib_5th_harmonic: p.ibxbl5, ic_5th_harmonic: p.icxbl5,
    ua_7th_harmonic: p.uaxbl7, ub_7th_harmonic: p.ubxbl7, uc_7th_harmonic: p.ucxbl7,
    ia_7th_harmonic: p.iaxbl7, ib_7th_harmonic: p.ibxbl7, ic_7th_harmonic: p.icxbl7,
    reading_time: readingTime,
    mqtt_raw_payload: p,
  });

  if (error) console.error("[ENY_NOW] Insert error:", error);
  else console.log(`[ENY_NOW] Stored for ${meterId}`);
}

// ── MQTT_DAY_DATA ────────────────────────────────────────────

async function handleDayData(sb: SB, p: Record<string, any>, meterId: string) {
  const readingTime = p.time ? parseCompereTime(p.time) : new Date();
  const readingDate = readingTime ? readingTime.toISOString().split("T")[0] : new Date().toISOString().split("T")[0];

  const { error } = await sb.from("mqtt_daily_readings").upsert({
    meter_id: meterId,
    import_total_active: p.zygdd, export_total_active: p.fygdd,
    import_total_reactive: p.zwgdd, export_total_reactive: p.fwgdd,
    import_tariff1_active: p.zyjsz, export_tariff1_active: p.fyjsz,
    import_tariff2_active: p.zyfsz, export_tariff2_active: p.fyfsz,
    import_tariff3_active: p.zypsz, export_tariff3_active: p.fypsz,
    import_tariff4_active: p.zyvsz, export_tariff4_active: p.fyvsz,
    reading_date: readingDate,
    reading_time: readingTime,
    mqtt_raw_payload: p,
  }, { onConflict: "meter_id,reading_date" });

  if (error) console.error("[DAY_DATA] Upsert error:", error);
  else console.log(`[DAY_DATA] Stored for ${meterId} date=${readingDate}`);
}

// ── MQTT_TELEIND ─────────────────────────────────────────────

async function handleTeleind(sb: SB, p: Record<string, any>, meterId: string) {
  const readingTime = p.time ? parseCompereTime(p.time) : new Date();
  const [diValue, doValue] = (p.value || "@").split("@");

  const { error } = await sb.from("mqtt_meter_status").insert({
    meter_id: meterId,
    digital_inputs: diValue,
    digital_outputs: doValue,
    reading_time: readingTime,
    mqtt_raw_payload: p,
  });

  if (error) console.error("[TELEIND] Insert error:", error);
  else console.log(`[TELEIND] DI/DO for ${meterId}: ${diValue}/${doValue}`);
}

// ── Command/Operation responses ──────────────────────────────

async function handleCommandResponse(sb: SB, p: Record<string, any>, meterId: string, topic: string) {
  const oprid = p.oprid;
  const success = p.code === "01";
  const now = new Date().toISOString();

  // Update meter_commands table (relay control responses)
  if (topic === "MQTT_TELECTRL_REP") {
    const { error } = await sb.from("meter_commands")
      .update({
        status: success ? "completed" : "failed",
        response: p,
        response_code: p.code,
        response_message: p.msg || null,
        responded_at: now,
        completed_at: now,
      })
      .eq("oprid", oprid);

    if (error) console.error(`[${topic}] Update error:`, error);
    else console.log(`[${topic}] Command ${oprid}: ${success ? "OK" : "FAIL"}`);
    return;
  }

  // All other responses go to mqtt_operations
  const updateData: Record<string, any> = {
    status: success ? "completed" : "failed",
    response_code: p.code,
    response_message: p.msg || null,
    response_received_at: now,
    mqtt_raw_payload: p,
  };

  // MQTT_SYS_REPLY includes read values
  if (topic === "MQTT_SYS_REPLY") {
    updateData.modbus_address = p.addr;
    updateData.read_value = p.value;
  }

  // MQTT_COMMOD_READ_REP includes frequency values
  if (topic === "MQTT_COMMOD_READ_REP") {
    updateData.command_type = p.Cmd;
    updateData.read_value = p.value;
  }

  const { error } = await sb.from("mqtt_operations")
    .update(updateData)
    .eq("operation_id", oprid);

  if (error) console.error(`[${topic}] Update error:`, error);
  else console.log(`[${topic}] Op ${oprid}: ${success ? "OK" : "FAIL"}`);
}

// ── MQTT_RECALL_REP ──────────────────────────────────────────

async function handleRecallResponse(sb: SB, p: Record<string, any>, meterId: string) {
  const oprid = p.oprid;
  const success = p.code === "01";

  const { error } = await sb.from("mqtt_operations")
    .update({
      status: success ? "completed" : "failed",
      response_code: p.code,
      response_message: p.msg || null,
      response_received_at: new Date().toISOString(),
      mqtt_raw_payload: p,
    })
    .eq("operation_id", oprid);

  if (!error) console.log(`[RECALL_REP] ${oprid}: ${success ? "OK" : "FAIL"}`);

  // If successful, also store the recalled data as a daily reading
  if (success && p.time) {
    const readingDate = p.time.substring(0, 4) + "-" + p.time.substring(4, 6) + "-01";
    await sb.from("mqtt_daily_readings").upsert({
      meter_id: meterId,
      import_total_active: p.zygdd, export_total_active: p.fygdd,
      import_total_reactive: p.zwgdd, export_total_reactive: p.fwgdd,
      import_tariff1_active: p.zyjdd, export_tariff1_active: p.fyjdd,
      import_tariff2_active: p.zyfdd, export_tariff2_active: p.fyfdd,
      import_tariff3_active: p.zypdd, export_tariff3_active: p.fypdd,
      import_tariff4_active: p.zyvdd, export_tariff4_active: p.fyvdd,
      reading_date: readingDate,
      reading_time: new Date(),
      mqtt_raw_payload: p,
    }, { onConflict: "meter_id,reading_date" });
  }
}

// ── Response topics map ──────────────────────────────────────

const RESPONSE_TOPICS = new Set([
  "MQTT_TELECTRL_REP",
  "MQTT_METER_TIME_REP",
  "MQTT_SYS_SET_REP",
  "MQTT_SYS_REPLY",
  "MQTT_RECONFIG_REPLY",
  "MQTT_COMMOD_SET_REP",
  "MQTT_COMMOD_READ_REP",
]);

// ── Main handler ─────────────────────────────────────────────

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate webhook secret
    const webhookSecret = Deno.env.get("MQTT_WEBHOOK_SECRET");
    const provided = req.headers.get("X-Webhook-Secret") ||
      req.headers.get("Authorization")?.replace("Bearer ", "");

    if (!webhookSecret || provided !== webhookSecret) {
      console.error("[Webhook] Unauthorized");
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { topic, payload: payloadRaw } = body;

    if (!topic || payloadRaw === undefined) {
      return new Response(JSON.stringify({ error: "Missing topic or payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = parsePayload(payloadRaw);
    if (!payload) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Webhook] ${topic}:`, JSON.stringify(payload).substring(0, 200));

    const meterId = extractMeterId(payload);
    if (!meterId) {
      return new Response(JSON.stringify({ error: "No meter ID in payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Route by COMPERE topic
    switch (topic) {
      case "MQTT_RT_DATA":
        if (payload.isend !== "0") await handleRtData(sb, payload, meterId);
        break;
      case "MQTT_ENY_NOW":
        if (payload.isend !== "0") await handleEnyNow(sb, payload, meterId);
        break;
      case "MQTT_DAY_DATA":
        if (payload.isend !== "0") await handleDayData(sb, payload, meterId);
        break;
      case "MQTT_TELEIND":
        await handleTeleind(sb, payload, meterId);
        break;
      case "MQTT_RECALL_REP":
        await handleRecallResponse(sb, payload, meterId);
        break;
      default:
        if (RESPONSE_TOPICS.has(topic)) {
          await handleCommandResponse(sb, payload, meterId, topic);
        } else {
          console.warn(`[Webhook] Unknown topic: ${topic}`);
        }
        break;
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Webhook] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
