import { legalGuideContents } from "@/data/legal-guides";
import { getPracticeAreas } from "@/data/practice";
import { caseContents, toPublicCaseContent } from "@/data/cases";
import { isPublishedCase } from "@/lib/case-selectors";
import type { LegalGuideContent } from "@/types/content";
import type { PublicCaseContent } from "@/types/case";
import type { PracticeArea } from "@/types/practice";

export function normalizeTag(tag: string) {
  return tag.trim().toLowerCase();
}

export function getTagMatchScore(contentTags: string[], relatedTags: string[]) {
  const related = new Set(relatedTags.map(normalizeTag));
  return contentTags.map(normalizeTag).filter((tag) => related.has(tag)).length;
}

function uniqueById<T extends { id?: string; slug: string }>(items: T[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.id ?? item.slug;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getSimilarCases(currentCase: PublicCaseContent, limit = 3): PublicCaseContent[] {
  const scored = caseContents
    .filter((item) => item.slug !== currentCase.slug)
    .filter((item) => isPublishedCase(item))
    .map((item) => {
      const tagScore = getTagMatchScore(item.tags, currentCase.tags);
      const categoryScore = item.category === currentCase.category ? 2 : 0;
      const subcategoryScore = item.subcategory === currentCase.subcategory ? 1 : 0;
      return { item, score: tagScore * 3 + categoryScore + subcategoryScore };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (Number(b.item.visibility.isFeatured) !== Number(a.item.visibility.isFeatured)) {
        return Number(b.item.visibility.isFeatured) - Number(a.item.visibility.isFeatured);
      }
      return b.item.visibility.publishedAt.localeCompare(a.item.visibility.publishedAt);
    })
    .map(({ item }) => toPublicCaseContent(item));

  const fallback = caseContents
    .filter((item) => item.slug !== currentCase.slug)
    .filter((item) => item.category === currentCase.category)
    .filter((item) => isPublishedCase(item))
    .sort((a, b) => b.visibility.publishedAt.localeCompare(a.visibility.publishedAt))
    .map(toPublicCaseContent);

  return uniqueById([...scored, ...fallback]).slice(0, limit);
}

export function getRelatedPracticeAreas(caseTags: string[], category?: string, limit = 2): PracticeArea[] {
  const scored = getPracticeAreas()
    .map((practice) => ({
      practice,
      score: getTagMatchScore(practice.relatedTags, caseTags) + (practice.slug === category ? 1 : 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.practice.order - b.practice.order)
    .map(({ practice }) => practice);

  if (scored.length > 0) return scored.slice(0, limit);

  return getPracticeAreas()
    .filter((practice) => practice.slug === category)
    .slice(0, limit);
}

export function getRelatedLegalGuides(
  caseTags: string[],
  category?: string,
  limit = 3,
): LegalGuideContent[] {
  const scored = legalGuideContents
    .map((guide) => {
      const categoryScore = guide.tags.includes(category ?? "") ? 2 : 0;
      const featuredScore = guide.featured ? 1 : 0;
      return {
        guide,
        score: getTagMatchScore(guide.tags, caseTags) * 3 + categoryScore + featuredScore,
      };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || (b.guide.publishedAt ?? "").localeCompare(a.guide.publishedAt ?? ""))
    .map(({ guide }) => guide);

  const fallback = legalGuideContents
    .filter((guide) => (category ? guide.tags.includes(category) : guide.featured))
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));

  return uniqueById([...scored, ...fallback]).slice(0, limit);
}
