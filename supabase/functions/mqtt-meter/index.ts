import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { connect as mqttConnect } from "https://deno.land/x/mqtt@0.1.4/deno/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// MQTT Configuration (UPDATE THESE WITH YOUR BROKER DETAILS)
const MQTT_CONFIG = {
  broker: Deno.env.get("MQTT_BROKER_URL") || "mqtt://broker.hivemq.com:1883",
  username: Deno.env.get("MQTT_USERNAME") || "",
  password: Deno.env.get("MQTT_PASSWORD") || "",
  clientId: Deno.env.get("MQTT_CLIENT_ID") || `powerflow-${crypto.randomUUID()}`,
};

// Topic structure: meters/{meter_id}/{action}
const TOPICS = {
  status: (meterId: string) => `meters/${meterId}/status`,
  consumption: (meterId: string) => `meters/${meterId}/consumption`,
  command: (meterId: string) => `meters/${meterId}/command`,
  response: (meterId: string) => `meters/${meterId}/response`,
};

/**
 * Connect to MQTT broker
 */
async function connectMQTT() {
  const client = await mqttConnect({
    hostname: new URL(MQTT_CONFIG.broker).hostname,
    port: parseInt(new URL(MQTT_CONFIG.broker).port || "1883"),
    username: MQTT_CONFIG.username || undefined,
    password: MQTT_CONFIG.password || undefined,
    clientId: MQTT_CONFIG.clientId,
  });
  return client;
}

/**
 * Publish command to meter
 */
async function sendMeterCommand(meterId: string, command: string, payload: any) {
  const client = await connectMQTT();
  
  const message = {
    command,
    payload,
    timestamp: new Date().toISOString(),
  };

  await client.publish(TOPICS.command(meterId), JSON.stringify(message), { qos: 1 });
  
  // Wait for response with timeout
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      client.disconnect();
      reject(new Error("Meter response timeout"));
    }, 30000); // 30 second timeout

    client.subscribe(TOPICS.response(meterId));
    
    client.on("message", (topic: string, message: Uint8Array) => {
      if (topic === TOPICS.response(meterId)) {
        clearTimeout(timeout);
        client.disconnect();
        const response = JSON.parse(new TextDecoder().decode(message));
        resolve(response);
      }
    });
  });
}

/**
 * Get meter status via MQTT
 */
async function getMeterStatus(meterId: string) {
  try {
    const response = await sendMeterCommand(meterId, "get_status", {});
    return response;
  } catch (error) {
    console.error(`Failed to get meter status for ${meterId}:`, error);
    return null;
  }
}

/**
 * Send connection command to meter
 */
async function connectMeter(meterId: string, userId: string) {
  const response = await sendMeterCommand(meterId, "connect_user", {
    user_id: userId,
    connected_at: new Date().toISOString(),
  });
  return response;
}

/**
 * Send disconnection command to meter
 */
async function disconnectMeter(meterId: string, userId: string) {
  const response = await sendMeterCommand(meterId, "disconnect_user", {
    user_id: userId,
    disconnected_at: new Date().toISOString(),
  });
  return response;
}

/**
 * Update meter balance
 */
async function updateMeterBalance(meterId: string, balanceKwh: number) {
  const response = await sendMeterCommand(meterId, "set_balance", {
    balance_kwh: balanceKwh,
    updated_at: new Date().toISOString(),
  });
  return response;
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

    // Get meter info by code
    if (action === "device_info" && req.method === "POST") {
      const { meter_code } = await req.json();

      if (!meter_code) {
        return new Response(
          JSON.stringify({ error: "meter_code is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Get meter from database
      const { data: meter, error: meterError } = await serviceSupabase
        .from("meters")
        .select("*")
        .eq("meter_code", meter_code)
        .maybeSingle();

      if (meterError || !meter) {
        return new Response(
          JSON.stringify({ error: "Meter not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Try to get live status from MQTT
      const mqttStatus = await getMeterStatus(meter.id);

      return new Response(
        JSON.stringify({
          success: true,
          meter: {
            id: meter.id,
            meter_code: meter.meter_code,
            name: meter.name,
            property_name: meter.property_name,
            status: meter.status,
            balance_kwh: meter.balance_kwh,
            max_kwh: meter.max_kwh,
            consumption_rate_per_hour: meter.consumption_rate_per_hour,
            mqtt_status: mqttStatus || { online: false, message: "Status unavailable" },
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get real-time meter status via MQTT
    if (action === "device_status" && req.method === "POST") {
      const { meter_id } = await req.json();

      if (!meter_id) {
        return new Response(
          JSON.stringify({ error: "meter_id is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const status = await getMeterStatus(meter_id);

      if (!status) {
        return new Response(
          JSON.stringify({ error: "Failed to get meter status via MQTT" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(JSON.stringify({ success: true, status }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sync meter connection status via MQTT
    if (action === "sync_connection" && req.method === "POST") {
      const { connection_id } = await req.json();

      // Get connection details
      const { data: connection } = await serviceSupabase
        .from("meter_connections")
        .select("*, meters(*)")
        .eq("id", connection_id)
        .single();

      if (!connection) {
        return new Response(
          JSON.stringify({ error: "Connection not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Send connect command to meter via MQTT
      const result = await connectMeter(connection.meter_id, connection.user_id);

      return new Response(
        JSON.stringify({
          success: true,
          mqtt_response: result,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Sync meter disconnection via MQTT
    if (action === "sync_disconnection" && req.method === "POST") {
      const { meter_id } = await req.json();

      // Send disconnect command to meter via MQTT
      const result = await disconnectMeter(meter_id, userId);

      return new Response(
        JSON.stringify({
          success: true,
          mqtt_response: result,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Update meter balance via MQTT (used when wallet balance changes)
    if (action === "update_balance" && req.method === "POST") {
      const { meter_id, balance_kwh } = await req.json();

      if (!meter_id || balance_kwh === undefined) {
        return new Response(
          JSON.stringify({ error: "meter_id and balance_kwh are required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Send balance update command to meter via MQTT
      const result = await updateMeterBalance(meter_id, balance_kwh);

      // Update database
      await serviceSupabase
        .from("meters")
        .update({ balance_kwh, updated_at: new Date().toISOString() })
        .eq("id", meter_id);

      return new Response(
        JSON.stringify({
          success: true,
          mqtt_response: result,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: "Unknown action. Use: device_info, device_status, sync_connection, sync_disconnection, update_balance",
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
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
