import { legalGuideContents } from "@/data/legal-guides";
import { isPublishedCase } from "@/lib/case-selectors";
import type { LegalGuideContent, RelatedContentBase } from "@/types/content";
import type { CaseCardContent } from "@/types/case";

export function normalizeTag(tag: string) {
  return tag.trim().toLowerCase();
}

export function getTagMatchScore(contentTags: string[], relatedTags: string[]) {
  const related = new Set(relatedTags.map(normalizeTag));
  return contentTags.map(normalizeTag).filter((tag) => related.has(tag)).length;
}

function sortRelated<T extends RelatedContentBase>(
  contents: T[],
  relatedTags: string[],
  limit: number,
) {
  const matched = contents
    .map((content) => ({
      content,
      score: getTagMatchScore(content.tags, relatedTags),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (Number(b.content.featured) !== Number(a.content.featured)) {
        return Number(b.content.featured) - Number(a.content.featured);
      }
      return (b.content.publishedAt ?? "").localeCompare(a.content.publishedAt ?? "");
    })
    .map((item) => item.content);

  if (matched.length > 0) return matched.slice(0, limit);

  return contents
    .filter((content) => content.featured)
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, limit);
}

export function getRelatedCases(
  candidates: CaseCardContent[],
  relatedTags: string[],
  limit = 3,
): CaseCardContent[] {
  const matched = candidates
    .filter((content) => isPublishedCase(content))
    .map((content) => ({
      content,
      score:
        getTagMatchScore(content.tags, relatedTags) +
        (relatedTags.map(normalizeTag).includes(content.category) ? 2 : 0) +
        (content.visibility.showOnPractice ? 1 : 0),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (Number(b.content.visibility.isFeatured) !== Number(a.content.visibility.isFeatured)) {
        return Number(b.content.visibility.isFeatured) - Number(a.content.visibility.isFeatured);
      }
      return b.content.visibility.publishedAt.localeCompare(a.content.visibility.publishedAt);
    })
    .map((item) => item.content);

  return matched.slice(0, limit);
}

export function getRelatedGuides(
  relatedTags: string[],
  limit = 3,
  candidates: LegalGuideContent[] = legalGuideContents,
): LegalGuideContent[] {
  return sortRelated(candidates, relatedTags, limit);
}

type LocalGuideCategory = "civil" | "criminal" | "divorce" | "inheritance";

function normalizeGuideCategory(category: string): LocalGuideCategory | "administrative" | undefined {
  const normalized = normalizeTag(category).replace(/\s+/g, "");
  if (normalized === "civil" || normalized === "민사") return "civil";
  if (normalized === "criminal" || normalized === "형사") return "criminal";
  if (["divorce", "이혼", "이혼·가사", "이혼가사", "가사"].includes(normalized)) return "divorce";
  if (normalized === "inheritance" || normalized === "상속") return "inheritance";
  if (normalized === "administrative" || normalized === "행정") return "administrative";
  return undefined;
}

function sortLocalGuideCandidates(
  candidates: LegalGuideContent[],
  relatedTags: string[],
) {
  return candidates
    .map((content) => ({ content, tagScore: getTagMatchScore(content.tags, relatedTags) }))
    .sort((a, b) => {
      if (b.tagScore !== a.tagScore) return b.tagScore - a.tagScore;
      return (b.content.publishedAt ?? "").localeCompare(a.content.publishedAt ?? "");
    })
    .map((item) => item.content);
}

export function getLocalLandingRelatedGuides(
  candidates: LegalGuideContent[],
  practiceSlug: LocalGuideCategory | undefined,
  relatedTags: string[],
  limit = 3,
) {
  if (practiceSlug) {
    return sortLocalGuideCandidates(
      candidates.filter((guide) => normalizeGuideCategory(guide.category) === practiceSlug),
      relatedTags,
    ).slice(0, limit);
  }

  const representatives = (["civil", "criminal", "divorce", "inheritance"] as const)
    .map((category) =>
      sortLocalGuideCandidates(
        candidates.filter((guide) => normalizeGuideCategory(guide.category) === category),
        relatedTags,
      )[0],
    )
    .filter((guide): guide is LegalGuideContent => Boolean(guide));

  return representatives
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, limit);
}
