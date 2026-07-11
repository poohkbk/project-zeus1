import { tagLabels } from "@/lib/case-taxonomy";
import type { CaseCategory, CaseFilterState, CaseSortOption, PublicCaseContent } from "@/types/case";

export function normalizeSearchText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function createCaseSearchIndex(caseItem: PublicCaseContent) {
  return normalizeSearchText(
    [
      caseItem.title,
      caseItem.excerpt,
      caseItem.categoryLabel,
      caseItem.subcategory,
      caseItem.summary,
      caseItem.resultTitle,
      caseItem.resultDescription,
      caseItem.reconstructedFacts.join(" "),
      caseItem.issues.map((issue) => `${issue.title} ${issue.description}`).join(" "),
      caseItem.response.map((step) => `${step.title} ${step.description}`).join(" "),
      caseItem.tags.map((tag) => tagLabels[tag] ?? "").join(" "),
    ].join(" "),
  );
}

export function getCaseSearchScore(caseItem: PublicCaseContent, query: string) {
  const normalized = normalizeSearchText(query);
  if (!normalized) return 0;
  const words = normalized.split(" ");
  const index = createCaseSearchIndex(caseItem);
  if (!words.every((word) => index.includes(word))) return -1;

  let score = 1;
  const title = normalizeSearchText(caseItem.title);
  if (title === normalized) score += 50;
  if (title.includes(normalized)) score += 30;
  if (normalizeSearchText(caseItem.subcategory).includes(normalized)) score += 15;
  if (caseItem.tags.some((tag) => normalizeSearchText(tagLabels[tag] ?? "").includes(normalized))) score += 12;
  if (normalizeSearchText(caseItem.excerpt).includes(normalized)) score += 8;
  if (normalizeSearchText(caseItem.summary).includes(normalized)) score += 5;
  return score;
}

function compareLatest(a: PublicCaseContent, b: PublicCaseContent) {
  return b.visibility.publishedAt.localeCompare(a.visibility.publishedAt);
}

function compareFeatured(a: PublicCaseContent, b: PublicCaseContent) {
  const aRecommended = Number(a.visibility.showOnSearch || a.visibility.isFeatured);
  const bRecommended = Number(b.visibility.showOnSearch || b.visibility.isFeatured);
  if (bRecommended !== aRecommended) return bRecommended - aRecommended;
  const aOrder = a.visibility.featuredOrder ?? Number.MAX_SAFE_INTEGER;
  const bOrder = b.visibility.featuredOrder ?? Number.MAX_SAFE_INTEGER;
  if (aOrder !== bOrder) return aOrder - bOrder;
  return compareLatest(a, b);
}

export function filterAndSortCases(
  cases: PublicCaseContent[],
  filter: CaseFilterState,
  tagMatchMode: "or" | "and" = "or",
) {
  const category = filter.category;
  const selectedTags = filter.tags;
  const query = normalizeSearchText(filter.q);

  const scored = cases
    .map((caseItem) => ({ caseItem, searchScore: getCaseSearchScore(caseItem, query) }))
    .filter(({ caseItem, searchScore }) => {
      if (category !== "all" && caseItem.category !== category) return false;
      if (selectedTags.length > 0) {
        const tagSet = new Set(caseItem.tags);
        const tagMatched =
          tagMatchMode === "and"
            ? selectedTags.every((tag) => tagSet.has(tag))
            : selectedTags.some((tag) => tagSet.has(tag));
        if (!tagMatched) return false;
      }
      if (query && searchScore < 0) return false;
      return true;
    });

  const sort = filter.sort as CaseSortOption;
  scored.sort((a, b) => {
    if (sort === "latest") return compareLatest(a.caseItem, b.caseItem);
    if (sort === "relevance" && query) return b.searchScore - a.searchScore || compareFeatured(a.caseItem, b.caseItem);
    return compareFeatured(a.caseItem, b.caseItem);
  });

  return scored.map(({ caseItem }) => caseItem);
}

export function isCaseCategory(value: string): value is CaseCategory {
  return value === "civil" || value === "criminal" || value === "divorce" || value === "inheritance";
}
