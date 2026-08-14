import { aiCategoryLabels, aiSubcategoryLabels } from "@/data/ai/categories";
import { aiDocumentChecklists } from "@/data/ai/document-checklists";
import { aiProcessGuides } from "@/data/ai/process-guides";
import { aiQuestionFlows } from "@/data/ai/question-flows";
import type { AiClassificationResult, AiGuideAnswer, AiGuideQuestion, AiGuideResult } from "@/types/ai-guide";
import { getAiRelatedContent } from "./content-retrieval";
import { getAnswerMap } from "./question-engine";
import { evaluateSafetyGuidance } from "./safety";
import { evaluateUrgency } from "./urgency";

const answerFieldLabels: Record<string, string> = {
  disputeType: "문제 유형",
  writtenAgreementExists: "계약서·차용증 등 서면 자료",
  transferEvidenceExists: "계좌이체·영수증 자료",
  messageEvidenceExists: "문자·카카오톡·이메일 기록",
  courtDocumentReceived: "법원 서류 또는 내용증명 수령",
  partyRole: "현재 입장",
  investigationStage: "진행 단계",
  criminalCaseNumber: "재판 중인 사건번호",
  attendanceDate: "조사·출석 예정일",
  detained: "체포·구속·압수수색 등 긴급 상황",
  currentStatus: "현재 이혼 절차",
  minorChildrenCount: "미성년 자녀",
  propertyDivisionConcern: "재산분할·연금 문제",
  custodyConcern: "친권·양육권·양육비 문제",
  affairIssue: "부정행위·상간 손해배상 문제",
  caseType: "상속 문제 유형",
  deceasedDate: "사망일",
  debtExists: "상속채무 확인",
  estateExists: "상속재산 확인",
  dispositionType: "행정 문제 유형",
  noticeReceived: "처분서·통지서 수령",
  noticeReceivedDate: "통지서 수령일",
  enforcementDate: "처분 효력 발생일",
  administrativeAppealFiled: "이의신청·행정심판·행정소송 진행 여부",
};

const evidenceFields = new Set([
  "writtenAgreementExists",
  "transferEvidenceExists",
  "messageEvidenceExists",
  "courtDocumentReceived",
  "noticeReceived",
]);

function answerLabel(value: unknown) {
  if (value === "yes") return "예";
  if (value === "no") return "아니오";
  if (value === "unknown") return "모르겠습니다";
  if (value === "none") return "없음";
  if (Array.isArray(value)) return value.join(", ");
  return String(value ?? "");
}

function findQuestion(field: string, questions: AiGuideQuestion[] = []) {
  const tailoredQuestion = questions.find((question) => question.field === field);
  if (tailoredQuestion) return tailoredQuestion;
  return Object.values(aiQuestionFlows)
    .flat()
    .find((question) => question.field === field);
}

function answerDisplayLabel(answer: AiGuideAnswer, questions: AiGuideQuestion[] = []) {
  const question = findQuestion(answer.field, questions);

  if (Array.isArray(answer.value)) {
    return answer.value
      .map((value) => question?.options?.find((option) => option.value === value)?.label ?? answerLabel(value))
      .join(", ");
  }

  return question?.options?.find((option) => option.value === answer.value)?.label ?? answerLabel(answer.value);
}

function formatAnswer(answer: AiGuideAnswer, questions: AiGuideQuestion[] = []) {
  const question = findQuestion(answer.field, questions);
  return `${answerFieldLabels[answer.field] ?? question?.question ?? answer.field}: ${answerDisplayLabel(answer, questions)}`;
}

function isPositiveEvidence(answer: AiGuideAnswer) {
  return evidenceFields.has(answer.field) && answer.value === "yes";
}

function buildSectionComments(
  category: AiClassificationResult["category"],
  confirmedFacts: string[],
  missingInformation: string[],
) {
  const categoryComments: Record<AiClassificationResult["category"], string> = {
    civil: "계약 내용과 금전 흐름을 함께 살피면 대응 방향을 더 분명히 정할 수 있습니다.",
    criminal: "수사 단계와 증거 내용을 함께 살펴 신중하게 대응 방향을 정할 필요가 있습니다.",
    divorce: "재산과 자녀 등 현재 상황을 함께 살펴 구체적인 해결 방향을 정할 수 있습니다.",
    inheritance: "상속재산과 채무, 관련 기한을 함께 검토해 대응 방향을 정할 필요가 있습니다.",
    administrative: "처분 사유와 불복기한을 함께 검토해 가능한 대응 절차를 확인해야 합니다.",
    unclear: "확인된 사실을 토대로 사건의 성격과 우선 대응할 쟁점을 정리할 수 있습니다.",
  };

  return {
    confirmedFacts: confirmedFacts.length > 0
      ? categoryComments[category]
      : "아직 확인된 사실이 적어 사건 경위부터 차근차근 정리하는 것이 좋겠습니다.",
    missingInformation: missingInformation.length > 0
      ? "남은 사실에 따라 대응이 달라질 수 있으므로 변호사 상담으로 확인해보세요."
      : "중요한 사실은 대체로 확인됐으며, 변호사 상담에서 대응 방법을 검토해보세요.",
    recommendedDocuments: "관련 원본 자료를 준비하면 변호사가 사실관계와 대응 방향을 더 정확히 검토할 수 있습니다.",
  };
}

const trafficAccidentPattern = /교통사고|자동차\s*사고|차량\s*사고|보행자\s*사고|접촉사고|추돌|블랙박스/;

function isTrafficAccident(question: string, classification: AiClassificationResult) {
  return classification.subcategory === "damages" && trafficAccidentPattern.test(question);
}

function trafficAccidentGuidance() {
  return {
    missingInformation: [
      "사고 일시와 장소, 충돌 경위를 확인해주세요.",
      "경찰 신고와 보험사 사고 접수가 되었는지 확인해주세요.",
      "현재 치료 내용과 향후 치료 예정이 있는지 확인해주세요.",
      "상대방과 과실비율에 다툼이 있는지 확인해주세요.",
    ],
    recommendedDocuments: [
      "사고 현장 사진·영상과 블랙박스 원본",
      "교통사고사실확인원 또는 경찰 신고 자료",
      "진단서·진료기록·치료비 자료",
      "보험사 접수·보상 안내와 과실비율 자료",
      "차량 수리 견적서와 영업손실 자료",
      "상대방 차량번호·연락처 등 확인 자료",
    ],
  };
}

export function buildAiGuideResult(
  sessionId: string,
  initialQuestionRedacted: string,
  classification: AiClassificationResult,
  answers: AiGuideAnswer[],
  questions: AiGuideQuestion[] = [],
): AiGuideResult {
  const category = classification.category === "unclear" ? "civil" : classification.category;
  const answerMap = getAnswerMap(answers);
  const urgency = evaluateUrgency(classification.category, answers, initialQuestionRedacted);
  const safetyGuidance = evaluateSafetyGuidance(initialQuestionRedacted, answers);
  const trafficAccident = isTrafficAccident(initialQuestionRedacted, classification);
  const relatedContent = getAiRelatedContent(classification, answers);
  const confirmedFacts = answers
    .filter((answer) => answer.value !== null && answer.value !== "" && answer.value !== "unknown")
    .map((answer) => formatAnswer(answer, questions))
    .slice(0, 8);
  const missingInformation = answers
    .filter((answer) => answer.value === "unknown" || answer.value === "" || answer.value === null)
    .map((answer) => `${answerFieldLabels[answer.field] ?? findQuestion(answer.field, questions)?.question ?? answer.field} 항목을 확인해주세요.`)
    .slice(0, 6);
  const availableEvidence = answers.filter(isPositiveEvidence).map((answer) => formatAnswer(answer, questions)).slice(0, 6);

  if (classification.category === "unclear") {
    missingInformation.push("분쟁이 시작된 경위와 상대방의 입장을 확인해주세요.");
  }
  if (classification.category === "administrative") {
    missingInformation.push("처분일, 통지 수령일, 효력 발생일이 각각 언제인지 확인해주세요.");
  }
  if (classification.category === "inheritance") {
    missingInformation.push("사망일과 상속 사실을 알게 된 날짜가 언제인지 확인해주세요.");
  }
  if (classification.category === "civil" && classification.subcategory !== "damages" && answerMap.get("writtenAgreementExists") !== "yes") {
    missingInformation.push("차용증·계약서가 없다면 이체내역이나 대화 기록이 있는지 확인해주세요.");
  }
  if (trafficAccident) {
    missingInformation.push(...trafficAccidentGuidance().missingInformation);
  }
  if (safetyGuidance.flags.includes("evidence-preservation")) {
    missingInformation.push("증거는 삭제하거나 숨기지 말고 원본 상태로 보존해야 합니다.");
  }
  if (safetyGuidance.flags.includes("truthful-statement")) {
    missingInformation.push("조사 진술은 사실관계에 맞게 준비하고, 진술 전 법률상담을 받을 수 있습니다.");
  }
  if (safetyGuidance.flags.includes("no-outcome-guarantee")) {
    missingInformation.push("무죄 여부는 증거와 수사기록 전체를 검토한 뒤 판단해야 합니다.");
  }

  const recommendedDocuments = trafficAccident
    ? trafficAccidentGuidance().recommendedDocuments
    : classification.subcategory === "damages"
      ? ["손해 발생 경위 자료", "사진·영상·녹취", "진단서·수리비 등 손해액 자료", "상대방과 주고받은 연락", "보험 또는 보상 관련 자료", "상대방 확인 자료"]
      : aiDocumentChecklists[category];
  const situationSummary = `${classification.categoryLabel} ${
    classification.subcategoryLabel ?? ""
  } 관련 상담 전 확인 내용입니다. 현재 정보만으로는 일반 안내만 가능하며, 자료 검토에 따라 방향이 달라질 수 있습니다.`;
  const relatedContentIds = [
    ...relatedContent.practices,
    ...relatedContent.cases,
    ...relatedContent.guides,
    ...relatedContent.faqs,
  ].map((item) => item.id);
  const sectionComments = buildSectionComments(classification.category, confirmedFacts, missingInformation);

  return {
    sessionId,
    classification,
    urgency,
    situationSummary,
    confirmedFacts: confirmedFacts.length > 0 ? confirmedFacts : ["아직 구체적으로 확인된 답변이 많지 않습니다."],
    missingInformation: Array.from(new Set(missingInformation)).slice(0, 8),
    recommendedDocuments,
    sectionComments,
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
      availableEvidence,
      missingInformation: Array.from(new Set(missingInformation)).slice(0, 8),
      keyIssues: [classification.subcategoryLabel ?? aiCategoryLabels[classification.category]].filter(Boolean),
      urgencyLevel: urgency.level,
      urgencyReasons: urgency.reasons,
      relatedContentIds,
      generatedAt: new Date().toISOString(),
    },
    safetyWarnings: safetyGuidance.notices,
    safetyNotice: [
      ...safetyGuidance.notices,
      "이 내용은 일반적인 법률정보입니다. 구체적인 사실관계와 자료에 따라 결론은 달라질 수 있으며, 승소 여부나 처분 결과를 단정하지 않습니다.",
    ].join(" "),
    generatedBy: "rule",
  };
}
