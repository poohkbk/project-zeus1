import { aiCategoryLabels, aiSubcategoryLabels } from "@/data/ai/categories";
import { aiProcessGuides } from "@/data/ai/process-guides";
import { aiQuestionFlows } from "@/data/ai/question-flows";
import type { AiClassificationResult, AiGuideAnswer, AiGuideQuestion, AiGuideResult } from "@/types/ai-guide";
import { getAiRelatedContent } from "./content-retrieval";
import { classifyLegalQuestion } from "./classifier";
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

function buildStrictGuidance(
  classification: AiClassificationResult,
  answerMap: Map<string, AiGuideAnswer["value"]>,
  initialQuestion: string,
) {
  if (isTrafficAccident(initialQuestion, classification)) return trafficAccidentGuidance();

  if (classification.category === "civil") {
    const disputeType = String(answerMap.get("disputeType") ?? classification.subcategory ?? "general");
    if (disputeType === "debt") return {
      missingInformation: ["돈을 빌려준 날짜와 금액을 확인해주세요.", "변제기와 실제 변제 내역을 확인해주세요.", "상대방에게 반환을 요청한 기록이 있는지 확인해주세요."],
      recommendedDocuments: ["차용증·각서·공증서", "계좌이체·입금 내역", "변제 약속과 독촉 대화", "내용증명·지급명령·소송서류", "상대방 확인 자료"],
    };
    if (disputeType === "contract") return {
      missingInformation: ["계약 내용과 체결일을 확인해주세요.", "각 당사자가 이행한 내용과 위반 시점을 확인해주세요.", "해제·해지 또는 이행을 요구한 기록이 있는지 확인해주세요."],
      recommendedDocuments: ["계약서·견적서·발주서", "대금 지급과 이행 내역", "계약 관련 문자·이메일", "해제·해지·이행 요청 자료", "손해 발생 자료"],
    };
    if (disputeType === "damages" || classification.subcategory === "damages") return {
      missingInformation: ["손해가 발생한 날짜와 경위를 확인해주세요.", "상대방의 행위와 손해 사이의 관련성을 확인해주세요.", "현재까지 발생한 손해액과 향후 예상 손해를 확인해주세요."],
      recommendedDocuments: ["손해 발생 경위 자료", "사진·영상·녹취", "진단서·수리비 등 손해액 자료", "상대방과 주고받은 연락", "보험 또는 보상 관련 자료", "상대방 확인 자료"],
    };
    return {
      missingInformation: ["부동산·임대차 등 분쟁 대상과 권리관계를 확인해주세요.", "점유·사용·대금 지급 경위를 확인해주세요.", "상대방의 현재 요구와 소송 진행 여부를 확인해주세요."],
      recommendedDocuments: ["등기사항증명서·건축물대장", "임대차·매매·공사 계약 자료", "보증금·대금 지급 내역", "하자·점유 상태 사진", "상대방과 주고받은 연락", "내용증명·법원서류"],
    };
  }

  if (classification.category === "criminal") {
    const role = String(answerMap.get("partyRole") ?? "unknown");
    const stage = String(answerMap.get("investigationStage") ?? "unknown");
    if (role === "victim") return {
      missingInformation: ["피해 일시·장소와 구체적인 경위를 확인해주세요.", "가해자로 보는 상대방과 피해 내용을 확인해주세요.", "고소장 접수 여부와 담당 수사기관을 확인해주세요.", "처벌 의사와 합의 진행 여부를 확인해주세요."],
      recommendedDocuments: ["피해 경위와 시간순 정리", "문자·녹취·사진·영상 등 피해 증거", "진단서·피해금액 자료", "상대방 확인 자료", "고소장·사건접수증·수사기관 연락", "목격자 정보"],
    };
    if (role === "suspect" && stage === "trial") return {
      missingInformation: ["공소사실과 적용 죄명을 확인해주세요.", "재판 기일과 현재 증거조사 단계를 확인해주세요.", "혐의에 대한 인정·부인 입장과 합의 여부를 확인해주세요."],
      recommendedDocuments: ["공소장·의견서·증거목록", "사건번호와 재판기일 통지", "혐의를 반박하거나 설명할 자료", "수사기관 진술조서", "합의·피해회복 자료", "정상관계 자료"],
    };
    if (role === "suspect") return {
      missingInformation: ["문제가 된 혐의와 고소 내용을 확인해주세요.", "경찰·검찰 연락 여부와 출석 예정일을 확인해주세요.", "혐의에 대한 인정·부인 입장과 이미 진술한 내용을 확인해주세요.", "압수수색·체포·구속 등 긴급 상황이 있는지 확인해주세요."],
      recommendedDocuments: ["출석요구 문자·사건번호", "고소 내용이나 혐의를 알 수 있는 자료", "혐의를 반박하거나 설명할 대화·사진·거래 자료", "이미 제출하거나 진술한 내용", "합의·피해회복 관련 자료", "관련 일정 정리"],
    };
    if (role === "witness") return {
      missingInformation: ["어느 기관에서 어떤 이유로 출석을 요청했는지 확인해주세요.", "직접 경험한 사실과 전해 들은 내용을 구분해주세요.", "사건 당사자와의 관계와 관련 자료 보유 여부를 확인해주세요."],
      recommendedDocuments: ["출석요구 문자·연락 내용", "직접 경험한 사실의 시간순 정리", "당시 작성된 대화·사진·영상", "사건 당사자와의 관계를 설명할 자료"],
    };
    return {
      missingInformation: ["피해자·고소인인지 피의자·피고소인인지 확인해주세요.", "현재 경찰·검찰·재판 중 어느 단계인지 확인해주세요.", "다음 조사일이나 재판일이 정해졌는지 확인해주세요."],
      recommendedDocuments: ["수사기관·법원에서 받은 연락과 서류", "사건 경위의 시간순 정리", "관련 문자·사진·영상·거래 자료", "사건번호와 향후 일정"],
    };
  }

  if (classification.category === "divorce") {
    if (answerMap.get("custodyConcern") === "yes" || classification.subcategory === "custody") return {
      missingInformation: ["자녀의 나이와 현재 주된 양육자가 누구인지 확인해주세요.", "각 부모의 양육 환경과 실제 돌봄 시간을 확인해주세요.", "희망하는 친권·양육권·면접교섭 내용을 확인해주세요.", "자녀의 의사와 학교·생활환경을 유지할 수 있는지 확인해주세요.", "현재 양육비 지급 여부와 자녀의 월 지출을 확인해주세요."],
      recommendedDocuments: ["가족관계증명서·자녀 기본증명서", "현재까지의 양육 분담과 돌봄 일정 정리", "자녀의 학교·어린이집·의료 관련 자료", "주거·근무시간 등 양육 환경 자료", "자녀 교육·의료·생활비 내역", "양육비 지급 내역", "면접교섭과 양육 협의 관련 대화"],
    };
    if (answerMap.get("affairIssue") === "yes" || classification.subcategory === "affair" || /상간|외도|불륜|부정행위|바람/.test(initialQuestion)) return {
      missingInformation: ["부정행위가 시작된 시기와 알게 된 날짜를 확인해주세요.", "상간 상대방이 혼인 사실을 알고 있었는지 확인해주세요.", "부정행위 전 혼인관계가 이미 파탄된 상태였는지 확인해주세요.", "상간 상대방의 이름·연락처 등 특정 정보가 있는지 확인해주세요.", "부정행위를 안 날부터 현재까지의 기간을 확인해주세요."],
      recommendedDocuments: ["부정행위 관련 대화·사진·숙박·결제 자료", "상간 상대방이 혼인 사실을 알았음을 보여주는 자료", "혼인관계증명서·가족관계증명서", "부정행위를 알게 된 경위와 날짜 정리", "상간 상대방 확인 자료", "상간자와 주고받은 연락·내용증명·소송서류"],
    };
    return {
      missingInformation: ["이혼 의사와 현재 협의·별거·소송 상태를 확인해주세요.", "혼인 중 형성한 재산과 채무의 명의·가액을 확인해주세요.", "각 재산의 취득 경위와 기여 내용을 확인해주세요."],
      recommendedDocuments: ["혼인관계증명서·가족관계증명서", "부동산·예금·보험·주식 자료", "대출·채무 자료", "소득·연금·퇴직금 자료", "재산 형성 기여 자료", "소장·답변서·조정서류"],
    };
  }

  if (classification.category === "inheritance") {
    const caseType = String(answerMap.get("caseType") ?? classification.subcategory ?? "general");
    if (["renunciation", "limited-acceptance"].includes(caseType)) return {
      missingInformation: ["사망일과 상속 사실을 알게 된 날짜를 확인해주세요.", "상속재산과 채무의 대략적인 규모를 확인해주세요.", "재산을 처분하거나 채무를 변제한 사실이 있는지 확인해주세요."],
      recommendedDocuments: ["사망진단서·기본증명서", "가족관계증명서", "상속재산 조회 자료", "채무·독촉·소송 자료", "다른 상속인 확인 자료", "재산 처분·채무 변제 내역"],
    };
    if (caseType === "reserved-share") return {
      missingInformation: ["사망일과 증여·유언 내용을 알게 된 날짜를 확인해주세요.", "법정상속인과 생전 증여를 받은 사람을 확인해주세요.", "유언·증여 재산과 남은 상속재산의 가액을 확인해주세요."],
      recommendedDocuments: ["기본증명서·가족관계증명서", "유언장·증여계약·등기 자료", "금융거래·부동산 가액 자료", "상속재산 목록", "다른 상속인과 주고받은 연락"],
    };
    return {
      missingInformation: ["상속인별 관계와 협의 여부를 확인해주세요.", "분할 대상 재산과 채무의 목록·가액을 확인해주세요.", "생전 증여와 재산 관리 기여가 있었는지 확인해주세요."],
      recommendedDocuments: ["기본증명서·가족관계증명서", "부동산·예금·주식·보험 자료", "상속채무 자료", "유언장·생전 증여 자료", "상속인 간 협의·연락", "재산 관리·기여 자료"],
    };
  }

  const dispositionType = String(answerMap.get("dispositionType") ?? classification.subcategory ?? "administrative-lawsuit");
  const commonAdministrative = {
    missingInformation: ["처분 내용과 처분 사유를 확인해주세요.", "처분서를 받은 날짜와 효력 발생일을 확인해주세요.", "이의신청·행정심판·행정소송 진행 여부를 확인해주세요."],
    recommendedDocuments: ["처분서·통지서·공문", "처분 사유와 근거 자료", "통지 수령일 확인 자료", "사전통지·의견제출·청문 자료", "이의신청·행정심판·소송서류", "처분으로 인한 손해 자료"],
  };
  if (dispositionType === "business-suspension") commonAdministrative.recommendedDocuments.push("영업신고·매출·위반 관련 자료");
  if (dispositionType === "license-cancellation") commonAdministrative.recommendedDocuments.push("면허·자격과 위반 관련 자료");
  if (dispositionType === "discipline") commonAdministrative.recommendedDocuments.push("징계의결서·소명서·인사기록");
  return commonAdministrative;
}

export function buildAiGuideResult(
  sessionId: string,
  initialQuestionRedacted: string,
  classification: AiClassificationResult,
  answers: AiGuideAnswer[],
  questions: AiGuideQuestion[] = [],
): AiGuideResult {
  const answerMap = getAnswerMap(answers);
  const answerContext = answers.flatMap((answer) => Array.isArray(answer.value) ? answer.value : [String(answer.value ?? "")]);
  const positiveQuestionContext = answers
    .filter((answer) => answer.value === "yes")
    .map((answer) => findQuestion(answer.field, questions)?.question ?? "");
  const consultationContext = [initialQuestionRedacted, ...answerContext, ...positiveQuestionContext].join(" ");
  const contextualClassification = classifyLegalQuestion(consultationContext);
  const contextualMatch = contextualClassification.category === classification.category && contextualClassification.subcategory !== "general";
  let effectiveClassification: AiClassificationResult = contextualMatch ? contextualClassification : classification;
  const debtIntent = effectiveClassification.category === "civil" && /대여금|차용증|돈을\s*(?:빌려|빌린)|빌려준|빌려줬|갚(?:아|지|으)|상환|변제/.test(consultationContext);
  if (debtIntent) {
    effectiveClassification = {
      ...effectiveClassification,
      subcategory: "debt",
      subcategoryLabel: aiSubcategoryLabels.debt,
      matchedTags: Array.from(new Set([...effectiveClassification.matchedTags, "debt", "loan", "collection"])),
      reasonSummary: "후속 답변에서 빌려준 돈의 반환 문제와 상환 요청 내용이 확인되었습니다.",
    };
  }
  const custodyIntent = effectiveClassification.category === "divorce"
    && /양육권|친권|양육비|양육s*계획|자녀s*양육|주된s*양육자/.test(consultationContext);
  const affairIntent = effectiveClassification.category === "divorce" && /상간|외도|불륜|부정행위|바람/.test(consultationContext);
  if (custodyIntent) {
    effectiveClassification = {
      ...effectiveClassification,
      subcategory: "custody",
      subcategoryLabel: aiSubcategoryLabels.custody,
      matchedTags: Array.from(new Set([...effectiveClassification.matchedTags, "custody", "child-support"])),
      reasonSummary: "상담 답변에서 친권·양육권과 자녀 양육계획이 주된 상담 목표로 확인되었습니다.",
    };
  } else if (affairIntent) {
    effectiveClassification = {
      ...effectiveClassification,
      subcategory: "affair",
      subcategoryLabel: aiSubcategoryLabels.affair,
      matchedTags: Array.from(new Set([...effectiveClassification.matchedTags, "affair", "damages"])),
      reasonSummary: "후속 답변에서 상간자 손해배상 의사가 확인되었습니다.",
    };
  }
  const category = effectiveClassification.category === "unclear" ? "civil" : effectiveClassification.category;
  const urgency = evaluateUrgency(effectiveClassification.category, answers, initialQuestionRedacted);
  const safetyGuidance = evaluateSafetyGuidance(initialQuestionRedacted, answers);
  const strictGuidance = buildStrictGuidance(effectiveClassification, answerMap, consultationContext);
  const relatedContent = getAiRelatedContent(effectiveClassification, answers);
  const confirmedFacts = answers
    .filter((answer) => answer.value !== null && answer.value !== "" && answer.value !== "unknown")
    .map((answer) => formatAnswer(answer, questions))
    .slice(0, 8);
  const missingInformation = answers
    .filter((answer) => answer.value === "unknown" || answer.value === "" || answer.value === null)
    .map((answer) => `${answerFieldLabels[answer.field] ?? findQuestion(answer.field, questions)?.question ?? answer.field} 항목을 확인해주세요.`)
    .slice(0, 6);
  const availableEvidence = answers.filter(isPositiveEvidence).map((answer) => formatAnswer(answer, questions)).slice(0, 6);

  if (effectiveClassification.category === "unclear") {
    missingInformation.push("분쟁이 시작된 경위와 상대방의 입장을 확인해주세요.");
  }
  if (effectiveClassification.category === "administrative") {
    missingInformation.push("처분일, 통지 수령일, 효력 발생일이 각각 언제인지 확인해주세요.");
  }
  if (effectiveClassification.category === "inheritance") {
    missingInformation.push("사망일과 상속 사실을 알게 된 날짜가 언제인지 확인해주세요.");
  }
  if (effectiveClassification.category === "civil" && effectiveClassification.subcategory !== "damages" && answerMap.get("writtenAgreementExists") !== "yes") {
    missingInformation.push("차용증·계약서가 없다면 이체내역이나 대화 기록이 있는지 확인해주세요.");
  }
  missingInformation.push(...strictGuidance.missingInformation);
  if (safetyGuidance.flags.includes("evidence-preservation")) {
    missingInformation.push("증거는 삭제하거나 숨기지 말고 원본 상태로 보존해야 합니다.");
  }
  if (safetyGuidance.flags.includes("truthful-statement")) {
    missingInformation.push("조사 진술은 사실관계에 맞게 준비하고, 진술 전 법률상담을 받을 수 있습니다.");
  }
  if (safetyGuidance.flags.includes("no-outcome-guarantee")) {
    missingInformation.push("무죄 여부는 증거와 수사기록 전체를 검토한 뒤 판단해야 합니다.");
  }

  const recommendedDocuments = strictGuidance.recommendedDocuments;
  const situationSummary = `${effectiveClassification.categoryLabel} ${
    effectiveClassification.subcategoryLabel ?? ""
  } 관련 상담 전 확인 내용입니다. 현재 정보만으로는 일반 안내만 가능하며, 자료 검토에 따라 방향이 달라질 수 있습니다.`;
  const relatedContentIds = [
    ...relatedContent.practices,
    ...relatedContent.cases,
    ...relatedContent.guides,
    ...relatedContent.faqs,
  ].map((item) => item.id);
  const sectionComments = buildSectionComments(effectiveClassification.category, confirmedFacts, missingInformation);

  return {
    sessionId,
    classification: effectiveClassification,
    urgency,
    situationSummary,
    confirmedFacts: confirmedFacts.length > 0 ? confirmedFacts : ["아직 구체적으로 확인된 답변이 많지 않습니다."],
    missingInformation: Array.from(new Set(missingInformation)).slice(0, 8),
    recommendedDocuments,
    sectionComments,
    generalProcess: aiProcessGuides[category],
    relatedContent,
    consultationSummary: {
      category: effectiveClassification.category,
      categoryLabel: effectiveClassification.categoryLabel,
      subcategory: effectiveClassification.subcategory,
      subcategoryLabel: effectiveClassification.subcategory ? aiSubcategoryLabels[effectiveClassification.subcategory] : undefined,
      userQuestion: initialQuestionRedacted,
      situationSummary,
      confirmedFacts: confirmedFacts.slice(0, 8),
      availableEvidence,
      missingInformation: Array.from(new Set(missingInformation)).slice(0, 8),
      keyIssues: [effectiveClassification.subcategoryLabel ?? aiCategoryLabels[effectiveClassification.category]].filter(Boolean),
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
