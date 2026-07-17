import "server-only";

import { cmsDefaultTags } from "@/data/cms-seed";
import { createAdminClient } from "@/lib/supabase/admin";
import { sortKoreanTags } from "@/lib/tag-utils";

type ContentTagRow = {
  id: string;
  label: string;
  created_at?: string | null;
};

type SiteSettingRow = {
  value?: {
    tags?: string[];
  } | null;
};

const RECOMMENDED_TAGS_KEY = "recommended_tags";

function isMissingSchemaError(error: { message?: string } | null) {
  const message = error?.message ?? "";
  return message.includes("does not exist") || message.includes("schema cache");
}

async function listTagsFromTable(supabase: ReturnType<typeof createAdminClient>) {
  if (!supabase) return [];

  const { data, error } = await supabase.from("content_tags").select("id,label,created_at");
  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }

  return ((data ?? []) as ContentTagRow[]).map((row) => row.label);
}

async function listTagsFromSettings(supabase: ReturnType<typeof createAdminClient>) {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", RECOMMENDED_TAGS_KEY)
    .maybeSingle();

  if (error) {
    if (isMissingSchemaError(error)) return [];
    throw error;
  }

  const row = data as SiteSettingRow | null;
  return Array.isArray(row?.value?.tags) ? row.value.tags : [];
}

async function saveTagsToSettings(supabase: ReturnType<typeof createAdminClient>, tags: string[]) {
  if (!supabase) return;

  const { error } = await supabase.from("site_settings").upsert(
    {
      key: RECOMMENDED_TAGS_KEY,
      value: { tags: sortKoreanTags(tags) },
    },
    { onConflict: "key" },
  );

  if (error && !isMissingSchemaError(error)) throw error;
}

async function seedContentTags(supabase: ReturnType<typeof createAdminClient>, tags: string[]) {
  if (!supabase || tags.length === 0) return;

  const seedRows = sortKoreanTags(tags).map((label) => ({ label }));
  const { error } = await supabase.from("content_tags").upsert(seedRows, { onConflict: "label" });
  if (error && !isMissingSchemaError(error)) throw error;
}

export async function listContentTags() {
  const supabase = createAdminClient();
  if (!supabase) return undefined;

  const tableTags = await listTagsFromTable(supabase);
  const settingTags = await listTagsFromSettings(supabase);
  const tags = sortKoreanTags([...tableTags, ...settingTags]);
  if (tags.length > 0) {
    await saveTagsToSettings(supabase, tags);
    return tags;
  }

  await seedContentTags(supabase, cmsDefaultTags);
  await saveTagsToSettings(supabase, cmsDefaultTags);

  return sortKoreanTags(cmsDefaultTags);
}

export async function upsertContentTag(label: string) {
  const supabase = createAdminClient();
  if (!supabase) return undefined;

  const normalized = label.trim();
  if (!normalized) return undefined;

  const currentTags = sortKoreanTags([...(await listTagsFromTable(supabase)), ...(await listTagsFromSettings(supabase)), normalized]);
  const { error } = await supabase.from("content_tags").upsert({ label: normalized }, { onConflict: "label" });
  if (error && !isMissingSchemaError(error)) throw error;
  await saveTagsToSettings(supabase, currentTags);

  return currentTags;
}

export async function deleteContentTag(label: string) {
  const supabase = createAdminClient();
  if (!supabase) return undefined;

  const normalized = label.trim();
  if (!normalized) return undefined;

  const { error } = await supabase.from("content_tags").delete().eq("label", normalized);
  if (error && !isMissingSchemaError(error)) throw error;

  const currentTags = sortKoreanTags(
    [...(await listTagsFromTable(supabase)), ...(await listTagsFromSettings(supabase))].filter((tag) => tag !== normalized),
  );
  await saveTagsToSettings(supabase, currentTags);

  return currentTags;
}

export async function mergeContentTags(tags: string[]) {
  const supabase = createAdminClient();
  if (!supabase) return undefined;

  const normalizedTags = sortKoreanTags(tags);
  if (normalizedTags.length === 0) return listContentTags();

  const currentTags = sortKoreanTags([
    ...(await listTagsFromTable(supabase)),
    ...(await listTagsFromSettings(supabase)),
    ...normalizedTags,
  ]);
  await seedContentTags(supabase, currentTags);
  await saveTagsToSettings(supabase, currentTags);
  return currentTags;
}
