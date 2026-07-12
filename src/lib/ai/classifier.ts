import { aiCategoryLabels, aiSubcategoryLabels } from "@/data/ai/categories";
import { aiKeywordRules } from "@/data/ai/taxonomy";
import type { AiClassificationResult, AiLegalCategory } from "@/types/ai-guide";
import { normalizeUserText } from "./redaction";

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

export function classifyLegalQuestion(input: string, forcedCategory?: AiLegalCategory): AiClassificationResult {
  const redacted = normalizeUserText(input);

  if (forcedCategory && forcedCategory !== "unclear") {
    return {
      category: forcedCategory,
      categoryLabel: aiCategoryLabels[forcedCategory],
      subcategory: "general",
      subcategoryLabel: aiSubcategoryLabels.general,
      confidence: 0.8,
      alternativeCategories: [],
      matchedTags: [forcedCategory],
      reasonSummary: "사용자가 직접 사건 분야를 선택했습니다.",
      requiresConfirmation: true,
    };
  }

  const text = normalize(redacted);
  const scored = aiKeywordRules
    .map((rule) => {
      const matchedKeywords = rule.keywords.filter((keyword) => text.includes(normalize(keyword)));
      return {
        rule,
        matchedKeywords,
        score: matchedKeywords.length,
      };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (!top) {
    return {
      category: "unclear",
      categoryLabel: aiCategoryLabels.unclear,
      confidence: 0.2,
      alternativeCategories: [],
      matchedTags: [],
      reasonSummary: "입력 내용만으로는 분야를 분명히 나누기 어렵습니다.",
      requiresConfirmation: true,
    };
  }

  const categoryScores = new Map<AiLegalCategory, number>();
  for (const item of scored) {
    categoryScores.set(item.rule.category, (categoryScores.get(item.rule.category) ?? 0) + item.score);
  }

  const alternatives = Array.from(categoryScores.entries())
    .filter(([category]) => category !== top.rule.category)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([category, score]) => ({
      category,
      confidence: Math.min(0.75, 0.25 + score * 0.15),
    }));

  return {
    category: top.rule.category,
    categoryLabel: aiCategoryLabels[top.rule.category],
    subcategory: top.rule.subcategory,
    subcategoryLabel: aiSubcategoryLabels[top.rule.subcategory],
    confidence: Math.min(0.95, 0.45 + top.score * 0.14),
    alternativeCategories: alternatives,
    matchedTags: top.rule.tags,
    reasonSummary: top.rule.reason,
    requiresConfirmation: true,
  };
}
