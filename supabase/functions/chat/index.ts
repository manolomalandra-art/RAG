import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const bodyText = await req.text();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(bodyText);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const message = (parsed.message as string) || "";
    const history = (parsed.history as { role: string; content: string }[]) || [];
    const context = (parsed.context as string) || "";
    const lang = (parsed.lang as string) || "pt";
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");

    if (!openrouterKey) {
      throw new Error("OPENROUTER_API_KEY not configured");
    }

    if (!message.trim()) {
      return new Response(
        JSON.stringify({ error: "Empty message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const langMap: Record<string, string> = {
      es: "Spanish",
      en: "English",
      pt: "Portuguese (Brazilian)",
    };

    const systemPrompt = `You are an industrial health diagnostic assistant for ALS Global. You have access to equipment data from tribology analysis and financial cost records.

CONTEXT - Equipment Data (from uploaded files):
${context}

RULES:
- Answer in ${langMap[lang] || "Portuguese (Brazilian)"}
- Base your answers ONLY on the data provided above
- You can discuss equipment health status, costs, maintenance recommendations, and comparisons
- For costs, always use the format R$ X.XXX,XX
- If asked about data not in the context, say you don't have that information
- Be concise and professional
- You can suggest which equipment needs priority attention based on severity and cost
- Keep responses under 300 words unless the user asks for detail`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-20),
      { role: "user", content: message },
    ];

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openrouterKey}`,
          "HTTP-Referer": "https://industrial-report.als.com",
          "X-Title": "ALS Industrial Report - Chat",
        },
        body: JSON.stringify({
          model: "nvidia/nemotron-3-super-120b-a12b:free",
          messages,
          temperature: 0.3,
          max_tokens: 2048,
        }),
      }
    );

    const llmData = await response.json();

    if (llmData.error) {
      return new Response(
        JSON.stringify({ error: "LLM API error", details: llmData.error }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const reply = llmData?.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
