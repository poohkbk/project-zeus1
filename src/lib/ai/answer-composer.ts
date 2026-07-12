import { aiCategoryLabels, aiSubcategoryLabels } from "@/data/ai/categories";
import { aiDocumentChecklists } from "@/data/ai/document-checklists";
import { aiProcessGuides } from "@/data/ai/process-guides";
import type { AiClassificationResult, AiGuideAnswer, AiGuideResult } from "@/types/ai-guide";
import { getAiRelatedContent } from "./content-retrieval";
import { getAnswerMap } from "./question-engine";
import { evaluateUrgency } from "./urgency";

function answerLabel(value: unknown) {
  if (value === "yes") return "예";
  if (value === "no") return "아니오";
  if (value === "unknown") return "모르겠습니다";
  if (value === "none") return "없음";
  if (Array.isArray(value)) return value.join(", ");
  return String(value ?? "");
}

export function buildAiGuideResult(
  sessionId: string,
  initialQuestionRedacted: string,
  classification: AiClassificationResult,
  answers: AiGuideAnswer[],
): AiGuideResult {
  const category = classification.category === "unclear" ? "civil" : classification.category;
  const answerMap = getAnswerMap(answers);
  const urgency = evaluateUrgency(classification.category, answers, initialQuestionRedacted);
  const relatedContent = getAiRelatedContent(classification, answers);
  const confirmedFacts = answers
    .filter((answer) => answer.value !== null && answer.value !== "" && answer.value !== "unknown")
    .map((answer) => `${answer.field}: ${answerLabel(answer.value)}`)
    .slice(0, 8);
  const missingInformation = answers
    .filter((answer) => answer.value === "unknown" || answer.value === "" || answer.value === null)
    .map((answer) => answer.field)
    .slice(0, 6);

  if (classification.category === "unclear") {
    missingInformation.push("사건 분야를 더 확인해야 합니다.");
  }
  if (classification.category === "administrative") {
    missingInformation.push("처분일, 통지 수령일, 효력 발생일을 구분해 확인해야 합니다.");
  }
  if (classification.category === "inheritance") {
    missingInformation.push("사망일과 상속 관련 기간 확인이 필요합니다.");
  }
  if (classification.category === "civil" && answerMap.get("writtenAgreementExists") !== "yes") {
    missingInformation.push("차용증이나 계약서를 보완할 대체 증거가 필요합니다.");
  }

  const recommendedDocuments = aiDocumentChecklists[category];
  const situationSummary = `${classification.categoryLabel} ${classification.subcategoryLabel ?? ""} 관련 상담 전 확인 내용입니다. 현재 정보만으로는 일반 안내만 가능하며, 자료 검토에 따라 방향이 달라질 수 있습니다.`;
  const relatedContentIds = [
    ...relatedContent.practices,
    ...relatedContent.cases,
    ...relatedContent.guides,
    ...relatedContent.faqs,
  ].map((item) => item.id);

  return {
    sessionId,
    classification,
    urgency,
    situationSummary,
    confirmedFacts: confirmedFacts.length > 0 ? confirmedFacts : ["아직 구체적으로 확인된 답변이 많지 않습니다."],
    missingInformation: Array.from(new Set(missingInformation)).slice(0, 8),
    recommendedDocuments,
    generalProcess: aiProcessGuides[category],
    relatedContent,
    consultationSummary: {
      category: classification.category,
      categoryLabel: classification.categoryLabel,
      subcategory: classification.subcategory,
      subcategoryLabel: classification.subcategory ? aiSubcategoryLabels[classification.subcategory] : undefined,
      userQuestion: initialQuestionRedacted,
      situationSummary,
      confirmedFacts: confirmedFacts.slice(0, 8),
      availableEvidence: confirmedFacts.filter((fact) => /Evidence|Exists|자료|증거|계좌|문자|서류/i.test(fact)),
      missingInformation: Array.from(new Set(missingInformation)).slice(0, 8),
      keyIssues: [classification.subcategoryLabel ?? aiCategoryLabels[classification.category]].filter(Boolean),
      urgencyLevel: urgency.level,
      urgencyReasons: urgency.reasons,
      relatedContentIds,
      generatedAt: new Date().toISOString(),
    },
    safetyNotice:
      "위 내용은 일반적인 법률정보입니다. 구체적인 사실관계와 자료에 따라 결론은 달라질 수 있으며, 승소 여부나 처분 결과를 단정하지 않습니다.",
    generatedBy: "rule",
  };
}
