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
    const { financial, tribology, lang } = await req.json();
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");

    if (!openrouterKey) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    const financialSummary =
      financial && financial.length > 0
        ? `\nFINANCIAL DATA (${financial.length} rows):\n${JSON.stringify(financial.slice(0, 50), null, 2)}`
        : "\nNo financial data provided.";

    const tribologySummary =
      tribology && tribology.length > 0
        ? `\nTRIBOLOGY DATA (${tribology.length} rows):\n${JSON.stringify(tribology.slice(0, 50), null, 2)}`
        : "\nNo tribology data provided.";

    const langMap: Record<string, string> = {
      es: "Spanish",
      en: "English",
      pt: "Portuguese (Brazilian)",
    };

    const prompt = `You are an industrial health diagnostic AI for ALS Global. Analyze the following data and return a JSON array of equipment health assessments.

For each unique equipment/equipment_id found across the data, create one entry with:
- "equipment": the equipment name/identifier
- "status": "healthy" if the equipment has R$ 0.00 replacement cost OR is in good condition, "replacement" if it has significant replacement costs or critical issues
- "cost": the estimated replacement cost in R$ (use 0 for healthy equipment)
- "recommendation": a brief maintenance recommendation in ${langMap[lang] || "Portuguese (Brazilian)"}

Rules:
- Green/Safe (status "healthy", cost R$ 0,00): equipment with no significant issues
- Red/Alert (status "replacement", cost > 0): equipment with high wear, critical levels, or replacement costs
- If financial data has replacement costs, use those for the cost field
- If tribology data shows elements above threshold, flag as replacement
- Return ONLY valid JSON array, no markdown fences, no explanation

${financialSummary}
${tribologySummary}`;

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
          temperature: 0.3,
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

    const rawText =
      llmData?.choices?.[0]?.message?.content || "";

    if (!rawText) {
      return new Response(
        JSON.stringify({ error: "Empty LLM response", raw: llmData }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Extract JSON array from the response
    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    const items = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    // Store report in Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("reports").insert({
      lang,
      financial_rows: financial?.length || 0,
      tribology_rows: tribology?.length || 0,
      items,
    });

    return new Response(JSON.stringify({ items }), {
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
