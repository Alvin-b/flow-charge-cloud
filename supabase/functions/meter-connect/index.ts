import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

  const userId = user.id;
  const url = new URL(req.url);
  const action = url.searchParams.get("action");

  const serviceSupabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Connect to a meter by meter_code
    if (action === "connect" && req.method === "POST") {
      const body = await req.json();
      const { meter_code, connection_type } = body;

      if (!meter_code || typeof meter_code !== "string" || meter_code.trim().length === 0 || meter_code.trim().length > 50) {
        return new Response(
          JSON.stringify({ error: "Valid meter_code is required (max 50 chars)" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate connection_type if provided
      const validTypes = ["manual_code", "qr_scan", "nfc"];
      const connType = connection_type && validTypes.includes(connection_type) ? connection_type : "manual_code";

      // Rate limit: 3 connect attempts per minute
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

      // Check if user already has an active connection
      const { data: existingConnection } = await supabase
        .from("meter_connections")
        .select("id, meter_id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (existingConnection) {
        return new Response(
          JSON.stringify({
            error:
              "You already have an active meter connection. Disconnect first.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Find the meter by code
      const { data: meter, error: meterError } = await serviceSupabase
        .from("meters")
        .select("*")
        .eq("meter_code", meter_code.trim())
        .maybeSingle();

      if (meterError || !meter) {
        return new Response(
          JSON.stringify({
            error: "Meter not found. Check the code and try again.",
          }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (meter.status !== "available") {
        const statusMsg: Record<string, string> = {
          connected: "This meter is already connected to another user.",
          offline: "This meter is currently offline.",
          maintenance: "This meter is under maintenance.",
        };
        return new Response(
          JSON.stringify({
            error: statusMsg[meter.status] || "Meter is not available.",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Get user's wallet balance
      const { data: wallet } = await supabase
        .from("wallets")
        .select("balance_kwh")
        .eq("user_id", userId)
        .maybeSingle();

      // Create the connection
      const { data: connection, error: connError } = await supabase
        .from("meter_connections")
        .insert({
          user_id: userId,
          meter_id: meter.id,
          connection_type: connType,
          is_active: true,
          initial_wallet_balance: wallet?.balance_kwh ?? 0,
          initial_meter_balance: meter.balance_kwh,
        })
        .select()
        .single();

      if (connError) {
        return new Response(
          JSON.stringify({ error: connError.message }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Meter status is updated to 'connected' by the DB trigger

      // Notification
      await serviceSupabase.rpc("insert_notification", {
        p_user_id: userId,
        p_type: "meter",
        p_title: "Meter Connected",
        p_body: `Connected to ${meter.name || "meter"} (${meter.meter_code}). Your wallet balance will power this meter.`,
        p_icon: "⚡",
      });

      return new Response(
        JSON.stringify({
          success: true,
          connection,
          meter: {
            id: meter.id,
            name: meter.name,
            meter_code: meter.meter_code,
            property_name: meter.property_name,
            balance_kwh: meter.balance_kwh,
            max_kwh: meter.max_kwh,
            status: "connected",
          },
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Disconnect from a meter
    if (action === "disconnect" && req.method === "POST") {
      const body = await req.json();
      const { connection_id } = body;

      if (!connection_id) {
        return new Response(
          JSON.stringify({ error: "connection_id is required" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Get meter name before disconnecting for notification
      const { data: connInfo } = await supabase
        .from("meter_connections")
        .select("meter_id, meters(name, meter_code)")
        .eq("id", connection_id)
        .single();

      // Use the DB function for atomic disconnect
      const { data, error } = await supabase.rpc("disconnect_from_meter", {
        connection_uuid: connection_id,
      });

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Notification
      const meterName = (connInfo as any)?.meters?.name || "meter";
      await serviceSupabase.rpc("insert_notification", {
        p_user_id: userId,
        p_type: "meter",
        p_title: "Meter Disconnected",
        p_body: `Disconnected from ${meterName}. Your wallet balance is preserved.`,
        p_icon: "🔌",
      });

      return new Response(
        JSON.stringify({ success: true }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user's active connection with meter details
    if (action === "active") {
      const { data, error } = await supabase.rpc("get_active_connection", {
        user_uuid: userId,
      });

      return new Response(
        JSON.stringify({ connection: data?.[0] ?? null }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get connection history
    if (action === "history") {
      const { data, error } = await supabase
        .from("meter_connections")
        .select("*, meters(name, meter_code, property_name)")
        .eq("user_id", userId)
        .order("connected_at", { ascending: false })
        .limit(20);

      return new Response(
        JSON.stringify({ connections: data ?? [] }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Consumption stats for the active connection
    if (action === "consumption_stats") {
      const { data: activeConn } = await supabase.rpc("get_active_connection", {
        user_uuid: userId,
      });

      const conn = activeConn?.[0];
      if (!conn) {
        return new Response(
          JSON.stringify({ connected: false, total_consumed: 0, rate: 0, estimated_hours_remaining: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get meter rate
      const { data: meter } = await serviceSupabase
        .from("meters")
        .select("consumption_rate_per_hour")
        .eq("id", conn.meter_id)
        .single();

      const rate = parseFloat(meter?.consumption_rate_per_hour || "0");
      const walletBalance = parseFloat(conn.wallet_balance || "0");
      const estimatedHours = rate > 0 ? walletBalance / rate : 0;

      // Total consumed for this connection
      const { data: logs } = await supabase
        .from("consumption_logs")
        .select("kwh_consumed")
        .eq("connection_id", conn.connection_id);

      const totalConsumed = (logs || []).reduce(
        (sum: number, r: any) => sum + parseFloat(r.kwh_consumed), 0
      );

      return new Response(
        JSON.stringify({
          connected: true,
          total_consumed: parseFloat(totalConsumed.toFixed(2)),
          rate_per_hour: rate,
          wallet_balance: walletBalance,
          estimated_hours_remaining: parseFloat(estimatedHours.toFixed(1)),
          estimated_days_remaining: parseFloat((estimatedHours / 24).toFixed(1)),
        }),
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
