import { unstable_cache } from "next/cache";
import { caseContents, toPublicCaseContent } from "@/data/cases";
import { cmsCategoryLabels } from "@/data/cms-seed";
import {
  compareFeaturedCases,
  isPublishedCase,
  isWithinFeaturedPeriod,
  type GetFeaturedCasesOptions,
} from "@/lib/case-selectors";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { CaseRow } from "@/types/database";
import type { CaseContent, PublicCaseContent } from "@/types/case";
import type { CmsContentItem } from "@/types/cms";

const fallbackCases = caseContents.filter((item) => isPublishedCase(item)).map(toPublicCaseContent);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCaseContent(value: unknown): value is PublicCaseContent {
  return isRecord(value) && typeof value.slug === "string" && typeof value.title === "string";
}

function isCmsContentItem(value: unknown): value is CmsContentItem {
  return isRecord(value) && typeof value.id === "string" && value.type === "case";
}

function normalizeCaseSlug(value?: string | null) {
  if (!value) return "";

  const [withoutHash] = value.trim().split("#");
  const [withoutQuery] = withoutHash.split("?");
  const path = withoutQuery.replace(/\\/g, "/").replace(/^https?:\/\/[^/]+/i, "");
  const parts = path.split("/").map((part) => part.trim()).filter(Boolean);
  const slug = parts[0] === "cases" ? parts[1] : parts.at(-1);

  try {
    return decodeURIComponent(slug ?? "").trim();
  } catch {
    return (slug ?? "").trim();
  }
}

function getSlug(row: CaseRow) {
  return normalizeCaseSlug(row.slug) || normalizeCaseSlug(row.page_address) || row.id;
}

function toLocalCategory(value: string): CaseContent["category"] {
  return value === "criminal" || value === "divorce" || value === "inheritance" ? value : "civil";
}

function filledLines(values: string[] | undefined, fallback: string[] = []) {
  const lines = values?.map((value) => value.trim()).filter(Boolean) ?? [];
  return lines.length ? lines : fallback;
}

function filledPairs<T extends { title: string; description: string }>(values: T[] | undefined) {
  return values?.filter((value) => value.title.trim() || value.description.trim()) ?? [];
}

function toPublicCaseFromCmsItem(item: CmsContentItem, row: CaseRow): PublicCaseContent {
  const slug = normalizeCaseSlug(row.slug) || normalizeCaseSlug(row.page_address) || normalizeCaseSlug(item.seo?.canonicalPath) || item.id;
  const publishedAt = row.published_at ?? row.created_at;
  const detail = item.caseDetail;
  const summary = item.body || item.summary || row.summary || "";
  const fallbackFact = item.body || item.summary || row.body || row.summary || "";
  const issues = filledPairs(detail?.issues);
  const response = filledPairs(detail?.response);

  return {
    id: row.id,
    slug,
    href: `/cases/${slug}`,
    category: toLocalCategory(item.category),
    categoryLabel: cmsCategoryLabels[item.category] ?? row.category,
    subcategory: cmsCategoryLabels[item.category] ?? row.category,
    title: item.title || row.title,
    excerpt: item.summary || row.summary || "",
    heroImage: item.heroImage || row.hero_image_url || undefined,
    accent: "navy",
    tags: item.tags ?? row.tags ?? [],
    visibility: {
      isFeatured: item.visibility.isFeatured,
      showOnHome: item.visibility.showOnHome,
      showOnCategory: item.visibility.showOnCategory,
      showOnPractice: item.visibility.showOnPractice,
      showOnSearch: item.visibility.showOnSearch,
      featuredOrder: item.visibility.featuredOrder ?? row.featured_order ?? undefined,
      featuredStartAt: item.visibility.featuredStartAt ?? row.featured_start_at ?? undefined,
      featuredEndAt: item.visibility.featuredEndAt ?? row.featured_end_at ?? undefined,
      published: row.status === "published",
      publishedAt,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    },
    summary,
    reconstructedFacts: filledLines(detail?.facts, fallbackFact ? [fallbackFact] : []),
    issues: issues.length ? issues : [{ title: "핵심 쟁점", description: item.summary || row.summary || "" }],
    response: response.length ? response : [{ title: "사건 검토", description: item.body || row.body || item.summary || row.summary || "" }],
    resultTitle: detail?.resultTitle.trim() || item.title || row.title,
    resultDescription: detail?.resultDescription.trim() || item.summary || row.summary || "",
    lawyerComment: detail?.lawyerComment.trim() || "구체적인 결과는 사건의 사실관계와 증거에 따라 달라질 수 있습니다.",
    seoTitle: item.seo?.title || item.title || row.title,
    seoDescription: item.seo?.description || item.summary || row.summary || "",
  };
}

function toPublicCase(row: CaseRow): PublicCaseContent {
  if (isCaseContent(row.content)) return row.content;
  if (isCmsContentItem(row.content)) return toPublicCaseFromCmsItem(row.content, row);

  const slug = getSlug(row);
  const publishedAt = row.published_at ?? row.created_at;
  return {
    id: row.id,
    slug,
    href: `/cases/${slug}`,
    category: toLocalCategory(row.category),
    categoryLabel: row.category,
    subcategory: row.category,
    title: row.title,
    excerpt: row.summary ?? "",
    heroImage: row.hero_image_url ?? undefined,
    accent: "navy",
    tags: row.tags ?? [],
    visibility: {
      isFeatured: row.is_featured,
      showOnHome: row.show_on_home,
      showOnCategory: row.show_on_category,
      showOnPractice: row.show_on_practice,
      showOnSearch: row.show_on_search,
      featuredOrder: row.featured_order ?? undefined,
      featuredStartAt: row.featured_start_at ?? undefined,
      featuredEndAt: row.featured_end_at ?? undefined,
      published: row.status === "published",
      publishedAt,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    },
    summary: row.summary ?? "",
    reconstructedFacts: row.body ? [row.body] : [],
    issues: [],
    response: [],
    resultTitle: row.title,
    resultDescription: row.summary ?? "",
    lawyerComment: "",
    seoTitle: row.title,
    seoDescription: row.summary ?? "",
  };
}

async function fetchPublishedCaseRowsWithClient(supabase: NonNullable<ReturnType<typeof createAdminClient>>) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("status", "published")
    .or(`published_at.is.null,published_at.lte.${now}`)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) return undefined;
  return data as CaseRow[];
}

const fetchPublishedCaseRowsFromAdmin = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    if (!supabase) return undefined;
    return fetchPublishedCaseRowsWithClient(supabase);
  },
  ["published-cases"],
  { revalidate: 60, tags: ["published-cases"] },
);

async function fetchPublishedCaseRowsFromPublicClient() {
  const supabase = await createClient();
  if (!supabase) return undefined;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("cases")
    .select("*")
    .eq("status", "published")
    .or(`published_at.is.null,published_at.lte.${now}`)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) return undefined;
  return data as CaseRow[];
}

async function fetchPublishedCaseRows() {
  return (await fetchPublishedCaseRowsFromAdmin()) ?? (await fetchPublishedCaseRowsFromPublicClient());
}

export async function getPublishedCases(): Promise<PublicCaseContent[]> {
  const rows = await fetchPublishedCaseRows();
  return rows?.map(toPublicCase) ?? fallbackCases;
}

export async function getCaseBySlug(slug: string): Promise<PublicCaseContent | undefined> {
  const normalizedSlug = normalizeCaseSlug(slug);
  const rows = await fetchPublishedCaseRows();
  const row = rows?.find((item) =>
    [item.slug, item.page_address, item.id].some((value) => normalizeCaseSlug(value) === normalizedSlug),
  );

  if (row) return toPublicCase(row);

  return fallbackCases.find((item) => normalizeCaseSlug(item.slug) === normalizedSlug);
}

export async function getCasesByCategory(category: CaseContent["category"]): Promise<PublicCaseContent[]> {
  const cases = await getPublishedCases();
  return cases.filter((item) => item.category === category);
}

function isVisibleAtPlacement(caseItem: PublicCaseContent, placement: GetFeaturedCasesOptions["placement"]) {
  if (!caseItem.visibility.isFeatured) return false;
  if (placement === "home") return caseItem.visibility.showOnHome;
  if (placement === "category") return caseItem.visibility.showOnCategory;
  if (placement === "practice") return caseItem.visibility.showOnPractice;
  return caseItem.visibility.showOnSearch;
}

export async function getFeaturedCases({
  placement,
  limit = 6,
  now = new Date(),
}: GetFeaturedCasesOptions): Promise<PublicCaseContent[]> {
  const cases = await getPublishedCases();
  const featured = cases
    .filter((caseItem) => isWithinFeaturedPeriod(caseItem as CaseContent, now))
    .filter((caseItem) => isVisibleAtPlacement(caseItem, placement))
    .sort((a, b) => compareFeaturedCases(a as CaseContent, b as CaseContent))
    .slice(0, limit);

  if (featured.length >= limit || placement === "practice") return featured;

  const selectedIds = new Set(featured.map((caseItem) => caseItem.id));
  const latest = cases
    .filter((caseItem) => !selectedIds.has(caseItem.id))
    .filter((caseItem) => caseItem.visibility.showOnSearch !== false)
    .sort((a, b) => b.visibility.publishedAt.localeCompare(a.visibility.publishedAt))
    .slice(0, limit - featured.length);

  return [...featured, ...latest];
}
