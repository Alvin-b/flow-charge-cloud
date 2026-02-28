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

    // Daily: last 7 days grouped by day
    if (action === "daily") {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("consumption_logs")
        .select("kwh_consumed, consumed_at")
        .eq("user_id", userId)
        .gte("consumed_at", sevenDaysAgo.toISOString())
        .order("consumed_at", { ascending: true });

      if (error) throw error;

      // Group by day
      const days: Record<string, number> = {};
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        days[key] = 0;
      }

      for (const row of data || []) {
        const key = row.consumed_at.slice(0, 10);
        if (days[key] !== undefined) {
          days[key] += parseFloat(row.kwh_consumed);
        }
      }

      const result = Object.entries(days).map(([date, kwh]) => {
        const d = new Date(date);
        return {
          day: dayNames[d.getDay()],
          date,
          kwh: parseFloat(kwh.toFixed(2)),
        };
      });

      return new Response(JSON.stringify({ data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Weekly: last 4 weeks grouped by week
    if (action === "weekly") {
      const fourWeeksAgo = new Date();
      fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

      const { data, error } = await supabase
        .from("consumption_logs")
        .select("kwh_consumed, consumed_at")
        .eq("user_id", userId)
        .gte("consumed_at", fourWeeksAgo.toISOString())
        .order("consumed_at", { ascending: true });

      if (error) throw error;

      // Group into 4 weeks
      const now = new Date();
      const weeks: { week: string; kwh: number }[] = [];
      for (let w = 3; w >= 0; w--) {
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - (w + 1) * 7);
        const weekEnd = new Date(now);
        weekEnd.setDate(weekEnd.getDate() - w * 7);

        let total = 0;
        for (const row of data || []) {
          const t = new Date(row.consumed_at);
          if (t >= weekStart && t < weekEnd) {
            total += parseFloat(row.kwh_consumed);
          }
        }

        weeks.push({ week: `W${4 - w}`, kwh: parseFloat(total.toFixed(2)) });
      }

      return new Response(JSON.stringify({ data: weeks }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Monthly: last 3 months grouped by month
    if (action === "monthly") {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const { data, error } = await supabase
        .from("consumption_logs")
        .select("kwh_consumed, consumed_at")
        .eq("user_id", userId)
        .gte("consumed_at", threeMonthsAgo.toISOString())
        .order("consumed_at", { ascending: true });

      if (error) throw error;

      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];
      const months: Record<string, number> = {};
      for (let m = 2; m >= 0; m--) {
        const d = new Date();
        d.setMonth(d.getMonth() - m);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        months[key] = 0;
      }

      for (const row of data || []) {
        const key = row.consumed_at.slice(0, 7);
        if (months[key] !== undefined) {
          months[key] += parseFloat(row.kwh_consumed);
        }
      }

      const KES_PER_KWH = 24;
      const result = Object.entries(months).map(([key, kwh]) => {
        const [y, m] = key.split("-");
        return {
          month: monthNames[parseInt(m) - 1],
          kwh: parseFloat(kwh.toFixed(2)),
          cost: parseFloat((kwh * KES_PER_KWH).toFixed(0)),
        };
      });

      return new Response(JSON.stringify({ data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hourly: today's consumption grouped by hour
    if (action === "hourly") {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("consumption_logs")
        .select("kwh_consumed, consumed_at")
        .eq("user_id", userId)
        .gte("consumed_at", todayStart.toISOString())
        .order("consumed_at", { ascending: true });

      if (error) throw error;

      // Group by hour
      const hours: Record<number, number> = {};
      for (let h = 0; h < 24; h++) hours[h] = 0;

      for (const row of data || []) {
        const h = new Date(row.consumed_at).getHours();
        hours[h] += parseFloat(row.kwh_consumed);
      }

      const hourLabels = [
        "12AM", "1AM", "2AM", "3AM", "4AM", "5AM",
        "6AM", "7AM", "8AM", "9AM", "10AM", "11AM",
        "12PM", "1PM", "2PM", "3PM", "4PM", "5PM",
        "6PM", "7PM", "8PM", "9PM", "10PM", "11PM",
      ];

      // Only return hours 6AM-11PM for a cleaner chart
      const result = [];
      for (let h = 6; h <= 23; h++) {
        result.push({
          hr: hourLabels[h],
          kw: parseFloat(hours[h].toFixed(3)),
        });
      }

      return new Response(JSON.stringify({ data: result }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Summary: this month total, vs last month, daily average, peak hour
    if (action === "summary") {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // This month
      const { data: thisMonthData } = await supabase
        .from("consumption_logs")
        .select("kwh_consumed")
        .eq("user_id", userId)
        .gte("consumed_at", thisMonthStart.toISOString());

      const thisMonth = (thisMonthData || []).reduce(
        (sum, r) => sum + parseFloat(r.kwh_consumed), 0
      );

      // Last month
      const { data: lastMonthData } = await supabase
        .from("consumption_logs")
        .select("kwh_consumed")
        .eq("user_id", userId)
        .gte("consumed_at", lastMonthStart.toISOString())
        .lt("consumed_at", thisMonthStart.toISOString());

      const lastMonth = (lastMonthData || []).reduce(
        (sum, r) => sum + parseFloat(r.kwh_consumed), 0
      );

      // Week total
      const { data: weekData } = await supabase
        .from("consumption_logs")
        .select("kwh_consumed")
        .eq("user_id", userId)
        .gte("consumed_at", sevenDaysAgo.toISOString());

      const weekTotal = (weekData || []).reduce(
        (sum, r) => sum + parseFloat(r.kwh_consumed), 0
      );

      // Daily average (this month)
      const daysInMonth = now.getDate();
      const dailyAvg = daysInMonth > 0 ? thisMonth / daysInMonth : 0;

      // Change %
      const changePercent =
        lastMonth > 0
          ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
          : 0;

      // Peak hour today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: todayData } = await supabase
        .from("consumption_logs")
        .select("kwh_consumed, consumed_at")
        .eq("user_id", userId)
        .gte("consumed_at", todayStart.toISOString());

      const hourTotals: Record<number, number> = {};
      for (const row of todayData || []) {
        const h = new Date(row.consumed_at).getHours();
        hourTotals[h] = (hourTotals[h] || 0) + parseFloat(row.kwh_consumed);
      }
      let peakHour = -1;
      let peakVal = 0;
      for (const [h, v] of Object.entries(hourTotals)) {
        if (v > peakVal) {
          peakVal = v;
          peakHour = parseInt(h);
        }
      }
      const peakLabel =
        peakHour >= 0
          ? `${peakHour === 0 ? 12 : peakHour > 12 ? peakHour - 12 : peakHour} ${peakHour >= 12 ? "PM" : "AM"}`
          : "--";

      return new Response(
        JSON.stringify({
          this_month: parseFloat(thisMonth.toFixed(1)),
          last_month: parseFloat(lastMonth.toFixed(1)),
          week_total: parseFloat(weekTotal.toFixed(1)),
          daily_avg: parseFloat(dailyAvg.toFixed(1)),
          change_percent: changePercent,
          peak_hour: peakLabel,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown action. Use: daily, weekly, monthly, hourly, summary" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Consumption stats error:", err);
    const msg = err instanceof Error ? err.message : "Server error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
