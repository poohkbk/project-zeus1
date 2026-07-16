"use client";

import { cmsDefaultTags, cmsSeedAdmins, cmsSeedItems } from "@/data/cms-seed";
import { sortKoreanTags } from "@/lib/tag-utils";
import type { CmsAdminUser, CmsContentItem, CmsContentType, CmsTaxonomy } from "@/types/cms";

const CONTENT_KEY = "zeu-cms-content-v1";
const ADMINS_KEY = "zeu-cms-admins-v1";
const TAXONOMY_KEY = "zeu-cms-taxonomy-v1";
const SAVE_TIMEOUT_MS = 15000;

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return true;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // Large uploaded images can exceed the browser's temporary storage quota.
    // Supabase remains the source of truth; local storage is only a fallback.
    return false;
  }
}

export function loadCmsItems() {
  return readJson<CmsContentItem[]>(CONTENT_KEY, cmsSeedItems);
}

export function saveCmsItems(items: CmsContentItem[]) {
  const saved = writeJson(CONTENT_KEY, items);
  if (!saved) {
    const lightweightItems = items.map((item) => ({ ...item, heroImage: "" }));
    writeJson(CONTENT_KEY, lightweightItems);
  }
}

export async function loadCmsItemsFromServer() {
  const response = await fetch("/api/admin/content", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load CMS items.");
  const data = (await response.json()) as { items?: CmsContentItem[] };
  return data.items ?? [];
}

export async function saveCmsItemToServer(item: CmsContentItem) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), SAVE_TIMEOUT_MS);
  const serverItem = prepareItemForServer(item);

  try {
    const response = await fetch("/api/admin/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item: serverItem }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(data.message || "Supabase 저장에 실패했습니다.");
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Supabase 저장 응답이 지연되어 브라우저 임시저장으로 전환했습니다.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function deleteCmsItemFromServer(item: CmsContentItem) {
  const response = await fetch(`/api/admin/content?type=${encodeURIComponent(item.type)}&id=${encodeURIComponent(item.id)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || "콘텐츠를 영구 삭제하지 못했습니다.");
  }
}

export async function deleteCmsItemsFromServer(items: CmsContentItem[]) {
  for (const item of items) {
    await deleteCmsItemFromServer(item);
  }
}

function prepareItemForServer(item: CmsContentItem): CmsContentItem {
  return item;
}

export function loadCmsAdmins() {
  return readJson<CmsAdminUser[]>(ADMINS_KEY, cmsSeedAdmins);
}

export function saveCmsAdmins(admins: CmsAdminUser[]) {
  writeJson(ADMINS_KEY, admins.slice(0, 4));
}

export function loadCmsTaxonomy() {
  const taxonomy = readJson<CmsTaxonomy>(TAXONOMY_KEY, { tags: cmsDefaultTags });
  return { tags: sortKoreanTags([...cmsDefaultTags, ...taxonomy.tags]) };
}

export function saveCmsTaxonomy(taxonomy: CmsTaxonomy) {
  writeJson(TAXONOMY_KEY, {
    tags: sortKoreanTags(taxonomy.tags),
  });
}

export async function loadCmsTaxonomyFromServer() {
  const response = await fetch("/api/admin/taxonomy", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load recommended tags.");
  const data = (await response.json()) as { tags?: string[] };
  const tags = sortKoreanTags(data.tags ?? []);
  saveCmsTaxonomy({ tags });
  return { tags };
}

export async function addCmsTagToServer(label: string) {
  const response = await fetch("/api/admin/taxonomy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ label }),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || "추천태그를 저장하지 못했습니다.");
  }
  const data = (await response.json()) as { tags?: string[] };
  const tags = sortKoreanTags(data.tags ?? []);
  saveCmsTaxonomy({ tags });
  return { tags };
}

export async function removeCmsTagFromServer(label: string) {
  const response = await fetch(`/api/admin/taxonomy?label=${encodeURIComponent(label)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(data.message || "추천태그를 삭제하지 못했습니다.");
  }
  const data = (await response.json()) as { tags?: string[] };
  const tags = sortKoreanTags(data.tags ?? []);
  saveCmsTaxonomy({ tags });
  return { tags };
}

export function createEmptyCmsItem(type: CmsContentType): CmsContentItem {
  const now = new Date().toISOString();
  const isCase = type === "case";
  return {
    id: `${type}-${Date.now()}`,
    type,
    title: "",
    summary: "",
    category: "civil",
    status: "draft",
    seo: {
      title: "",
      description: "",
      canonicalPath: "",
      index: true,
    },
    body: "",
    caseDetail: isCase
      ? {
          facts: [""],
          issues: [{ title: "핵심쟁점", description: "" }],
          response: [{ title: "제우의 대응", description: "" }],
          resultTitle: "",
          resultDescription: "",
          lawyerComment: "",
        }
      : undefined,
    guideDetail:
      type === "guide"
        ? {
            checkCases: "",
            legalView: "",
            process: "",
            cautions: "",
          }
        : undefined,
    tags: [],
    visibility: {
      isFeatured: isCase,
      showOnHome: isCase,
      showOnCategory: isCase,
      showOnPractice: isCase,
      showOnSearch: true,
      featuredOrder: isCase ? 1 : undefined,
    },
    updatedAt: now,
    updatedBy: "최고관리자",
  };
}

export function normalizeTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 12);
}
