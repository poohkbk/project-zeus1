import "server-only";

import { getPublishedCases } from "@/lib/data/cases";
import { getPublishedLegalGuides } from "@/lib/data/legal-guides";
import { getPublishedFaqs } from "@/lib/data/faqs";
import { getTagMatchScore, normalizeTag } from "@/lib/content-relations";
import type { AiClassificationResult, AiGuideAnswer, AiRelatedContent } from "@/types/ai-guide";
import { tagsFromAiContext } from "./content-retrieval";

function toMatchedTags(tags: string[], queryTags: string[]) {
  const query = new Set(queryTags.map(normalizeTag));
  return tags.map(normalizeTag).filter((tag) => query.has(tag));
}

function score(tags: string[], text: string, queryTags: string[]) {
  const normalizedText = text.toLowerCase();
  return getTagMatchScore(tags, queryTags) * 6
    + queryTags.filter((tag) => normalizedText.includes(tag)).length * 2;
}

export async function getPublishedAiContentCandidates(
  classification: AiClassificationResult,
  answers: AiGuideAnswer[],
) {
  const queryTags = tagsFromAiContext(classification, answers);
  const rank = (items: AiRelatedContent[]) => items
    .filter((item) => item.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 8);
  const [publishedCases, publishedGuides, publishedFaqs] = await Promise.all([
    getPublishedCases(),
    getPublishedLegalGuides(),
    getPublishedFaqs(),
  ]);

  const cases = rank(publishedCases.map((item) => ({
    id: item.id, type: "case" as const, slug: item.slug, href: item.href,
    title: item.title, excerpt: item.excerpt, category: item.categoryLabel || item.category,
    tags: item.tags, matchScore: score(item.tags, `${item.title} ${item.excerpt}`, queryTags),
    matchedTags: toMatchedTags(item.tags, queryTags),
  })));
  const guides = rank(publishedGuides.map((item) => ({
    id: item.id, type: "guide" as const, slug: item.slug, href: item.href,
    title: item.title, excerpt: item.excerpt, category: item.category,
    tags: item.tags, matchScore: score(item.tags, `${item.title} ${item.excerpt}`, queryTags),
    matchedTags: toMatchedTags(item.tags, queryTags),
  })));
  const faqs = rank(publishedFaqs.map((item) => ({
    id: item.id, type: "faq" as const, slug: item.id, href: "/faq",
    title: item.question, excerpt: item.answer, category: item.category,
    tags: item.tags, matchScore: score(item.tags, `${item.question} ${item.answer}`, queryTags),
    matchedTags: toMatchedTags(item.tags, queryTags),
  })));

  return { practices: [], cases, guides, faqs };
}
