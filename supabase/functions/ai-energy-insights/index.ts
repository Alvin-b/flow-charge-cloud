import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transactions } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const totalKwh = transactions.reduce((s: number, t: any) => s + Number(t.amount_kwh), 0);
    const totalKes = transactions.reduce((s: number, t: any) => s + Number(t.amount_kes), 0);
    const count = transactions.length;
    const recharges = transactions.filter((t: any) => t.type === "recharge");
    const transfers = transactions.filter((t: any) => t.type === "transfer_out" || t.type === "transfer_in");

    const prompt = `You are an AI energy analyst for a prepaid electricity system in Kenya. Analyze this user's consumption data and provide exactly 3 insights as a JSON array.

User Data (last 3 months):
- Total energy: ${totalKwh.toFixed(1)} kWh
- Total spent: KES ${totalKes.toFixed(0)}
- Transaction count: ${count}
- Recharges: ${recharges.length}
- Transfers: ${transfers.length}
- Rate: KES 24/kWh

Recent transactions (latest 10):
${JSON.stringify(transactions.slice(0, 10).map((t: any) => ({ kwh: t.amount_kwh, kes: t.amount_kes, type: t.type, date: t.created_at.slice(0, 10) })))}

Return ONLY a JSON array with exactly 3 objects, each having:
- type: "prediction" | "anomaly" | "tip"
- title: short title (max 5 words)
- description: actionable insight (max 2 sentences)
- severity: "info" | "warning" | "critical" (for anomalies)
- metric: optional key metric value string

Include at least one prediction and one tip. Include an anomaly only if data suggests one.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a concise energy analyst AI. Return only valid JSON arrays. No markdown." },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_insights",
              description: "Return energy consumption insights",
              parameters: {
                type: "object",
                properties: {
                  insights: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        type: { type: "string", enum: ["prediction", "anomaly", "tip"] },
                        title: { type: "string" },
                        description: { type: "string" },
                        severity: { type: "string", enum: ["info", "warning", "critical"] },
                        metric: { type: "string" },
                      },
                      required: ["type", "title", "description"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["insights"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_insights" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify({ insights: parsed.insights }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try parsing content directly
    const content = result.choices?.[0]?.message?.content;
    if (content) {
      try {
        const parsed = JSON.parse(content);
        const insights = Array.isArray(parsed) ? parsed : parsed.insights;
        return new Response(JSON.stringify({ insights }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        // ignore
      }
    }

    throw new Error("Could not parse AI response");
  } catch (e) {
    console.error("ai-energy-insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
