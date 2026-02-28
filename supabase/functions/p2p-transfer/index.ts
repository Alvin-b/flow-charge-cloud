import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const KES_PER_KWH = 24;
const DAILY_TRANSFER_LIMIT_KWH = 50;
const MIN_TRANSFER_KWH = 0.5;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (action === "send" && req.method === "POST") {
      const { recipient_phone, amount_kwh } = await req.json();

      if (!recipient_phone || !amount_kwh) {
        return new Response(
          JSON.stringify({ error: "recipient_phone and amount_kwh are required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const kwh = parseFloat(amount_kwh);
      if (isNaN(kwh) || kwh < MIN_TRANSFER_KWH) {
        return new Response(
          JSON.stringify({ error: `Minimum transfer is ${MIN_TRANSFER_KWH} kWh` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Format phone for lookup
      let phone = recipient_phone.replace(/[\s\-+]/g, "");
      if (phone.startsWith("0")) phone = "254" + phone.substring(1);
      if (!phone.startsWith("254")) phone = "254" + phone;

      // Check daily limit
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: todayTransfers } = await supabase
        .from("transactions")
        .select("amount_kwh")
        .eq("user_id", user.id)
        .eq("type", "transfer_out")
        .eq("status", "completed")
        .gte("created_at", todayStart.toISOString());

      const usedToday = (todayTransfers || []).reduce(
        (sum: number, t: any) => sum + parseFloat(t.amount_kwh),
        0
      );

      if (usedToday + kwh > DAILY_TRANSFER_LIMIT_KWH) {
        return new Response(
          JSON.stringify({
            error: `Daily limit exceeded. Used ${usedToday.toFixed(1)} of ${DAILY_TRANSFER_LIMIT_KWH} kWh today. Remaining: ${(DAILY_TRANSFER_LIMIT_KWH - usedToday).toFixed(1)} kWh`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get sender wallet
      const { data: senderWallet, error: swErr } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (swErr || !senderWallet) {
        return new Response(
          JSON.stringify({ error: "Sender wallet not found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (parseFloat(senderWallet.balance_kwh) < kwh) {
        return new Response(
          JSON.stringify({ error: `Insufficient balance. You have ${senderWallet.balance_kwh} kWh` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find recipient by phone in auth.users (metadata.phone or phone)
      // First look in profiles or auth metadata
      const { data: recipientProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, phone")
        .or(`phone.eq.${phone},phone.eq.${recipient_phone},phone.eq.0${phone.substring(3)}`);

      let recipientUserId: string | null = null;
      let recipientName: string | null = null;

      if (recipientProfiles && recipientProfiles.length > 0) {
        recipientUserId = recipientProfiles[0].id;
        recipientName = recipientProfiles[0].full_name;
      }

      // Cannot send to self
      if (recipientUserId === user.id) {
        return new Response(
          JSON.stringify({ error: "Cannot transfer to yourself" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const kesEquiv = parseFloat((kwh * KES_PER_KWH).toFixed(2));

      // --- Atomic transfer ---
      // 1. Deduct from sender
      const newSenderBalance = parseFloat(senderWallet.balance_kwh) - kwh;
      const { error: deductErr } = await supabase
        .from("wallets")
        .update({ balance_kwh: newSenderBalance })
        .eq("user_id", user.id)
        .eq("balance_kwh", senderWallet.balance_kwh); // Optimistic lock

      if (deductErr) {
        return new Response(
          JSON.stringify({ error: "Transfer failed - balance changed. Please retry." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 2. Credit recipient (if found)
      if (recipientUserId) {
        const { data: recipientWallet } = await supabase
          .from("wallets")
          .select("balance_kwh")
          .eq("user_id", recipientUserId)
          .single();

        if (recipientWallet) {
          await supabase
            .from("wallets")
            .update({
              balance_kwh: parseFloat(recipientWallet.balance_kwh) + kwh,
            })
            .eq("user_id", recipientUserId);
        }
      }

      // 3. Create outgoing transaction
      const { data: outTx } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type: "transfer_out",
          amount_kwh: kwh,
          amount_kes: kesEquiv,
          status: "completed",
          recipient_user_id: recipientUserId,
          recipient_phone: phone,
          completed_at: new Date().toISOString(),
          metadata: {
            recipient_name: recipientName,
            sender_balance_before: parseFloat(senderWallet.balance_kwh),
            sender_balance_after: newSenderBalance,
          },
        })
        .select()
        .single();

      // 4. Create incoming transaction for recipient
      const senderName = (await supabase.from("profiles").select("full_name").eq("id", user.id).single()).data?.full_name || "Someone";
      if (recipientUserId) {
        await supabase.from("transactions").insert({
          user_id: recipientUserId,
          type: "transfer_in",
          amount_kwh: kwh,
          amount_kes: kesEquiv,
          status: "completed",
          recipient_user_id: user.id,
          recipient_phone: user.phone || "",
          completed_at: new Date().toISOString(),
          metadata: { sender_name: senderName },
        });

        // Notification for recipient
        await supabase.rpc("insert_notification", {
          p_user_id: recipientUserId,
          p_type: "transfer",
          p_title: "Energy Received",
          p_body: `${kwh} kWh received from ${senderName} (+KES ${kesEquiv})`,
          p_icon: "🟢",
        });
      }

      // Notification for sender
      await supabase.rpc("insert_notification", {
        p_user_id: user.id,
        p_type: "transfer",
        p_title: "Transfer Sent",
        p_body: `${kwh} kWh sent to ${recipientName || phone} (KES ${kesEquiv})`,
        p_icon: "📤",
      });

      return new Response(
        JSON.stringify({
          success: true,
          transaction_id: outTx?.id,
          amount_kwh: kwh,
          amount_kes: kesEquiv,
          recipient_phone: phone,
          recipient_name: recipientName,
          new_balance: newSenderBalance,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "daily_usage") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: todayTransfers } = await supabase
        .from("transactions")
        .select("amount_kwh")
        .eq("user_id", user.id)
        .eq("type", "transfer_out")
        .eq("status", "completed")
        .gte("created_at", todayStart.toISOString());

      const usedToday = (todayTransfers || []).reduce(
        (sum: number, t: any) => sum + parseFloat(t.amount_kwh),
        0
      );

      return new Response(
        JSON.stringify({
          used_today: usedToday,
          daily_limit: DAILY_TRANSFER_LIMIT_KWH,
          remaining: DAILY_TRANSFER_LIMIT_KWH - usedToday,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "history") {
      const { data: transfers, error: hErr } = await supabase
        .from("transactions")
        .select("*")
        .or(`user_id.eq.${user.id},recipient_user_id.eq.${user.id}`)
        .in("type", ["transfer_out", "transfer_in"])
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(30);

      if (hErr) {
        return new Response(
          JSON.stringify({ error: hErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ transfers: transfers || [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: send, daily_usage, history" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("P2P Transfer error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
