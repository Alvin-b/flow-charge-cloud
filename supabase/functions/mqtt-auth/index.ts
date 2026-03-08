import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * MQTT Device Authentication Webhook for EMQX
 *
 * EMQX calls this endpoint to verify if a connecting MQTT client
 * (meter device) is allowed to connect. Only meters registered in
 * the database with a matching mqtt_meter_id are permitted.
 *
 * EMQX HTTP Auth configuration:
 *   URL: https://<project>.supabase.co/functions/v1/mqtt-auth
 *   Method: POST
 *   Headers: X-Webhook-Secret: <your secret>
 *   Body template:
 *     {"clientid":"${clientid}","username":"${username}","password":"${password}"}
 *
 * Response:
 *   200 + {"result": "allow"} → allow connection
 *   200 + {"result": "deny"}  → reject connection
 *   Any other status          → EMQX treats as "ignore" (falls through to next auth)
 */

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
      console.error("[mqtt-auth] Unauthorized webhook call");
      return new Response(JSON.stringify({ result: "deny" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { clientid, username, password } = body;

    console.log(`[mqtt-auth] Auth request: clientid=${clientid}, username=${username}`);

    if (!clientid && !username) {
      console.warn("[mqtt-auth] No clientid or username provided");
      return new Response(JSON.stringify({ result: "deny" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Extract meter number from clientid or username
    // COMPERE meters typically use the MN as part of the client ID
    const meterNumber = username || clientid;

    // Check if this meter exists in our database
    const { data: meter, error } = await sb
      .from("meters")
      .select("id, mqtt_meter_id, status")
      .eq("mqtt_meter_id", meterNumber)
      .maybeSingle();

    if (error) {
      console.error("[mqtt-auth] DB error:", error);
      // On DB error, deny to be safe
      return new Response(JSON.stringify({ result: "deny" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!meter) {
      // Also try matching by last 8 chars (some meters use abbreviated IDs)
      const { data: meterByPartial } = await sb
        .from("meters")
        .select("id, mqtt_meter_id, status")
        .filter("mqtt_meter_id", "ilike", `%${meterNumber.slice(-8)}`)
        .maybeSingle();

      if (!meterByPartial) {
        console.warn(`[mqtt-auth] DENIED: Unknown meter ${meterNumber}`);
        return new Response(JSON.stringify({ result: "deny" }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`[mqtt-auth] ALLOWED (partial match): ${meterNumber} → ${meterByPartial.mqtt_meter_id}`);
      
      // Update meter status to reflect it's online
      await sb.from("meters").update({ last_sync: new Date().toISOString() }).eq("id", meterByPartial.id);

      return new Response(JSON.stringify({ result: "allow", is_superuser: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[mqtt-auth] ALLOWED: meter ${meter.mqtt_meter_id} (status: ${meter.status})`);
    
    // Update last_sync timestamp
    await sb.from("meters").update({ last_sync: new Date().toISOString() }).eq("id", meter.id);

    return new Response(JSON.stringify({ result: "allow", is_superuser: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[mqtt-auth] Error:", err);
    return new Response(JSON.stringify({ result: "deny" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
