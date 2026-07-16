import "server-only";

import { cmsDefaultTags } from "@/data/cms-seed";
import { createAdminClient } from "@/lib/supabase/admin";
import { sortKoreanTags } from "@/lib/tag-utils";

type ContentTagRow = {
  id: string;
  label: string;
  created_at?: string | null;
};

export async function listContentTags() {
  const supabase = createAdminClient();
  if (!supabase) return undefined;

  const { data, error } = await supabase.from("content_tags").select("id,label,created_at");
  if (error) throw error;

  const dbTags = ((data ?? []) as ContentTagRow[]).map((row) => row.label);
  if (dbTags.length > 0) return sortKoreanTags(dbTags);

  const seedRows = cmsDefaultTags.map((label) => ({ label }));
  const { error: seedError } = await supabase.from("content_tags").upsert(seedRows, { onConflict: "label" });
  if (seedError) throw seedError;

  return sortKoreanTags(cmsDefaultTags);
}

export async function upsertContentTag(label: string) {
  const supabase = createAdminClient();
  if (!supabase) return undefined;

  const normalized = label.trim();
  if (!normalized) return undefined;

  const { error } = await supabase.from("content_tags").upsert({ label: normalized }, { onConflict: "label" });
  if (error) throw error;

  return listContentTags();
}

export async function deleteContentTag(label: string) {
  const supabase = createAdminClient();
  if (!supabase) return undefined;

  const normalized = label.trim();
  if (!normalized) return undefined;

  const { error } = await supabase.from("content_tags").delete().eq("label", normalized);
  if (error) throw error;

  return listContentTags();
}
