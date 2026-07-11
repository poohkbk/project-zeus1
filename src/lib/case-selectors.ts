import { caseContents, toPublicCaseContent } from "@/data/cases";
import type { CaseContent, CasePlacement, PublicCaseContent } from "@/types/case";

export interface GetFeaturedCasesOptions {
  placement: CasePlacement;
  limit?: number;
  now?: Date;
}

const defaultLimits: Record<CasePlacement, number> = {
  home: 6,
  category: 6,
  practice: 3,
  search: 3,
};

function parseDate(value: string | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export function isPublishedCase(caseItem: CaseContent, now = new Date()) {
  if (!caseItem.visibility.published) return false;
  const publishedAt = parseDate(caseItem.visibility.publishedAt);
  if (!publishedAt) return false;
  return publishedAt.getTime() <= now.getTime();
}

export function isWithinFeaturedPeriod(caseItem: CaseContent, now = new Date()) {
  const start = parseDate(caseItem.visibility.featuredStartAt);
  const end = parseDate(caseItem.visibility.featuredEndAt);
  if (start && now.getTime() < start.getTime()) return false;
  if (end && now.getTime() > end.getTime()) return false;
  return true;
}

function isVisibleAtPlacement(caseItem: CaseContent, placement: CasePlacement) {
  if (!caseItem.visibility.isFeatured) return false;
  if (placement === "home") return caseItem.visibility.showOnHome;
  if (placement === "category") return caseItem.visibility.showOnCategory;
  if (placement === "practice") return caseItem.visibility.showOnPractice;
  return caseItem.visibility.showOnSearch;
}

export function compareFeaturedCases(a: CaseContent, b: CaseContent) {
  const aOrder = a.visibility.featuredOrder ?? Number.MAX_SAFE_INTEGER;
  const bOrder = b.visibility.featuredOrder ?? Number.MAX_SAFE_INTEGER;
  if (aOrder !== bOrder) return aOrder - bOrder;
  const published = b.visibility.publishedAt.localeCompare(a.visibility.publishedAt);
  if (published !== 0) return published;
  return (b.visibility.updatedAt ?? "").localeCompare(a.visibility.updatedAt ?? "");
}

export function getPublishedCases(now = new Date()): PublicCaseContent[] {
  return caseContents.filter((caseItem) => isPublishedCase(caseItem, now)).map(toPublicCaseContent);
}

export function getPublishedCaseBySlug(slug: string, now = new Date()): PublicCaseContent | undefined {
  const caseItem = caseContents.find((item) => item.slug === slug);
  if (!caseItem || !isPublishedCase(caseItem, now)) return undefined;
  return toPublicCaseContent(caseItem);
}

export function getFeaturedCases({
  placement,
  limit = defaultLimits[placement],
  now = new Date(),
}: GetFeaturedCasesOptions): PublicCaseContent[] {
  return caseContents
    .filter((caseItem) => isPublishedCase(caseItem, now))
    .filter((caseItem) => isWithinFeaturedPeriod(caseItem, now))
    .filter((caseItem) => isVisibleAtPlacement(caseItem, placement))
    .sort(compareFeaturedCases)
    .slice(0, limit)
    .map(toPublicCaseContent);
}
