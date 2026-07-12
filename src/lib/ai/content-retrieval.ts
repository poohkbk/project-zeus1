import { aiCategoryBaseTags, aiCategoryToPracticeSlug } from "@/data/ai/categories";
import { legalGuideContents } from "@/data/legal-guides";
import { getPracticeAreas } from "@/data/practice";
import { getPublishedCases } from "@/lib/case-selectors";
import { getTagMatchScore, normalizeTag } from "@/lib/content-relations";
import type { AiClassificationResult, AiGuideAnswer, AiRelatedContent } from "@/types/ai-guide";

function uniqueTags(tags: string[]) {
  return Array.from(new Set(tags.map(normalizeTag).filter(Boolean)));
}

export function tagsFromAiContext(classification: AiClassificationResult, answers: AiGuideAnswer[]) {
  const categoryTags = classification.category !== "unclear" ? aiCategoryBaseTags[classification.category] : [];
  const answerTags = answers
    .map((answer) => String(answer.value ?? ""))
    .filter((value) => value !== "yes" && value !== "no" && value !== "unknown" && value !== "none");

  return uniqueTags([
    ...categoryTags,
    ...(classification.matchedTags ?? []),
    ...(classification.subcategory ? [classification.subcategory] : []),
    ...answerTags,
  ]);
}

function matchedTags(contentTags: string[], queryTags: string[]) {
  const query = new Set(queryTags.map(normalizeTag));
  return contentTags.map(normalizeTag).filter((tag) => query.has(tag));
}

function scoreContent(contentTags: string[], title: string, queryTags: string[]) {
  const tagScore = getTagMatchScore(contentTags, queryTags) * 6;
  const titleScore = queryTags.filter((tag) => title.toLowerCase().includes(tag)).length * 2;
  return tagScore + titleScore;
}

export function getAiRelatedContent(classification: AiClassificationResult, answers: AiGuideAnswer[]) {
  const queryTags = tagsFromAiContext(classification, answers);
  const practiceSlug =
    classification.category !== "unclear" ? aiCategoryToPracticeSlug[classification.category] : undefined;

  const practices: AiRelatedContent[] = getPracticeAreas()
    .filter((practice) => !practiceSlug || practice.slug === practiceSlug)
    .map((practice) => {
      const tags = uniqueTags([practice.slug, ...practice.relatedTags]);
      const score = scoreContent(tags, practice.title, queryTags);
      return {
        id: `practice-${practice.slug}`,
        type: "practice" as const,
        slug: practice.slug,
        href: `/practice/${practice.slug}`,
        title: practice.title,
        excerpt: practice.shortDescription,
        category: practice.slug,
        tags,
        matchScore: score,
        matchedTags: matchedTags(tags, queryTags),
      };
    })
    .filter((item) => item.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 2);

  const cases: AiRelatedContent[] = getPublishedCases()
    .map((caseItem) => ({
      id: caseItem.id,
      type: "case" as const,
      slug: caseItem.slug,
      href: caseItem.href,
      title: caseItem.title,
      excerpt: caseItem.excerpt,
      category: caseItem.category,
      tags: caseItem.tags,
      matchScore: scoreContent(caseItem.tags, caseItem.title, queryTags) + (caseItem.visibility.isFeatured ? 2 : 0),
      matchedTags: matchedTags(caseItem.tags, queryTags),
    }))
    .filter((item) => item.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);

  const guides: AiRelatedContent[] = legalGuideContents
    .map((guide) => ({
      id: guide.id,
      type: "guide" as const,
      slug: guide.slug,
      href: guide.href,
      title: guide.title,
      excerpt: guide.excerpt,
      category: guide.category,
      tags: guide.tags,
      matchScore: scoreContent(guide.tags, guide.title, queryTags) + (guide.featured ? 2 : 0),
      matchedTags: matchedTags(guide.tags, queryTags),
    }))
    .filter((item) => item.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);

  const faqs: AiRelatedContent[] = getPracticeAreas()
    .flatMap((practice) =>
      practice.faq.map((faq, index) => {
        const tags = uniqueTags([practice.slug, ...practice.relatedTags]);
        return {
          id: `faq-${practice.slug}-${index}`,
          type: "faq" as const,
          slug: `${practice.slug}-${index}`,
          href: `/practice/${practice.slug}#practice-faq-title`,
          title: faq.question,
          excerpt: faq.answer,
          category: practice.slug,
          tags,
          matchScore: scoreContent(tags, faq.question, queryTags),
          matchedTags: matchedTags(tags, queryTags),
        };
      }),
    )
    .filter((item) => item.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5);

  return { practices, cases, guides, faqs };
}
