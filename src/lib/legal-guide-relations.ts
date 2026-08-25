import { getTagMatchScore } from "@/lib/content-relations";
import type { CaseCardContent } from "@/types/case";
import type { LegalGuideContent } from "@/types/content";

const practiceRelations = [
  { slug: "civil", labels: new Set(["civil", "민사"]) },
  { slug: "criminal", labels: new Set(["criminal", "형사"]) },
  { slug: "divorce", labels: new Set(["divorce", "이혼", "이혼·가사", "가사"]) },
  { slug: "inheritance", labels: new Set(["inheritance", "상속"]) },
] as const;

export function getLegalGuidePracticeSlug(guide: LegalGuideContent) {
  const values = new Set([guide.category, ...guide.tags].map((value) => value.trim().toLowerCase()));
  return practiceRelations.find((relation) => [...relation.labels].some((label) => values.has(label)))?.slug;
}

export function getRelatedCasesForGuide(
  guide: LegalGuideContent,
  candidates: CaseCardContent[],
  limit = 3,
) {
  const practiceSlug = getLegalGuidePracticeSlug(guide);
  return candidates
    .filter((item) => item.visibility.published)
    .map((item) => ({
      item,
      score:
        getTagMatchScore(item.tags, guide.tags) * 3
        + Number(Boolean(practiceSlug && item.category === practiceSlug)),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || b.item.visibility.publishedAt.localeCompare(a.item.visibility.publishedAt))
    .slice(0, limit)
    .map(({ item }) => item);
}

export function getRelatedLegalGuides(
  guide: LegalGuideContent,
  candidates: LegalGuideContent[],
  limit = 3,
) {
  return candidates
    .filter((item) => item.slug !== guide.slug)
    .map((item) => ({
      item,
      score: getTagMatchScore(item.tags, guide.tags) * 3 + Number(item.category === guide.category),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || (b.item.publishedAt ?? "").localeCompare(a.item.publishedAt ?? ""))
    .slice(0, limit)
    .map(({ item }) => item);
}
