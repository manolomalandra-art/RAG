import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function callAnalyzeHealth(payload: {
  financial: Record<string, unknown>[];
  tribology: Record<string, unknown>[];
  lang: string;
}) {
  const { data, error } = await supabase.functions.invoke("analyze-health", {
    body: payload,
  });
  if (error) throw error;
  return data;
}
