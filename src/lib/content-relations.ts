import { caseContents } from "@/data/cases";
import { legalGuideContents } from "@/data/legal-guides";
import { isPublishedCase } from "@/lib/case-selectors";
import { toPublicCaseContent } from "@/data/cases";
import type { LegalGuideContent, RelatedContentBase } from "@/types/content";
import type { PublicCaseContent } from "@/types/case";

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

export function getRelatedCases(relatedTags: string[], limit = 3): PublicCaseContent[] {
  const matched = caseContents
    .filter((content) => isPublishedCase(content))
    .map((content) => ({
      content,
      score:
        getTagMatchScore(content.tags, relatedTags) +
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
    .map((item) => toPublicCaseContent(item.content));

  return matched.slice(0, limit);
}

export function getRelatedGuides(relatedTags: string[], limit = 3): LegalGuideContent[] {
  return sortRelated(legalGuideContents, relatedTags, limit);
}
