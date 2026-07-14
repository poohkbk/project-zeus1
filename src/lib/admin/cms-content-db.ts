import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { CmsContentItem, CmsContentType } from "@/types/cms";

type ContentTable = "cases" | "legal_guides" | "faqs";

type ContentRow = {
  id: string;
  cms_id?: string | null;
  title?: string | null;
  question?: string | null;
  answer?: string | null;
  page_address?: string | null;
  category: string;
  summary?: string | null;
  body?: string | null;
  status: string;
  tags?: string[] | null;
  hero_image_url?: string | null;
  hero_image_alt?: string | null;
  is_featured?: boolean | null;
  show_on_home?: boolean | null;
  show_on_category?: boolean | null;
  show_on_practice?: boolean | null;
  show_on_search?: boolean | null;
  featured_order?: number | null;
  featured_start_at?: string | null;
  featured_end_at?: string | null;
  published_at?: string | null;
  content?: unknown;
  updated_at?: string | null;
};

const tableByType: Record<CmsContentType, ContentTable> = {
  case: "cases",
  guide: "legal_guides",
  faq: "faqs",
};

function isCmsContentItem(value: unknown): value is CmsContentItem {
  return typeof value === "object" && value !== null && "id" in value && "type" in value;
}

function slugify(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || `content-${Date.now()}`;
}

function pageAddressFor(item: CmsContentItem) {
  const canonical = item.seo?.canonicalPath?.trim().replace(/^\/+/, "").split("/").filter(Boolean).pop();
  return canonical || slugify(item.title || item.id);
}

function toCmsItem(row: ContentRow, type: CmsContentType): CmsContentItem {
  if (isCmsContentItem(row.content)) return row.content;

  const title = type === "faq" ? (row.question ?? "") : (row.title ?? "");
  const summary = row.summary ?? (type === "faq" ? row.answer ?? "" : "");
  const pagePrefix = type === "case" ? "cases" : type === "guide" ? "legal-guide" : "faq";

  return {
    id: row.cms_id ?? row.id,
    type,
    title,
    summary,
    category: row.category as CmsContentItem["category"],
    status: row.status as CmsContentItem["status"],
    heroImage: row.hero_image_url ?? "",
    heroImageAlt: row.hero_image_alt ?? "",
    seo: {
      title,
      description: summary,
      canonicalPath: row.page_address ? `/${pagePrefix}/${row.page_address}` : "",
      index: row.status === "published",
    },
    body: type === "faq" ? (row.answer ?? "") : (row.body ?? ""),
    tags: row.tags ?? [],
    visibility: {
      isFeatured: Boolean(row.is_featured),
      showOnHome: Boolean(row.show_on_home),
      showOnCategory: Boolean(row.show_on_category),
      showOnPractice: Boolean(row.show_on_practice),
      showOnSearch: row.show_on_search !== false,
      featuredOrder: row.featured_order ?? undefined,
      featuredStartAt: row.featured_start_at ?? undefined,
      featuredEndAt: row.featured_end_at ?? undefined,
    },
    updatedAt: row.updated_at ?? new Date().toISOString(),
    updatedBy: "관리자",
  };
}

function publishedAtFor(item: CmsContentItem) {
  return item.status === "published" ? new Date().toISOString() : null;
}

function toCaseRow(item: CmsContentItem) {
  const pageAddress = pageAddressFor(item);

  return {
    cms_id: item.id,
    title: item.title || "제목 없는 승소사례",
    page_address: pageAddress,
    slug: pageAddress,
    category: item.category,
    summary: item.summary || item.title || "요약을 입력해 주세요.",
    body: item.body || item.summary || "본문을 입력해 주세요.",
    status: item.status,
    tags: item.tags,
    hero_image_url: item.heroImage || null,
    hero_image_alt: item.heroImageAlt || null,
    is_featured: item.visibility.isFeatured,
    show_on_home: item.visibility.showOnHome,
    show_on_category: item.visibility.showOnCategory,
    show_on_practice: item.visibility.showOnPractice,
    show_on_search: item.visibility.showOnSearch,
    featured_order: item.visibility.featuredOrder ?? null,
    featured_start_at: item.visibility.featuredStartAt ?? null,
    featured_end_at: item.visibility.featuredEndAt ?? null,
    content: item,
    published_at: publishedAtFor(item),
  };
}

function toGuideRow(item: CmsContentItem) {
  const pageAddress = pageAddressFor(item);

  return {
    cms_id: item.id,
    title: item.title || "제목 없는 법률가이드",
    page_address: pageAddress,
    slug: pageAddress,
    category: item.category,
    summary: item.summary || item.title || "요약을 입력해 주세요.",
    body: item.body || item.summary || "본문을 입력해 주세요.",
    status: item.status,
    tags: item.tags,
    hero_image_url: item.heroImage || null,
    hero_image_alt: item.heroImageAlt || null,
    is_featured: item.visibility.isFeatured,
    show_on_home: item.visibility.showOnHome,
    show_on_search: item.visibility.showOnSearch,
    featured_order: item.visibility.featuredOrder ?? null,
    featured_start_at: item.visibility.featuredStartAt ?? null,
    featured_end_at: item.visibility.featuredEndAt ?? null,
    content: item,
    published_at: publishedAtFor(item),
  };
}

function toFaqRow(item: CmsContentItem) {
  return {
    cms_id: item.id,
    question: item.title || "제목 없는 질문",
    answer: item.body || item.summary || "답변을 입력해 주세요.",
    category: item.category,
    status: item.status,
    tags: item.tags,
    is_featured: item.visibility.isFeatured,
    show_on_home: item.visibility.showOnHome,
    show_on_search: item.visibility.showOnSearch,
    sort_order: item.visibility.featuredOrder ?? null,
    content: item,
    published_at: publishedAtFor(item),
  };
}

function omitCmsId<T extends { cms_id?: string | null }>(row: T) {
  const rest = { ...row };
  delete rest.cms_id;
  return rest;
}

export async function listCmsContentItems() {
  const supabase = createAdminClient();
  if (!supabase) return undefined;

  const results = await Promise.all(
    (Object.entries(tableByType) as Array<[CmsContentType, ContentTable]>).map(async ([type, table]) => {
      const { data, error } = await supabase.from(table).select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as ContentRow[]).map((row) => toCmsItem(row, type));
    }),
  );

  return results.flat().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function upsertCmsContentItem(item: CmsContentItem) {
  const supabase = createAdminClient();
  if (!supabase) return undefined;
  const admin = supabase;

  async function runWithCmsId() {
    const query =
      item.type === "case"
        ? admin.from("cases").upsert(toCaseRow(item), { onConflict: "cms_id" })
        : item.type === "guide"
          ? admin.from("legal_guides").upsert(toGuideRow(item), { onConflict: "cms_id" })
          : admin.from("faqs").upsert(toFaqRow(item), { onConflict: "cms_id" });

    return query.select("id").maybeSingle();
  }

  async function runWithLegacyKey() {
    const query =
      item.type === "case"
        ? admin.from("cases").upsert(omitCmsId(toCaseRow(item)), { onConflict: "page_address" })
        : item.type === "guide"
          ? admin.from("legal_guides").upsert(omitCmsId(toGuideRow(item)), { onConflict: "page_address" })
          : admin.from("faqs").upsert(omitCmsId(toFaqRow(item)), { onConflict: "question" });

    return query.select("id").maybeSingle();
  }

  let { data, error } = await runWithCmsId();
  if (error) {
    const fallbackResult = await runWithLegacyKey();
    data = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) throw error;
  return data as { id: string } | null;
}
