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

function hasAnsweredQuestion(
  answers: AiGuideAnswer[],
  questions: AiGuideQuestion[],
  field: string,
  questionPattern: RegExp,
) {
  return answers.some((answer) => {
    if (answer.value === null || answer.value === "" || answer.value === "unknown") return false;
    const question = findQuestion(answer.field, questions)?.question ?? "";
    return answer.field === field || questionPattern.test(question);
  });
}

function dedupeMissingInformation(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const normalized = item.replace(/[\s·,.'"“”‘’()]/g, "").replace(/(?:언제인지|날짜가|날짜를|처음|확인해주세요|확인해주십시오)/g, "");
    const semanticKey = /사망일/.test(item) && /상속\s*사실/.test(item) && /알게/.test(item)
      ? "inheritance-awareness-date"
      : normalized;
    if (seen.has(semanticKey)) return false;
    seen.add(semanticKey);
    return true;
  });
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
const constructionPaymentPattern = /공사대금|공사비|도급대금|기성금|미지급\s*공사|공사\s*잔금|추가\s*공사대금/;
const leaseDepositReturnPattern = /임대차.{0,16}보증금|보증금.{0,16}(?:반환|돌려|못\s*받|미반환)|전세금.{0,12}(?:반환|돌려|못\s*받)/;
const investmentReturnPattern = /투자금|투자원금|투자\s*계약|수익금.{0,8}(?:정산|배분)|원금\s*반환\s*약정/;

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

  if (classification.category === "civil" && constructionPaymentPattern.test(initialQuestion)) return {
    missingInformation: [
      "계약한 총 공사대금과 현재 받지 못한 금액을 확인해주세요.",
      "당초 공사 범위와 추가·변경 공사 및 그 대금 합의가 있었는지 확인해주세요.",
      "공사가 완성·인도되었고 상대방이 목적물을 사용하고 있는지 확인해주세요.",
      "상대방이 주장하는 하자의 원인과 시공 범위의 관련성, 보수 가능 여부를 확인해주세요.",
      "하자 통지와 보수 요청을 받은 시점 및 이에 답변하거나 보수를 제안한 내용이 있는지 확인해주세요.",
    ],
    recommendedDocuments: [
      "공사도급계약서·견적서·공사내역서",
      "설계도면·시방서·추가 및 변경 공사 합의 내용",
      "세금계산서·기성내역서·입금내역·미지급액 계산표",
      "공사 진행·완료 사진과 검수·인도 자료",
      "하자 통지·보수 요청 및 답변 대화",
      "누수 등 하자 원인에 관한 점검·감정 자료가 있다면 그 자료",
    ],
  };

  if (classification.category === "civil" && leaseDepositReturnPattern.test(initialQuestion)) return {
    missingInformation: [
      "임차목적물을 비우고 열쇠를 반환했거나 즉시 반환할 준비가 되어 있는지 확인해주세요.",
      "미납 차임·관리비·공과금이나 원상회복비로 공제될 금액이 있는지 확인해주세요.",
      "보증금 중 일부를 돌려받았다면 반환받은 날짜와 금액을 확인해주세요.",
      "임대차 중 소유자 변경, 근저당·압류 또는 경매 진행이 있는지 확인해주세요.",
      "전입신고와 확정일자 유무 및 현재 주민등록을 유지하고 있는지 확인해주세요.",
    ],
    recommendedDocuments: [
      "임대차계약서와 갱신·변경 계약서",
      "보증금 지급 계좌내역·영수증",
      "계약 종료 및 보증금 반환을 요청한 문자·카카오톡·내용증명",
      "목적물 인도·퇴거 및 열쇠 반환 관련 자료",
      "등기사항증명서와 전입신고·확정일자 확인 자료",
      "차임·관리비·공과금 정산 내역이 있다면 그 내역",
    ],
  };

  if (classification.category === "civil" && (classification.subcategory === "investment-return" || investmentReturnPattern.test(initialQuestion))) return {
    missingInformation: [
      "투자금이 실제 사업·자산에 사용되었는지와 현재 운용·처분 상태를 확인해주세요.",
      "원금 보장·반환 시기·중도 해지·손실 부담에 관한 약정 내용을 확인해주세요.",
      "수익과 손실의 산정 방식 및 지금까지 받은 수익금·정산금이 있는지 확인해주세요.",
      "상대방에게 투자금 반환 또는 회계자료 공개를 요구한 내용과 답변을 확인해주세요.",
      "투자 권유 당시 설명과 실제 자금 사용처가 다른 정황이 있는지 확인해주세요.",
    ],
    recommendedDocuments: [
      "투자계약서·약정서·사업제안서",
      "투자금 송금내역과 수익금·정산금 입금내역",
      "원금 보장·수익률·반환 시기 관련 문자·카카오톡·이메일",
      "사업 진행·자금 사용·손익을 확인할 보고서와 회계자료",
      "투자금 반환과 정산자료 공개를 요청한 내용",
      "상대방이 제시한 담보·보증 또는 사업 관련 자료",
    ],
  };

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
    const criminalAppeal = classification.subcategory === "criminal-appeal"
      || /형사\s*항소|항소심|항소이유서|1심\s*판결|징역형?.{0,8}선고|형량\s*감경|양형부당/.test(initialQuestion);
    if (criminalAppeal) return {
      missingInformation: [
        "1심 판결 이유 중 사실인정·법리·형량에서 다투려는 부분을 확인해주세요.",
        "항소장을 제출했는지와 소송기록접수통지서를 받은 날짜를 확인해주세요.",
        "1심에서 제출하지 못한 새로운 증거나 추가로 설명할 사정이 있는지 확인해주세요.",
        "피해자와의 합의·피해회복 또는 공탁이 진행된 사실이 있는지 확인해주세요.",
        "구속 상태인지와 보석·구속취소를 함께 검토할 사정이 있는지 확인해주세요.",
      ],
      recommendedDocuments: [
        "1심 판결문·공소장·증거목록",
        "항소장·소송기록접수통지서·항소이유서 초안",
        "1심에서 제출한 의견서·변론요지서·증거자료",
        "1심 판단을 다툴 새로운 증거와 사실관계 정리",
        "합의서·처벌불원서·피해회복·공탁 자료가 있다면 그 자료",
        "반성·치료·직업·부양 등 양형에 참고될 자료",
      ],
    };
    const criminalTrial = classification.subcategory === "criminal-trial"
      || /1심\s*재판|1심재판|첫\s*재판|공판.{0,8}(?:앞두|진행)|형사\s*재판.{0,8}(?:앞두|중|진행)|공판기일|공소장.{0,8}(?:받|송달)/.test(initialQuestion);
    if (criminalTrial) return {
      missingInformation: [
        "공소장에 기재된 죄명과 공소사실 중 인정하거나 다투는 부분을 확인해주세요.",
        "첫 공판기일 또는 다음 공판기일과 현재 재판 진행 단계를 확인해주세요.",
        "검사가 제출한 증거목록과 수사기록을 열람·등사했는지 확인해주세요.",
        "공소사실을 반박하거나 설명할 증거·증인·사실관계가 있는지 확인해주세요.",
        "피해자와의 합의·피해회복·공탁 또는 양형에 반영할 사정이 있는지 확인해주세요.",
      ],
      recommendedDocuments: [
        "공소장·공판기일통지서·사건번호",
        "검사 증거목록과 열람·등사한 수사기록",
        "경찰·검찰 진술조서와 이미 제출한 의견서",
        "혐의를 반박하거나 경위를 설명할 대화·사진·거래·위치 자료",
        "합의서·처벌불원서·피해회복·공탁 자료가 있다면 그 자료",
        "반성·치료·직업·부양 등 양형에 참고될 자료",
      ],
    };
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
    if (/양육비/.test(initialQuestion) && /미지급|미납|지급되지|지급하지|받지\s*못|강제|이행명령|직접지급/.test(initialQuestion)) return {
      missingInformation: ["판결문·조정조서에 정해진 월 양육비와 지급일을 확인해주세요.", "양육비가 지급되지 않은 시작일과 미납 개월 수를 확인해주세요.", "현재까지 받지 못한 양육비 총액과 일부 지급된 금액이 있는지 확인해주세요.", "상대방의 현재 직장·소득·예금·재산을 알고 있는지 확인해주세요.", "지급을 요청한 내용과 상대방의 답변을 확인해주세요.", "이행명령·직접지급명령·압류 등 이미 진행한 절차가 있는지 확인해주세요."],
      recommendedDocuments: ["양육비가 정해진 판결문·조정조서·양육비부담조서", "양육비 입금이 중단된 사실을 보여주는 계좌 내역", "월별 지급액·미지급액 계산표", "양육비 지급을 요청한 문자·카카오톡·내용증명", "상대방의 직장·소득·예금·부동산 등 확인 자료", "기존 이행명령·직접지급명령·압류 관련 서류"],
    };
    if (/면접교섭|아이를\s*(?:보고|만나)|자녀를\s*(?:보고|만나)|아이를\s*보여주|자녀를\s*보여주/.test(initialQuestion)) return {
      missingInformation: ["기존 판결문·조정조서에 면접교섭 방법과 일정이 정해져 있는지 확인해주세요.", "상대방이 면접교섭을 거부하거나 방해한 날짜와 이유를 확인해주세요.", "마지막으로 자녀를 만난 시기와 그동안 연락한 내용을 확인해주세요.", "원하는 면접교섭 횟수·시간·장소·인도 방법을 확인해주세요.", "상대방이 면접교섭을 제한해야 한다고 주장하는 사유가 있는지 확인해주세요."],
      recommendedDocuments: ["기존 양육권·친권 판결문 또는 조정조서", "면접교섭을 요청하고 거절당한 문자·카카오톡", "면접교섭 요청 날짜와 상대방 답변 정리", "기존 면접교섭 일정과 실제 실시 내역", "자녀와 연락하거나 교류한 자료", "상대방이 주장하는 제한 사유 관련 자료"],
    };
    if (/사실혼|혼인신고\s*(?:없이|하지)|동거하며\s*부부|사실상\s*부부/.test(initialQuestion)) {
      const documents = ["주민등록초본·등본 등 공동 주소 자료", "임대차계약서·공과금·공동생활비 내역", "결혼식·가족행사 사진과 가족·지인의 확인 자료", "부부로 생활했음을 보여주는 문자·사진·우편물", "부동산·예금·보험·주식 등 분할 대상 재산 자료", "재산 취득과 유지에 기여한 소득·가사·돌봄 자료"];
      if (answerMap.get("currentStatus") === "lawsuit") documents.push("이미 받은 소장·답변서·조정서류");
      return {
        missingInformation: ["동거를 시작한 시기와 사실혼 관계가 종료된 날짜를 확인해주세요.", "서로 부부로 생활하려는 의사가 있었음을 보여주는 사정을 확인해주세요.", "같은 주소에서 공동생활을 했는지 확인해주세요.", "가족·지인과 사회생활에서 부부로 인정받았는지 확인해주세요.", "사실혼 중 형성한 재산과 채무의 명의·가액을 확인해주세요.", "각 재산의 취득·유지와 가사·돌봄에 기여한 내용을 확인해주세요.", "재산분할에 관해 이미 합의한 내용이 있는지 확인해주세요."],
        recommendedDocuments: documents,
      };
    }
    if (answerMap.get("custodyConcern") === "yes" || classification.subcategory === "custody") return {
      missingInformation: ["자녀의 나이와 현재 주된 양육자가 누구인지 확인해주세요.", "각 부모의 양육 환경과 실제 돌봄 시간을 확인해주세요.", "희망하는 친권·양육권·면접교섭 내용을 확인해주세요.", "자녀의 의사와 학교·생활환경을 유지할 수 있는지 확인해주세요.", "현재 양육비 지급 여부와 자녀의 월 지출을 확인해주세요."],
      recommendedDocuments: ["가족관계증명서·자녀 기본증명서", "현재까지의 양육 분담과 돌봄 일정 정리", "자녀의 학교·어린이집·의료 관련 자료", "주거·근무시간 등 양육 환경 자료", "자녀 교육·의료·생활비 내역", "양육비 지급 내역", "면접교섭과 양육 협의 관련 대화"],
    };
    if (answerMap.get("affairIssue") === "yes" || classification.subcategory === "affair" || /상간|외도|불륜|부정행위|바람/.test(initialQuestion)) return {
      missingInformation: ["부정행위가 시작된 시기와 알게 된 날짜를 확인해주세요.", "상간 상대방이 혼인 사실을 알고 있었는지 확인해주세요.", "부정행위 전 혼인관계가 이미 파탄된 상태였는지 확인해주세요.", "상간 상대방의 이름·연락처 등 특정 정보가 있는지 확인해주세요.", "부정행위를 안 날부터 현재까지의 기간을 확인해주세요."],
      recommendedDocuments: ["부정행위 관련 대화·사진·숙박·결제 자료", "상간 상대방이 혼인 사실을 알았음을 보여주는 자료", "혼인관계증명서·가족관계증명서", "부정행위를 알게 된 경위와 날짜 정리", "상간 상대방 확인 자료", "상간자와 주고받은 연락·내용증명·소송서류"],
    };
    if (/폭언|욕설|모욕|가정폭력|폭행|상해|위협|물건을\s*집어던/.test(initialQuestion)) return {
      missingInformation: ["폭언·위협·폭행이 언제부터 얼마나 반복되었는지 확인해주세요.", "폭행의 구체적인 방법과 다친 부위를 확인해주세요.", "경찰 신고나 병원 진료를 받은 사실이 있는지 확인해주세요.", "사건을 직접 보거나 들은 사람이 있는지 확인해주세요.", "자녀 앞에서 폭언·폭행이 있었는지 확인해주세요.", "현재 추가 폭력의 위험이 있는지 확인해주세요."],
      recommendedDocuments: ["폭언·위협 당시의 문자·녹음·영상", "상처와 파손된 물건·현장 사진", "진단서·진료기록·의무기록", "112 신고내역·경찰 사건 자료", "가정폭력 상담소 등 상담 기록", "목격자와 사건별 날짜·경위 정리"],
    };
    if (/생활비\s*미지급|생활비를?\s*(?:주지|안\s*주)|부양료|경제적\s*(?:방임|통제)/.test(initialQuestion)) return {
      missingInformation: ["생활비를 지급하지 않은 기간과 그 전의 지급 방식을 확인해주세요.", "생활비를 요청했을 때 상대방이 어떻게 답했는지 확인해주세요.", "상대방의 소득과 가계 지출 분담 방식을 확인해주세요."],
      recommendedDocuments: ["생활비 지급·미지급을 확인할 계좌 내역", "가계 지출과 자녀 생활비 내역", "상대방에게 생활비를 요청한 대화", "상대방 소득 관련 자료"],
    };
    const divorceDocuments = ["혼인관계증명서·가족관계증명서", "부동산·예금·보험·주식 자료", "대출·채무 자료", "소득·연금·퇴직금 자료", "재산 형성 기여 자료"];
    if (answerMap.get("currentStatus") === "lawsuit") divorceDocuments.push("이미 받은 소장·답변서·조정서류");
    return {
      missingInformation: ["이혼 의사와 현재 협의·별거·소송 상태를 확인해주세요.", "혼인 중 형성한 재산과 채무의 명의·가액을 확인해주세요.", "각 재산의 취득 경위와 기여 내용을 확인해주세요."],
      recommendedDocuments: divorceDocuments,
    };
  }

  if (classification.category === "inheritance") {
    const caseType = String(answerMap.get("caseType") ?? classification.subcategory ?? "general");
    if (caseType === "inheritance-debt-choice") return {
      missingInformation: [
        "사망일과 상속 사실을 처음 알게 된 날짜를 확인해주세요.",
        "예금·부동산·보험금 등 상속재산과 대출·세금·보증채무 등 빚의 종류와 금액을 확인해주세요.",
        "상속재산이나 채무 중 아직 금액을 알 수 없거나 추가로 발견될 가능성이 있는 항목을 확인해주세요.",
        "사망 후 예금 인출·채무 변제·재산 처분 등 상속재산에 손을 댄 사실이 있는지 확인해주세요.",
        "다른 상속인과 후순위 상속인이 누구인지 및 함께 신청할 의사가 있는지 확인해주세요.",
      ],
      recommendedDocuments: [
        "기본증명서·가족관계증명서·사망진단서",
        "안심상속 원스톱서비스 등 상속재산 조회 결과",
        "예금·보험·부동산·자동차 등 상속재산 자료",
        "대출·카드·세금·보증채무·독촉·소송 자료",
        "다른 상속인과 후순위 상속인 확인 자료",
        "사망 후 예금 인출·재산 처분·채무 변제 내역이 있다면 그 자료",
      ],
    };
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
  const answerContext = answers.map((answer) => {
    const value = Array.isArray(answer.value) ? answer.value.join(" ") : String(answer.value ?? "");
    const selectedLabel = findQuestion(answer.field, questions)?.options?.find((option) => option.value === answer.value)?.label;
    return `${findQuestion(answer.field, questions)?.question ?? answer.field} ${selectedLabel ?? value}`;
  });
  const positiveQuestionContext = answers
    .filter((answer) => answer.value === "yes")
    .map((answer) => findQuestion(answer.field, questions)?.question ?? "");
  const consultationContext = [initialQuestionRedacted, ...answerContext, ...positiveQuestionContext].join(" ");
  const userProvidedAnswerContext = answers
    .flatMap((answer) => Array.isArray(answer.value) ? answer.value : [answer.value])
    .filter((value) => value !== null && value !== undefined && !["yes", "no", "unknown"].includes(String(value)))
    .map((value) => String(value));
  // AI가 만든 질문 문구가 다시 사건 분류의 근거가 되면, 일반 민사 사건도
  // 질문에 포함된 단어만으로 대여금 사건으로 확정되는 순환 오류가 생긴다.
  const userAssertedContext = [initialQuestionRedacted, ...userProvidedAnswerContext].join(" ");
  const contextualClassification = classifyLegalQuestion(consultationContext);
  const contextualMatch = contextualClassification.category === classification.category && contextualClassification.subcategory !== "general";
  let effectiveClassification: AiClassificationResult = contextualMatch ? contextualClassification : classification;
  const debtIntent = effectiveClassification.category === "civil" && /대여금|차용증|돈을\s*(?:빌려|빌린)|빌려준|빌려줬|갚(?:아|지|으)|상환|변제/.test(userAssertedContext);
  const investmentReturnIntent = effectiveClassification.category === "civil" && investmentReturnPattern.test(userAssertedContext);
  if (investmentReturnIntent) {
    effectiveClassification = {
      ...effectiveClassification,
      subcategory: "investment-return",
      subcategoryLabel: aiSubcategoryLabels["investment-return"],
      matchedTags: Array.from(new Set([...effectiveClassification.matchedTags.filter((tag) => !["debt", "loan"].includes(tag)), "investment-return", "investment", "settlement"])),
      reasonSummary: "투자원금 반환 또는 투자 수익·손실 정산을 원하는 상담으로 확인되었습니다.",
    };
  }
  if (debtIntent && !investmentReturnIntent) {
    effectiveClassification = {
      ...effectiveClassification,
      subcategory: "debt",
      subcategoryLabel: aiSubcategoryLabels.debt,
      matchedTags: Array.from(new Set([...effectiveClassification.matchedTags, "debt", "loan", "collection"])),
      reasonSummary: "후속 답변에서 빌려준 돈의 반환 문제와 상환 요청 내용이 확인되었습니다.",
    };
  } else if (effectiveClassification.category === "civil" && effectiveClassification.subcategory === "debt") {
    effectiveClassification = {
      ...effectiveClassification,
      subcategory: "general",
      subcategoryLabel: aiSubcategoryLabels.general,
      matchedTags: effectiveClassification.matchedTags.filter((tag) => !["debt", "loan", "collection"].includes(tag)),
      reasonSummary: "강제집행·압류 등 절차 표현만으로 채권의 원인을 대여금으로 단정하지 않았습니다.",
    };
  }
  const criminalAppealIntent = effectiveClassification.category === "criminal"
    && /형사\s*항소|항소심|항소이유서|1심\s*판결|징역형?.{0,8}선고|형량\s*감경|양형부당/.test(userAssertedContext);
  if (criminalAppealIntent) {
    effectiveClassification = {
      ...effectiveClassification,
      subcategory: "criminal-appeal",
      subcategoryLabel: aiSubcategoryLabels["criminal-appeal"],
      matchedTags: Array.from(new Set([...effectiveClassification.matchedTags.filter((tag) => tag !== "police-investigation"), "criminal-appeal", "trial", "sentencing"])),
      reasonSummary: "형사 1심 판결 이후 항소와 형량 감경을 준비하는 상담으로 확인되었습니다.",
    };
  }
  const criminalTrialIntent = effectiveClassification.category === "criminal"
    && !criminalAppealIntent
    && /1심\s*재판|1심재판|첫\s*재판|공판.{0,8}(?:앞두|진행)|형사\s*재판.{0,8}(?:앞두|중|진행)|공판기일|공소장.{0,8}(?:받|송달)/.test(userAssertedContext);
  if (criminalTrialIntent) {
    effectiveClassification = {
      ...effectiveClassification,
      subcategory: "criminal-trial",
      subcategoryLabel: aiSubcategoryLabels["criminal-trial"],
      matchedTags: Array.from(new Set([...effectiveClassification.matchedTags.filter((tag) => tag !== "police-investigation"), "criminal-trial", "trial", "defense"])),
      reasonSummary: "형사 1심 공판을 앞두거나 현재 진행 중인 상담으로 확인되었습니다.",
    };
  }
  const inheritanceDebtChoiceIntent = effectiveClassification.category === "inheritance"
    && /상속\s*포기|상속포기/.test(userAssertedContext)
    && /한정\s*승인|한정승인/.test(userAssertedContext);
  if (inheritanceDebtChoiceIntent) {
    effectiveClassification = {
      ...effectiveClassification,
      subcategory: "inheritance-debt-choice",
      subcategoryLabel: aiSubcategoryLabels["inheritance-debt-choice"],
      matchedTags: Array.from(new Set([...effectiveClassification.matchedTags, "inheritance-debt", "renunciation", "limited-acceptance"])),
      reasonSummary: "상속채무 문제로 상속포기와 한정승인을 비교하려는 상담으로 확인되었습니다.",
    };
  }
  const domesticViolenceDivorceIntent = /이혼|혼인관계\s*해소|재판상\s*이혼/.test(consultationContext)
    && /배우자|남편|아내|부부/.test(consultationContext)
    && /폭언|욕설|모욕|가정폭력|폭행|상해|위협|물건을\s*집어던/.test(consultationContext);
  if (domesticViolenceDivorceIntent) {
    effectiveClassification = {
      ...effectiveClassification,
      category: "divorce",
      categoryLabel: aiCategoryLabels.divorce,
      subcategory: "general",
      subcategoryLabel: aiSubcategoryLabels.general,
      matchedTags: Array.from(new Set([...effectiveClassification.matchedTags, "divorce", "domestic-violence"])),
      reasonSummary: "배우자의 폭언·폭행을 이유로 이혼을 원하는 상담으로 확인되었습니다.",
    };
  }
  const custodyIntent = effectiveClassification.category === "divorce"
    && /양육권|친권|양육비|양육s*계획|자녀s*양육|주된s*양육자/.test(consultationContext);
  const affairIntent = effectiveClassification.category === "divorce"
    && (answerMap.get("affairIssue") === "yes" || /상간|외도|불륜|부정행위|바람/.test(consultationContext));
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
  } else if (effectiveClassification.category === "divorce" && effectiveClassification.subcategory === "affair") {
    effectiveClassification = {
      ...effectiveClassification,
      subcategory: "general",
      subcategoryLabel: aiSubcategoryLabels.general,
      matchedTags: effectiveClassification.matchedTags.filter((tag) => !["affair", "damages"].includes(tag)),
      reasonSummary: "외도·상간에 관한 명시적 진술이 없어 일반 이혼 문제로 분류했습니다.",
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
  const writtenLoanDocumentKnown = debtIntent && (
    answerMap.get("writtenAgreementExists") === "yes"
    || /(?:차용증|금전소비대차계약서|대여금\s*계약서).{0,16}(?:있|보유|작성|받아|가지고)/.test(consultationContext)
    || /(?:있|보유|작성|받아|가지고).{0,16}(?:차용증|금전소비대차계약서|대여금\s*계약서)/.test(consultationContext)
  );

  if (effectiveClassification.category === "unclear") {
    missingInformation.push("분쟁이 시작된 경위와 상대방의 입장을 확인해주세요.");
  }
  if (effectiveClassification.category === "administrative") {
    missingInformation.push("처분일, 통지 수령일, 효력 발생일이 각각 언제인지 확인해주세요.");
  }
  const deceasedDateKnown = hasAnsweredQuestion(answers, questions, "deceasedDate", /사망일|돌아가신\s*날짜/);
  const inheritanceAwarenessDateKnown = hasAnsweredQuestion(answers, questions, "inheritanceAwarenessDate", /상속\s*사실.{0,12}알게\s*된\s*날짜/);
  if (effectiveClassification.category === "inheritance" && !inheritanceAwarenessDateKnown) {
    missingInformation.push(deceasedDateKnown
      ? "상속 사실을 처음 알게 된 날이 사망일과 다르다면 그 날짜를 확인해주세요."
      : "사망일과 상속 사실을 처음 알게 된 날짜를 확인해주세요.");
  }
  if (effectiveClassification.category === "civil" && effectiveClassification.subcategory === "debt" && !writtenLoanDocumentKnown) {
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

  const debtMatter = effectiveClassification.category === "civil" && effectiveClassification.subcategory === "debt";
  const noWrittenLoanDocument = debtMatter && (
    answerMap.get("writtenAgreementExists") === "no"
    || /차용증(?:은|이|을)?\s*(?:없|작성하지|쓰지)|차용증\s*없음/.test(consultationContext)
  );
  const transferOrMessageEvidenceKnown = debtMatter
    && /계좌이체|입금\s*내역|카카오톡|카톡|문자|대화\s*기록/.test(consultationContext);
  const loanDateKnown = debtMatter
    && /(?:빌려준|대여|송금).{0,12}(?:날짜|일자)?\s*[:：]?\s*\d{4}[-./년]\s*\d{1,2}|\d{4}-\d{2}-\d{2}/.test(consultationContext);
  const loanAmountKnown = debtMatter && /\d[\d,]*(?:\.\d+)?\s*(?:억|만)?\s*원/.test(consultationContext);
  const noCurrentProcedure = debtMatter
    && /현재\s*(?:법적\s*)?(?:절차|소송|지급명령).{0,16}(?:없|아니오)|법적\s*절차.{0,16}(?:없|아니오)/.test(consultationContext);
  const contextFilteredMissingInformation = dedupeMissingInformation(missingInformation.map((item) => {
    if (effectiveClassification.category === "inheritance" && deceasedDateKnown && /사망일/.test(item) && /상속\s*사실/.test(item) && /알게/.test(item)) {
      return "상속 사실을 처음 알게 된 날이 사망일과 다르다면 그 날짜를 확인해주세요.";
    }
    return item;
  })).filter((item) => {
    if (effectiveClassification.category === "inheritance" && inheritanceAwarenessDateKnown && /상속\s*사실/.test(item) && /알게/.test(item)) return false;
    if (!debtMatter) return true;
    if (writtenLoanDocumentKnown && /차용증|대여금\s*계약서|금전소비대차계약서/.test(item)) return false;
    if (transferOrMessageEvidenceKnown && /차용증.{0,12}없다면.{0,30}(?:이체|대화)\s*기록/.test(item)) return false;
    if (loanDateKnown && loanAmountKnown && /빌려준\s*날짜와\s*금액/.test(item)) return false;
    if (loanDateKnown && /빌려준\s*날짜/.test(item) && !/금액/.test(item)) return false;
    if (loanAmountKnown && /빌려준\s*금액/.test(item) && !/날짜/.test(item)) return false;
    return true;
  });
  const recommendedDocuments = strictGuidance.recommendedDocuments.filter((item) => {
    if (noWrittenLoanDocument && /차용증|각서|공증서/.test(item)) return false;
    if (noCurrentProcedure && /지급명령|소송서류/.test(item)) return false;
    return true;
  });
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
  const violenceDivorce = effectiveClassification.category === "divorce"
    && /폭언|욕설|모욕|가정폭력|폭행|상해|위협|물건을\s*집어던/.test(consultationContext);
  const visitationMatter = effectiveClassification.category === "divorce"
    && /면접교섭|아이를\s*(?:보고|만나)|자녀를\s*(?:보고|만나)|아이를\s*보여주|자녀를\s*보여주/.test(consultationContext);
  const unpaidChildSupportMatter = effectiveClassification.category === "divorce"
    && /양육비/.test(consultationContext)
    && /미지급|미납|지급되지|지급하지|받지\s*못|강제|이행명령|직접지급/.test(consultationContext);
  const investmentReturnMatter = effectiveClassification.category === "civil"
    && effectiveClassification.subcategory === "investment-return";
  const criminalAppealMatter = effectiveClassification.category === "criminal"
    && effectiveClassification.subcategory === "criminal-appeal";
  const criminalTrialMatter = effectiveClassification.category === "criminal"
    && effectiveClassification.subcategory === "criminal-trial";
  const inheritanceDebtChoiceMatter = effectiveClassification.category === "inheritance"
    && effectiveClassification.subcategory === "inheritance-debt-choice";

  return {
    sessionId,
    classification: effectiveClassification,
    urgency,
    situationSummary,
    confirmedFacts: confirmedFacts.length > 0 ? confirmedFacts : ["아직 구체적으로 확인된 답변이 많지 않습니다."],
    missingInformation: Array.from(new Set(contextFilteredMissingInformation)).slice(0, 8),
    recommendedDocuments,
    consultationOpinion: inheritanceDebtChoiceMatter
      ? "상속포기는 재산과 채무를 모두 승계하지 않는 방법이고, 한정승인은 상속받은 재산 범위에서 채무를 정리하는 방법이므로 남길 재산의 유무와 채무 확정 가능성이 선택에 중요합니다. 후순위 상속인에게 영향이 이어지는지와 사망 후 재산 처분 여부도 함께 확인해야 하므로, 재산·채무 조회자료를 토대로 변호사와 신청 방향을 상담해보세요."
      : criminalTrialMatter
      ? "형사 1심 재판에서는 공소사실에 대한 인정·부인 입장을 먼저 정하고, 검사가 제출한 증거와 수사기록을 검토해 방어 방향을 구체화해야 합니다. 혐의를 다툰다면 반박 증거와 증인을, 인정한다면 피해회복과 양형자료를 준비해야 하므로 공소장과 기록을 토대로 변호사와 재판 대응을 상담해보세요."
      : criminalAppealMatter
      ? "형사 1심 판결이 선고된 경우 항소심에서는 1심의 사실인정·법리 판단 또는 양형의 부당성을 구체적으로 다투어야 합니다. 형량 감경을 원한다면 피해회복·합의·공탁과 새로운 양형사정을 정리하고, 판결문과 소송기록을 토대로 항소이유를 신속히 검토하도록 변호사와 상담해보세요."
      : investmentReturnMatter
      ? "투자금 반환은 단순 미지급금과 달리 원금 반환 약정, 투자 종료·해지 조건, 실제 손익과 정산 의무를 함께 검토해야 합니다. 원금 반환 또는 정산자료 공개를 청구할 가능성이 있으며, 투자 권유 내용과 자금 사용처가 달랐다면 기망 여부도 살펴볼 수 있으므로 관련 자료를 토대로 변호사와 상담해보세요."
      : unpaidChildSupportMatter
      ? "판결·조정 등으로 정해진 양육비가 지급되다가 중단되었다면 미지급액에 대해 이행명령, 직접지급명령 또는 강제집행을 검토할 수 있습니다. 미납 기간과 상대방의 직장·재산을 확인해 변호사와 구체적인 회수 방법을 상담해보세요."
      : visitationMatter
      ? "양육권 판결이 이미 있더라도 비양육 부모는 자녀와의 면접교섭을 청구할 수 있습니다. 기존 판결의 면접교섭 내용과 상대방의 거부 경위를 확인해 가정법원 신청 또는 이행확보 방법을 변호사와 상담해보세요."
      : violenceDivorce
      ? "반복적인 폭언·폭행으로 혼인관계가 회복하기 어려울 정도로 파탄되었다면 재판상 이혼과 위자료 청구를 검토할 수 있습니다. 폭력의 정도와 반복성을 보여주는 자료를 토대로 변호사 상담을 받아보세요."
      : undefined,
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
      missingInformation: Array.from(new Set(contextFilteredMissingInformation)).slice(0, 8),
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
