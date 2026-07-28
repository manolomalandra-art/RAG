import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { items, lang } = await req.json();
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");

    if (!openrouterKey) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ items: [], summary: "No data to analyze" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const langMap: Record<string, string> = {
      es: "Spanish",
      en: "English",
      pt: "Portuguese (Brazilian)",
    };

    const itemsSummary = items.map((item: Record<string, unknown>, i: number) =>
      `[${i + 1}] Equipment: ${item.equipment} | Model: ${item.model} | Compartment: ${item.compartment} (${item.compartmentType}) | Site: ${item.site} | Tag: ${item.tag} | Serial: ${item.serial} | Status: ${item.severity} | Cost from file: R$ ${item.cost} | Evaluation: ${item.evaluation} | Recommendation: ${item.recommendation}`
    ).join("\n");

    const prompt = `You are an industrial health diagnostic expert for ALS Global. You receive equipment data that was ALREADY cross-referenced between tribology lab results and financial cost data.

Your task: analyze each item and provide a final diagnostic summary in ${langMap[lang] || "Portuguese (Brazilian)"}.

For EACH item, return:
- "equipment": full equipment identifier (e.g. "HARVESTER KOMATSU PC200 - MOTOR")
- "tag": the fleet tag
- "serial": the serial number
- "site": the site/plant
- "compartment": compartment name
- "status": "healthy" if status is Normal or Caution AND cost is R$ 0, "replacement" if status is Abnormal or Severe
- "severity": the original severity (Normal/Caution/Abnormal/Severe)
- "cost": the total replacement cost in R$ (0 for healthy items)
- "costBreakdown": detailed cost breakdown from the financial file
- "evaluation": brief diagnostic based on the tribology evaluation (1-2 sentences)
- "recommendation": actionable maintenance recommendation in ${langMap[lang] || "Portuguese (Brazilian)"} based on the inspection actions

Rules:
- GREEN (status "healthy", cost R$ 0,00): Equipment is operating within normal parameters
- RED (status "replacement", cost > 0): Equipment needs attention, cost is the repair/replacement estimate
- Keep recommendations SHORT and ACTIONABLE (1-2 sentences max)
- Return ONLY valid JSON array, no markdown fences, no explanation

DATA:
${itemsSummary}`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openrouterKey}`,
          "HTTP-Referer": "https://industrial-report.als.com",
          "X-Title": "ALS Industrial Report",
        },
        body: JSON.stringify({
          model: "nvidia/nemotron-3-super-120b-a12b:free",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
          max_tokens: 4096,
        }),
      }
    );

    const llmData = await response.json();

    if (llmData.error) {
      return new Response(
        JSON.stringify({ error: "LLM API error", details: llmData.error }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const rawText = llmData?.choices?.[0]?.message?.content || "";

    if (!rawText) {
      return new Response(
        JSON.stringify({ error: "Empty LLM response", raw: llmData }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract JSON array
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    let analyzedItems = jsonMatch ? JSON.parse(jsonMatch[0]) : items;

    // Ensure all original items are present (LLM might miss some)
    if (analyzedItems.length < items.length) {
      analyzedItems = items;
    }

    // Store report in Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("reports").insert({
      lang,
      financial_rows: 0,
      tribology_rows: items.length,
      items: analyzedItems,
    });

    return new Response(JSON.stringify({ items: analyzedItems }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
