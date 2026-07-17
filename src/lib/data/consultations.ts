import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ConsultationInsert } from "@/types/database";

export async function createConsultation(values: ConsultationInsert) {
  const supabase = createAdminClient() ?? (await createClient());
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from("consultations")
    .insert(values)
    .select("id")
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.message.includes("preferred_date") || error.message.includes("preferred_time")) {
      const fallbackValues = { ...values };
      delete fallbackValues.preferred_date;
      delete fallbackValues.preferred_time;
      const fallback = await supabase
        .from("consultations")
        .insert(fallbackValues)
        .select("id")
        .limit(1)
        .maybeSingle();
      if (!fallback.error) return fallback.data as { id: string } | null;
    }
    return undefined;
  }
  return data as { id: string } | null;
}
