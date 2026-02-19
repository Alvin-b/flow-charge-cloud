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
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = claimsData.claims.sub;

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
