import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * MQTT Webhook Handler - COMPERE Protocol V1.9
 *
 * Receives meter data pushes from MQTT broker via webhook following COMPERE MQTT protocol.
 * Supports:
 * - MQTT_RT_DATA: Real-time second-level data (electrical parameters)
 * - MQTT_ENY_NOW: Minute-level energy data
 * - MQTT_DAY_DATA: Daily frozen data
 * - MQTT_TELEIND: Remote signal data (DI/DO)
 * - MQTT_TELECTRL_REP: Remote control responses
 * - MQTT_RECALL_REP: Data recall responses
 * - MQTT_METER_TIME_REP: Time sync responses
 * - MQTT_SYS_SET_REP: Parameter set responses
 * - MQTT_SYS_REPLY: Parameter read responses
 * - MQTT_RECONFIG_REPLY: MQTT reconfig responses
 * - MQTT_COMMOD_SET_REP: Upload frequency set responses
 * - MQTT_COMMOD_READ_REP: Upload frequency read responses
 *
 * Expected webhook payload:
 * {
 *   "topic": "MQTT_RT_DATA",
 *   "payload": "{...}",
 *   "qos": 1,
 *   "timestamp": 1234567890,
 *   "clientid": "device_id"
 * }
 */

interface ComperePayload {
  id: string;
  time?: string;
  isend?: "0" | "1";
  [key: string]: any;
}

async function parsePayload(payloadStr: unknown): Promise<Record<string, any> | null> {
  try {
    if (typeof payloadStr === "string") {
      return JSON.parse(payloadStr);
    }
    return payloadStr as Record<string, any>;
  } catch (e) {
    console.error("Failed to parse payload:", e);
    return null;
  }
}

function extractMeterId(payload: ComperePayload): string | null {
  const meterId = payload.id || payload.code || payload.meter_id;
  if (meterId && typeof meterId === "string") {
    return meterId;
  }
  return null;
}

function parseCompereTime(timeStr: string): Date | null {
  if (!timeStr || timeStr.length < 8) return null;
  try {
    const year = parseInt(timeStr.substring(0, 4));
    const month = parseInt(timeStr.substring(4, 6));
    const day = parseInt(timeStr.substring(6, 8));
    const hour = timeStr.length >= 10 ? parseInt(timeStr.substring(8, 10)) : 0;
    const minute = timeStr.length >= 12 ? parseInt(timeStr.substring(10, 12)) : 0;
    const second = timeStr.length >= 14 ? parseInt(timeStr.substring(12, 14)) : 0;

    return new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  } catch (e) {
    console.error("Failed to parse COMPERE time:", timeStr, e);
    return null;
  }
}

async function handleRealTimeSecondLevelData(
  supabase: ReturnType<typeof createClient>,
  payload: ComperePayload,
  meterId: string
) {
  const readingTime = payload.time ? parseCompereTime(payload.time) : new Date();

  const readingData = {
    meter_id: meterId,
    ua: payload.ua,
    ub: payload.ub,
    uc: payload.uc,
    ia: payload.ia,
    ib: payload.ib,
    ic: payload.ic,
    uab: payload.uab,
    ubc: payload.ubc,
    uca: payload.uca,
    pa: payload.pa,
    pb: payload.pb,
    pc: payload.pc,
    zyggl: payload.zyggl,
    qa: payload.qa,
    qb: payload.qb,
    qc: payload.qc,
    zwggl: payload.zwggl,
    sa: payload.sa,
    sb: payload.sb,
    sc: payload.sc,
    zszgl: payload.zszgl,
    pfa: payload.pfa,
    pfb: payload.pfb,
    pfc: payload.pfc,
    zglys: payload.zglys,
    f: payload.f,
    u_zero_seq: payload.U0,
    u_pos_seq: payload["U+"],
    u_neg_seq: payload["U-"],
    i_zero_seq: payload.I0,
    i_pos_seq: payload["I+"],
    i_neg_seq: payload["I-"],
    ua_phase_angle: payload.UXJA,
    ub_phase_angle: payload.UXJB,
    uc_phase_angle: payload.UXJC,
    ia_phase_angle: payload.IXJA,
    ib_phase_angle: payload.IXJB,
    ic_phase_angle: payload.IXJC,
    voltage_unbalance_rate: payload.unb,
    current_unbalance_rate: payload.inb,
    active_power_demand: payload.pdm,
    reactive_power_demand: payload.qdm,
    apparent_power_demand: payload.sdm,
    residual_current: payload.ig,
    temp_a: payload.ta,
    temp_b: payload.tb,
    temp_c: payload.tc,
    temp_n: payload.tn,
    reading_time: readingTime,
    mqtt_raw_payload: payload,
  };

  const { error } = await supabase
    .from("mqtt_meter_readings")
    .insert([readingData]);

  if (error) {
    console.error("Failed to insert meter reading:", error);
  } else {
    console.log(`[MQTT_RT_DATA] Stored reading for meter ${meterId}`);
  }

  await supabase
    .from("meters")
    .update({ status: "connected", updated_at: new Date().toISOString() })
    .eq("id", meterId);
}

async function handleEnergyNowData(
  supabase: ReturnType<typeof createClient>,
  payload: ComperePayload,
  meterId: string
) {
  const readingTime = payload.time ? parseCompereTime(payload.time) : new Date();

  const energyData = {
    meter_id: meterId,
    import_total_active: payload.zygsz,
    export_total_active: payload.fygsz,
    import_total_reactive: payload.zwgsz,
    export_total_reactive: payload.fwgsz,
    import_tariff1_active: payload.zyjsz,
    export_tariff1_active: payload.fyjsz,
    import_tariff2_active: payload.zyfsz,
    export_tariff2_active: payload.fyfsz,
    import_tariff3_active: payload.zypsz,
    export_tariff3_active: payload.fypsz,
    import_tariff4_active: payload.zyvsz,
    export_tariff4_active: payload.fyvsz,
    import_tariff5_active: payload.zydvsz,
    export_tariff5_active: payload.fydvsz,
    import_tariff6_active: payload.zy6sz,
    export_tariff6_active: payload.fy6sz,
    monthly_max_active_power_demand: payload.dmpmax,
    monthly_max_active_power_timestamp: payload.dmpmaxoct
      ? new Date(payload.dmpmaxoct * 1000)
      : null,
    monthly_max_apparent_power_demand: payload.dmsmax,
    monthly_max_apparent_power_timestamp: payload.dmsmaxoct
      ? new Date(payload.dmsmaxoct * 1000)
      : null,
    ua_thd: payload.uathd,
    ub_thd: payload.ubthd,
    uc_thd: payload.ucthd,
    ia_thd: payload.iathd,
    ib_thd: payload.ibthd,
    ic_thd: payload.icthd,
    ua_3rd_harmonic: payload.uaxbl3,
    ub_3rd_harmonic: payload.ubxbl3,
    uc_3rd_harmonic: payload.ucxbl3,
    ia_3rd_harmonic: payload.iaxbl3,
    ib_3rd_harmonic: payload.ibxbl3,
    ic_3rd_harmonic: payload.icxbl3,
    ua_5th_harmonic: payload.uaxbl5,
    ub_5th_harmonic: payload.ubxbl5,
    uc_5th_harmonic: payload.ucxbl5,
    ia_5th_harmonic: payload.iaxbl5,
    ib_5th_harmonic: payload.ibxbl5,
    ic_5th_harmonic: payload.icxbl5,
    ua_7th_harmonic: payload.uaxbl7,
    ub_7th_harmonic: payload.ubxbl7,
    uc_7th_harmonic: payload.ucxbl7,
    ia_7th_harmonic: payload.iaxbl7,
    ib_7th_harmonic: payload.ibxbl7,
    ic_7th_harmonic: payload.icxbl7,
    reading_time: readingTime,
    mqtt_raw_payload: payload,
  };

  const { error } = await supabase
    .from("mqtt_energy_readings")
    .insert([energyData]);

  if (error) {
    console.error("Failed to insert energy reading:", error);
  } else {
    console.log(`[MQTT_ENY_NOW] Stored energy reading for meter ${meterId}`);
  }
}

async function handleDailyData(
  supabase: ReturnType<typeof createClient>,
  payload: ComperePayload,
  meterId: string
) {
  const readingTime = payload.time ? parseCompereTime(payload.time) : new Date();
  const readingDate = new Date(readingTime);
  readingDate.setHours(0, 0, 0, 0);

  const dailyData = {
    meter_id: meterId,
    import_total_active: payload.zygdd,
    export_total_active: payload.fygdd,
    import_total_reactive: payload.zwgdd,
    export_total_reactive: payload.fwgdd,
    import_tariff1_active: payload.zyjsz,
    export_tariff1_active: payload.fyjsz,
    import_tariff2_active: payload.zyfsz,
    export_tariff2_active: payload.fyfsz,
    import_tariff3_active: payload.zypsz,
    export_tariff3_active: payload.fypsz,
    import_tariff4_active: payload.zyvsz,
    export_tariff4_active: payload.fyvsz,
    reading_date: readingDate.toISOString().split("T")[0],
    reading_time: readingTime,
    mqtt_raw_payload: payload,
  };

  const { error } = await supabase
    .from("mqtt_daily_readings")
    .insert([dailyData])
    .on("duplicate", "UPDATE");

  if (error) {
    console.error("Failed to insert daily reading:", error);
  } else {
    console.log(`[MQTT_DAY_DATA] Stored daily reading for meter ${meterId}`);
  }
}

async function handleRemoteSignalData(
  supabase: ReturnType<typeof createClient>,
  payload: ComperePayload,
  meterId: string
) {
  const readingTime = payload.time ? parseCompereTime(payload.time) : new Date();
  const [diValue, doValue] = (payload.value || "@").split("@");

  const statusData = {
    meter_id: meterId,
    digital_inputs: diValue,
    digital_outputs: doValue,
    reading_time: readingTime,
    mqtt_raw_payload: payload,
  };

  const { error } = await supabase
    .from("mqtt_meter_status")
    .insert([statusData]);

  if (error) {
    console.error("Failed to insert meter status:", error);
  } else {
    console.log(`[MQTT_TELEIND] Stored remote signal for meter ${meterId}`);
  }
}

async function handleRemoteControlResponse(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, any>,
  meterId: string
) {
  const operationId = payload.oprid;
  const responseCode = payload.code;

  const { error } = await supabase
    .from("mqtt_commands")
    .update({
      status: responseCode === "01" ? "acknowledged" : "failed",
      response_code: responseCode,
      response_message: payload.msg,
      responded_at: new Date().toISOString(),
    })
    .eq("operation_id", operationId)
    .eq("meter_id", meterId);

  if (error) {
    console.error("Failed to update command response:", error);
  } else {
    console.log(
      `[MQTT_TELECTRL_REP] Updated command ${operationId}: ${
        responseCode === "01" ? "success" : "failed"
      }`
    );
  }
}

async function handleTimeSyncResponse(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, any>,
  meterId: string
) {
  const operationId = payload.oprid;
  const responseCode = payload.code;

  const { error } = await supabase
    .from("mqtt_operations")
    .update({
      status: responseCode === "01" ? "completed" : "failed",
      response_code: responseCode,
      response_message: payload.msg,
      response_received_at: new Date().toISOString(),
    })
    .eq("operation_id", operationId)
    .eq("meter_id", meterId);

  if (error) {
    console.error("Failed to update time sync response:", error);
  } else {
    console.log(`[MQTT_METER_TIME_REP] Time sync ${operationId}: ${payload.code}`);
  }
}

async function handleParameterSetResponse(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, any>,
  meterId: string
) {
  const operationId = payload.oprid;

  const { error } = await supabase
    .from("mqtt_operations")
    .update({
      status: payload.code === "01" ? "completed" : "failed",
      response_code: payload.code,
      response_received_at: new Date().toISOString(),
    })
    .eq("operation_id", operationId)
    .eq("meter_id", meterId);

  if (error) {
    console.error("Failed to update parameter set response:", error);
  } else {
    console.log(`[MQTT_SYS_SET_REP] Parameter set ${operationId}: ${payload.code}`);
  }
}

async function handleParameterReadResponse(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, any>,
  meterId: string
) {
  const operationId = payload.oprid;

  const { error } = await supabase
    .from("mqtt_operations")
    .update({
      modbus_address: payload.addr,
      read_value: payload.value,
      status: payload.code === "01" ? "completed" : "failed",
      response_code: payload.code,
      response_received_at: new Date().toISOString(),
    })
    .eq("operation_id", operationId)
    .eq("meter_id", meterId);

  if (error) {
    console.error("Failed to update parameter read response:", error);
  } else {
    console.log(`[MQTT_SYS_REPLY] Parameter read ${operationId}: ${payload.value}`);
  }
}

async function handleReconfigResponse(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, any>,
  meterId: string
) {
  const operationId = payload.oprid;

  const { error } = await supabase
    .from("mqtt_operations")
    .update({
      status: payload.code === "01" ? "completed" : "failed",
      response_code: payload.code,
      response_message: payload.msg,
      response_received_at: new Date().toISOString(),
    })
    .eq("operation_id", operationId)
    .eq("meter_id", meterId);

  if (error) {
    console.error("Failed to update reconfig response:", error);
  } else {
    console.log(`[MQTT_RECONFIG_REPLY] Reconfig ${operationId}: ${payload.code}`);
  }
}

async function handleUploadFrequencySetResponse(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, any>,
  meterId: string
) {
  const operationId = payload.oprid;

  const { error } = await supabase
    .from("mqtt_operations")
    .update({
      status: payload.code === "01" ? "completed" : "failed",
      response_code: payload.code,
      response_received_at: new Date().toISOString(),
    })
    .eq("operation_id", operationId)
    .eq("meter_id", meterId);

  if (error) {
    console.error("Failed to update upload frequency set response:", error);
  }
}

async function handleUploadFrequencyReadResponse(
  supabase: ReturnType<typeof createClient>,
  payload: Record<string, any>,
  meterId: string
) {
  const operationId = payload.oprid;

  const { error } = await supabase
    .from("mqtt_operations")
    .update({
      command_type: payload.Cmd,
      read_value: payload.value,
      status: payload.code === "01" ? "completed" : "failed",
      response_code: payload.code,
      response_received_at: new Date().toISOString(),
    })
    .eq("operation_id", operationId)
    .eq("meter_id", meterId);

  if (error) {
    console.error("Failed to update upload frequency read response:", error);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate webhook secret
    const webhookSecret = Deno.env.get("MQTT_WEBHOOK_SECRET");
    if (webhookSecret) {
      const providedSecret = req.headers.get("X-Webhook-Secret") || 
        req.headers.get("Authorization")?.replace("Bearer ", "");
      if (providedSecret !== webhookSecret) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.warn("[MQTT Webhook] MQTT_WEBHOOK_SECRET not configured - running without auth");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { topic, payload: payloadStr, timestamp } = body;

    if (!topic || payloadStr === undefined) {
      return new Response(
        JSON.stringify({ error: "Missing topic or payload" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const payload = await parsePayload(payloadStr);
    if (!payload || typeof payload !== "object") {
      return new Response(
        JSON.stringify({ error: "Invalid payload format" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[MQTT Webhook] Topic: ${topic}, Payload:`, JSON.stringify(payload).substring(0, 200));

    const meterId = extractMeterId(payload);
    if (!meterId) {
      return new Response(
        JSON.stringify({ error: "Could not extract meter ID from payload" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Route based on COMPERE topic names
    if (topic === "MQTT_RT_DATA") {
      if (payload.isend === "1") {
        await handleRealTimeSecondLevelData(supabase, payload, meterId);
      }
    } else if (topic === "MQTT_ENY_NOW") {
      if (payload.isend === "1") {
        await handleEnergyNowData(supabase, payload, meterId);
      }
    } else if (topic === "MQTT_DAY_DATA") {
      if (payload.isend === "1") {
        await handleDailyData(supabase, payload, meterId);
      }
    } else if (topic === "MQTT_TELEIND") {
      await handleRemoteSignalData(supabase, payload, meterId);
    } else if (topic === "MQTT_TELECTRL_REP") {
      await handleRemoteControlResponse(supabase, payload, meterId);
    } else if (topic === "MQTT_METER_TIME_REP") {
      await handleTimeSyncResponse(supabase, payload, meterId);
    } else if (topic === "MQTT_SYS_SET_REP") {
      await handleParameterSetResponse(supabase, payload, meterId);
    } else if (topic === "MQTT_SYS_REPLY") {
      await handleParameterReadResponse(supabase, payload, meterId);
    } else if (topic === "MQTT_RECONFIG_REPLY") {
      await handleReconfigResponse(supabase, payload, meterId);
    } else if (topic === "MQTT_COMMOD_SET_REP") {
      await handleUploadFrequencySetResponse(supabase, payload, meterId);
    } else if (topic === "MQTT_COMMOD_READ_REP") {
      await handleUploadFrequencyReadResponse(supabase, payload, meterId);
    } else if (topic === "MQTT_RECALL_REP") {
      const operationId = payload.oprid;
      const { error } = await supabase
        .from("mqtt_operations")
        .update({
          status: payload.code === "01" ? "completed" : "failed",
          response_code: payload.code,
          response_message: payload.msg,
          response_received_at: new Date().toISOString(),
          mqtt_raw_payload: payload,
        })
        .eq("operation_id", operationId);

      if (!error) {
        console.log(`[MQTT_RECALL_REP] Data recall ${operationId}: ${payload.code}`);
      }
    } else {
      console.warn(`[MQTT Webhook] Unknown topic: ${topic}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "COMPERE MQTT message processed",
      }),
      {
        status: 200,
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
