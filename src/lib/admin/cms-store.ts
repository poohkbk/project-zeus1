"use client";

import { cmsDefaultTags, cmsSeedAdmins, cmsSeedItems } from "@/data/cms-seed";
import type { CmsAdminUser, CmsContentItem, CmsContentType, CmsTaxonomy } from "@/types/cms";

const CONTENT_KEY = "zeu-cms-content-v1";
const ADMINS_KEY = "zeu-cms-admins-v1";
const TAXONOMY_KEY = "zeu-cms-taxonomy-v1";

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
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadCmsItems() {
  return readJson<CmsContentItem[]>(CONTENT_KEY, cmsSeedItems);
}

export function saveCmsItems(items: CmsContentItem[]) {
  writeJson(CONTENT_KEY, items);
}

export async function loadCmsItemsFromServer() {
  const response = await fetch("/api/admin/content", { cache: "no-store" });
  if (!response.ok) throw new Error("Failed to load CMS items.");
  const data = (await response.json()) as { items?: CmsContentItem[] };
  return data.items ?? [];
}

export async function saveCmsItemToServer(item: CmsContentItem) {
  const response = await fetch("/api/admin/content", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ item }),
  });
  if (!response.ok) throw new Error("Failed to save CMS item.");
}

export function loadCmsAdmins() {
  return readJson<CmsAdminUser[]>(ADMINS_KEY, cmsSeedAdmins);
}

export function saveCmsAdmins(admins: CmsAdminUser[]) {
  writeJson(ADMINS_KEY, admins.slice(0, 4));
}

export function loadCmsTaxonomy() {
  return readJson<CmsTaxonomy>(TAXONOMY_KEY, { tags: cmsDefaultTags });
}

export function saveCmsTaxonomy(taxonomy: CmsTaxonomy) {
  writeJson(TAXONOMY_KEY, {
    tags: Array.from(new Set(taxonomy.tags.map((tag) => tag.trim()).filter(Boolean))),
  });
}

export function createEmptyCmsItem(type: CmsContentType): CmsContentItem {
  const now = new Date().toISOString();
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
    tags: [],
    visibility: {
      isFeatured: false,
      showOnHome: false,
      showOnCategory: false,
      showOnPractice: false,
      showOnSearch: true,
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
