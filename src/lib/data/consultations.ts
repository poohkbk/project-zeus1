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

  if (error) return undefined;
  return data as { id: string } | null;
}
