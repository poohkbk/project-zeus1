import { caseContents, toPublicCaseContent } from "@/data/cases";
import {
  compareFeaturedCases,
  isPublishedCase,
  isWithinFeaturedPeriod,
  type GetFeaturedCasesOptions,
} from "@/lib/case-selectors";
import { createClient } from "@/lib/supabase/server";
import type { CaseRow } from "@/types/database";
import type { CaseContent, PublicCaseContent } from "@/types/case";

const fallbackCases = caseContents.filter((item) => isPublishedCase(item)).map(toPublicCaseContent);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isCaseContent(value: unknown): value is PublicCaseContent {
  return isRecord(value) && typeof value.slug === "string" && typeof value.title === "string";
}

function getSlug(row: CaseRow) {
  return row.slug || row.page_address || row.id;
}

function toLocalCategory(value: string): CaseContent["category"] {
  return value === "criminal" || value === "divorce" || value === "inheritance" ? value : "civil";
}

function toPublicCase(row: CaseRow): PublicCaseContent {
  if (isCaseContent(row.content)) return row.content;

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

async function fetchPublishedCaseRows() {
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

export async function getPublishedCases(): Promise<PublicCaseContent[]> {
  const rows = await fetchPublishedCaseRows();
  return rows?.map(toPublicCase) ?? fallbackCases;
}

export async function getCaseBySlug(slug: string): Promise<PublicCaseContent | undefined> {
  const supabase = await createClient();
  if (supabase) {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("cases")
      .select("*")
      .eq("status", "published")
      .or(`page_address.eq.${slug},slug.eq.${slug}`)
      .or(`published_at.is.null,published_at.lte.${now}`)
      .limit(1)
      .maybeSingle();

    if (!error && data) return toPublicCase(data as CaseRow);
  }

  return fallbackCases.find((item) => item.slug === slug);
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
  return cases
    .filter((caseItem) => isWithinFeaturedPeriod(caseItem as CaseContent, now))
    .filter((caseItem) => isVisibleAtPlacement(caseItem, placement))
    .sort((a, b) => compareFeaturedCases(a as CaseContent, b as CaseContent))
    .slice(0, limit);
}
