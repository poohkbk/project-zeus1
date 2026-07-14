import { legalGuideContents } from "@/data/legal-guides";
import { createClient } from "@/lib/supabase/server";
import type { LegalGuideContent } from "@/types/content";
import type { LegalGuideRow } from "@/types/database";
import type { CmsContentItem } from "@/types/cms";

const fallbackGuides = legalGuideContents.map((guide) => ({
  ...guide,
  href: `/legal-guide/${guide.slug}`,
}));

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isLegalGuideContent(value: unknown): value is LegalGuideContent {
  return isRecord(value) && typeof value.slug === "string" && typeof value.title === "string";
}

function isCmsGuide(value: unknown): value is CmsContentItem {
  return isRecord(value) && value.type === "guide" && typeof value.id === "string";
}

function normalizeGuideSlug(value?: string | null) {
  if (!value) return "";
  const [withoutHash] = value.trim().split("#");
  const [withoutQuery] = withoutHash.split("?");
  const path = withoutQuery.replace(/\\/g, "/").replace(/^https?:\/\/[^/]+/i, "");
  const parts = path.split("/").map((part) => part.trim()).filter(Boolean);
  const slug = parts[0] === "legal-guide" ? parts[1] : parts.at(-1);

  try {
    return decodeURIComponent(slug ?? "").trim();
  } catch {
    return (slug ?? "").trim();
  }
}

function getSlug(row: LegalGuideRow) {
  return normalizeGuideSlug(row.slug) || normalizeGuideSlug(row.page_address) || row.id;
}

function toLegalGuide(row: LegalGuideRow): LegalGuideContent {
  if (isLegalGuideContent(row.content)) return row.content;
  if (isCmsGuide(row.content)) {
    const item = row.content;
    const slug = getSlug(row) || normalizeGuideSlug(item.seo?.canonicalPath) || item.id;
    return {
      id: row.id,
      slug,
      title: item.title || row.title,
      excerpt: item.summary || row.summary || "",
      href: `/legal-guide/${slug}`,
      category: row.category,
      tags: item.tags ?? row.tags ?? [],
      publishedAt: row.published_at ?? row.created_at,
      featured: row.is_featured,
      readingTime: "5분",
      showOnHome: item.visibility?.showOnHome ?? row.show_on_home,
      sections: item.guideDetail,
    };
  }

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
    showOnHome: row.show_on_home,
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
  return rows?.map(toLegalGuide) ?? fallbackGuides;
}

export async function getHomeLegalGuides(limit = 4): Promise<LegalGuideContent[]> {
  const guides = await getPublishedLegalGuides();
  return guides
    .filter((guide) => guide.showOnHome !== false)
    .sort((a, b) => {
      const featured = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
      if (featured !== 0) return featured;
      return (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
    })
    .slice(0, limit);
}

export async function getLegalGuidesByCategory(category: string): Promise<LegalGuideContent[]> {
  const guides = await getPublishedLegalGuides();
  return guides.filter((guide) => guide.category === category || guide.tags.includes(category));
}

export async function getLegalGuideBySlug(slug: string): Promise<LegalGuideContent | undefined> {
  const normalizedSlug = normalizeGuideSlug(slug);
  const rows = await fetchPublishedRows();
  const row = rows?.find((item) =>
    [item.slug, item.page_address, item.id].some((value) => normalizeGuideSlug(value) === normalizedSlug),
  );

  if (row) return toLegalGuide(row);

  return fallbackGuides.find((guide) => normalizeGuideSlug(guide.slug) === normalizedSlug);
}
