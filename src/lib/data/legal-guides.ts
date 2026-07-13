import { legalGuideContents } from "@/data/legal-guides";
import { createClient } from "@/lib/supabase/server";
import type { LegalGuideContent } from "@/types/content";
import type { LegalGuideRow } from "@/types/database";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLegalGuideContent(value: unknown): value is LegalGuideContent {
  return isRecord(value) && typeof value.slug === "string" && typeof value.title === "string";
}

function getSlug(row: LegalGuideRow) {
  return row.slug || row.page_address || row.id;
}

function toLegalGuide(row: LegalGuideRow): LegalGuideContent {
  if (isLegalGuideContent(row.content)) return row.content;

  const slug = getSlug(row);
  return {
    id: row.id,
    slug,
    title: row.title,
    excerpt: row.summary ?? "",
    href: `/legal-guide/${slug}`,
    category: row.category,
    tags: row.tags ?? [],
    publishedAt: row.published_at ?? row.created_at,
    featured: row.is_featured,
  };
}

async function fetchPublishedRows() {
  const supabase = await createClient();
  if (!supabase) return undefined;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("legal_guides")
    .select("*")
    .eq("status", "published")
    .or(`published_at.is.null,published_at.lte.${now}`)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) return undefined;
  return data as LegalGuideRow[];
}

export async function getPublishedLegalGuides(): Promise<LegalGuideContent[]> {
  const rows = await fetchPublishedRows();
  return rows?.map(toLegalGuide) ?? legalGuideContents;
}

export async function getLegalGuidesByCategory(category: string): Promise<LegalGuideContent[]> {
  const guides = await getPublishedLegalGuides();
  return guides.filter((guide) => guide.category === category || guide.tags.includes(category));
}

export async function getLegalGuideBySlug(slug: string): Promise<LegalGuideContent | undefined> {
  const supabase = await createClient();
  if (supabase) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("legal_guides")
      .select("*")
      .eq("status", "published")
      .or(`page_address.eq.${slug},slug.eq.${slug}`)
      .or(`published_at.is.null,published_at.lte.${now}`)
      .limit(1)
      .maybeSingle();

    if (!error && data) return toLegalGuide(data as LegalGuideRow);
  }

  return legalGuideContents.find((guide) => guide.slug === slug);
}
