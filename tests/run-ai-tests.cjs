const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");

const projectRoot = path.resolve(__dirname, "..");
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveAlias(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    return originalResolveFilename.call(
      this,
      path.join(projectRoot, "src", request.slice(2)),
      parent,
      isMain,
      options,
    );
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
    },
  });
  module._compile(output.outputText, filename);
};

const { classifyLegalQuestion } = require("../src/lib/ai/classifier.ts");
const { redactSensitiveData } = require("../src/lib/ai/redaction.ts");
const { getQuestionsForCategory, sanitizeQuestionFlow, upsertAnswer } = require("../src/lib/ai/question-engine.ts");
const { evaluateUrgency } = require("../src/lib/ai/urgency.ts");
const { buildAiGuideResult } = require("../src/lib/ai/answer-composer.ts");
const { getAiRelatedContent, tagsFromAiContext } = require("../src/lib/ai/content-retrieval.ts");
const { checkRateLimit, clearRateLimitBuckets } = require("../src/lib/ai/rate-limit.ts");
const { evaluateSafetyGuidance } = require("../src/lib/ai/safety.ts");
const { isAiSessionOwner } = require("../src/lib/ai/session-auth.ts");
const { OpenAiLegalGuideProvider } = require("../src/lib/ai/openai-provider.ts");
const {
  canUseGenerativeAi,
  clearGenerativeUsage,
  recordGenerativeUsage,
} = require("../src/lib/ai/provider-usage.ts");
const {
  createAiSessionId,
  createExpiry,
  createTransferToken,
  getAiGuideSessionByTransferToken,
  getLocalAiGuideSession,
  saveAiGuideSession,
  updateAiGuideSession,
} = require("../src/lib/ai/session-store.ts");
const { isPublishedCase } = require("../src/lib/case-selectors.ts");
const { saveConsultationSubmission } = require("../src/lib/consultation-submissions.ts");

function answer(questionId, field, value) {
  return {
    questionId,
    field,
    value,
    answeredAt: new Date().toISOString(),
  };
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function makeSession(overrides = {}) {
  const classification = overrides.classification ?? classifyLegalQuestion("대여금 차용증 계좌이체 상담입니다.");
  const now = new Date().toISOString();
  return {
    id: overrides.id ?? createAiSessionId(),
    publicToken: overrides.publicToken ?? `public-${Math.random().toString(36).slice(2)}`,
    status: overrides.status ?? "started",
    initialQuestionRedacted: overrides.initialQuestionRedacted ?? "대여금 차용증 계좌이체 상담입니다.",
    classification,
    answers: overrides.answers ?? [],
    result: overrides.result,
    transferToken: overrides.transferToken,
    consentToTransfer: overrides.consentToTransfer ?? false,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    expiresAt: overrides.expiresAt ?? addDays(30),
  };
}

test("unit: classifies legal categories and expanded keywords", () => {
  assert.equal(classifyLegalQuestion("돈을 빌려줬는데 안 갚아요. 차용증과 계좌이체가 있습니다.").category, "civil");
  assert.equal(classifyLegalQuestion("지급명령 이후 압류와 강제집행을 하고 싶습니다.").subcategory, "debt");
  assert.equal(classifyLegalQuestion("투자금 반환과 수익금 정산을 청구하고 싶습니다.").subcategory, "investment-return");
  assert.equal(classifyLegalQuestion("투자사기와 보이스피싱 고소를 하고 싶습니다.").subcategory, "fraud");
  assert.equal(classifyLegalQuestion("음주운전 혈중알코올농도 문제로 면허취소가 걱정됩니다.").subcategory, "dui");
  assert.equal(classifyLegalQuestion("형사 1심에서 징역형을 선고받아 항소심을 준비하려고 합니다.").subcategory, "criminal-appeal");
  assert.equal(classifyLegalQuestion("공소장을 받았고 형사 1심 재판을 앞두고 있습니다.").subcategory, "criminal-trial");
  assert.equal(classifyLegalQuestion("빚이 재산보다 많아 상속포기와 한정승인 중 고민입니다.").subcategory, "inheritance-debt-choice");
  const coownership = classifyLegalQuestion("상속재산인 토지를 형제들과 공동으로 소유하고 있습니다. 합의가 되지 않으면 법원을 통해 분할할 수 있나요?");
  assert.equal(coownership.category, "civil");
  assert.equal(coownership.subcategory, "co-owned-property-division");
  assert.equal(classifyLegalQuestion("상간녀 상간소송과 위자료 문제로 상담받고 싶습니다.").category, "divorce");
  assert.equal(classifyLegalQuestion("양육권 친권 양육비와 면접교섭이 문제입니다.").subcategory, "custody");
  assert.equal(classifyLegalQuestion("유류분반환 유류분청구와 자필유언 문제가 있습니다.").category, "inheritance");
  assert.equal(classifyLegalQuestion("식당 영업정지 처분서를 받았습니다.").subcategory, "business-suspension");
});

test("unit: recalculates conditional questions after editing previous answers", () => {
  assert.deepEqual(getQuestionsForCategory("unclear"), []);

  const divorceNone = upsertAnswer([], answer("divorce-children", "minorChildrenCount", "none"));
  const divorceNoCustody = getQuestionsForCategory("divorce", divorceNone);
  assert.equal(divorceNoCustody.some((question) => question.field === "custodyConcern"), false);

  const divorceWithChild = upsertAnswer(divorceNone, answer("divorce-children", "minorChildrenCount", "one"));
  const divorceWithCustody = getQuestionsForCategory("divorce", divorceWithChild);
  assert.equal(divorceWithCustody.some((question) => question.field === "custodyConcern"), true);

  const criminalTrial = upsertAnswer([], answer("criminal-stage", "investigationStage", "trial"));
  const criminalTrialQuestions = getQuestionsForCategory("criminal", criminalTrial);
  const caseNumberQuestion = criminalTrialQuestions.find((question) => question.field === "criminalCaseNumber");
  assert.ok(caseNumberQuestion);
  assert.match(caseNumberQuestion.helpText ?? "", /모른다/);
  const criminalComplaint = upsertAnswer(criminalTrial, answer("criminal-stage", "investigationStage", "complaint"));
  assert.equal(getQuestionsForCategory("criminal", criminalComplaint).some((question) => question.field === "criminalCaseNumber"), false);
});

test("unit: evaluates urgency for criminal, inheritance, and administrative deadlines", () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  assert.equal(
    evaluateUrgency("criminal", [answer("criminal-attendance-date", "attendanceDate", tomorrow.toISOString().slice(0, 10))]).callFirst,
    true,
  );

  const twoMonthsAgo = new Date();
  twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 70);
  assert.notEqual(
    evaluateUrgency("inheritance", [answer("inheritance-deceased-date", "deceasedDate", twoMonthsAgo.toISOString().slice(0, 10))]).level,
    "normal",
  );

  assert.equal(
    evaluateUrgency("administrative", [answer("administrative-effect-date", "enforcementDate", tomorrow.toISOString().slice(0, 10))]).callFirst,
    true,
  );
});

test("unit: masks personal data", () => {
  const result = redactSensitiveData("전화는 010-1234-5678, 사건은 2024가단345, 메일은 test@example.com 입니다.");
  assert.match(result.redacted, /\[전화번호 삭제\]/);
  assert.match(result.redacted, /\[사건번호 삭제\]/);
  assert.match(result.redacted, /\[이메일 삭제\]/);
});

test("unit: refuses dangerous evidence destruction and false statement requests", () => {
  const evidence = evaluateSafetyGuidance("상대방에게 불리한 증거를 없애려면 어떻게 해야 하나요?");
  assert.ok(evidence.flags.includes("evidence-preservation"));
  assert.ok(evidence.notices.some((notice) => notice.includes("삭제하거나 숨기는 방법은 안내할 수 없습니다")));
  assert.ok(evidence.notices.some((notice) => notice.includes("보존")));

  const falseStatement = evaluateSafetyGuidance("경찰 조사에서 거짓말을 잘하는 방법을 알려주세요.");
  assert.ok(falseStatement.flags.includes("truthful-statement"));
  assert.ok(falseStatement.notices.some((notice) => notice.includes("허위진술")));
  assert.ok(falseStatement.notices.some((notice) => notice.includes("변호사와 상담")));
});

test("unit: does not guarantee acquittal or case outcome", () => {
  const classification = classifyLegalQuestion("이 증거면 무조건 무죄죠?");
  const result = buildAiGuideResult("dangerous-outcome", "이 증거면 무조건 무죄죠?", classification, []);

  assert.ok(result.safetyWarnings.some((notice) => notice.includes("무죄 여부나 사건 결과는 단정할 수 없습니다")));
  assert.match(result.safetyNotice, /무죄 여부나 사건 결과는 단정할 수 없습니다/);
  assert.match(result.safetyNotice, /수사기록 전체/);
  assert.doesNotMatch(result.safetyNotice, /무조건 무죄입니다/);
});

test("unit: recommends tagged public content and excludes private or unpublished cases", () => {
  const classification = classifyLegalQuestion("돈을 빌려줬는데 못 받고 있습니다. 차용증과 계좌이체가 있습니다.");
  const related = getAiRelatedContent(classification, []);
  assert.ok(related.cases.length > 0);
  assert.ok(related.cases.every((item) => item.href.startsWith("/cases/")));

  const unpublishedCase = {
    id: "private-case",
    slug: "private-case",
    href: "/cases/private-case",
    category: "civil",
    categoryLabel: "민사",
    subcategory: "대여금",
    title: "비공개 사건",
    excerpt: "비공개",
    accent: "navy",
    tags: ["civil", "debt"],
    visibility: {
      isFeatured: false,
      showOnHome: false,
      showOnCategory: false,
      showOnPractice: false,
      showOnSearch: false,
      published: false,
      publishedAt: "2024-01-01T00:00:00+09:00",
    },
    summary: "",
    reconstructedFacts: [],
    issues: [],
    response: [],
    resultTitle: "",
    resultDescription: "",
    lawyerComment: "",
    seoTitle: "",
    seoDescription: "",
  };
  assert.equal(isPublishedCase(unpublishedCase), false);
});

test("unit: hides related content when there is no specific issue match", () => {
  const classification = classifyLegalQuestion("민사 문제인데 구체적인 내용은 아직 잘 모르겠습니다.", "civil");
  const related = getAiRelatedContent(classification, []);
  assert.equal(related.cases.length, 0);
  assert.equal(related.guides.length, 0);
  assert.equal(related.faqs.length, 0);
});

test("unit: creates Korean consultation summary and keeps private identifiers out of tags", () => {
  const redacted = redactSensitiveData("대여금 010-1234-5678 차용증 계좌이체 증거가 있습니다.");
  const classification = classifyLegalQuestion(redacted.redacted);
  const result = buildAiGuideResult("session-transfer-test", redacted.redacted, classification, [
    answer("civil-dispute-type", "disputeType", "debt"),
    answer("civil-written-agreement", "writtenAgreementExists", "no"),
    answer("civil-transfer-evidence", "transferEvidenceExists", "yes"),
  ]);

  assert.equal(result.consultationSummary.userQuestion.includes("010-1234-5678"), false);
  assert.ok(result.consultationSummary.confirmedFacts.some((fact) => fact.includes("문제 유형")));
  assert.ok(result.consultationSummary.availableEvidence.some((fact) => fact.includes("계좌이체")));
  assert.equal(result.consultationSummary.confirmedFacts.some((fact) => fact.includes("disputeType")), false);

  const criminal = classifyLegalQuestion("형사 재판 진행 중입니다.");
  const tags = tagsFromAiContext(criminal, [
    answer("criminal-case-number", "criminalCaseNumber", "청주지방법원 2026고단012345"),
  ]);
  assert.equal(tags.some((tag) => tag.includes("2026고단012345")), false);
});

test("unit: traffic accident result excludes debt documents and recommends accident evidence", () => {
  const classification = classifyLegalQuestion("교통사고로 다쳐 치료 중이고 과실비율이 억울합니다.");
  const result = buildAiGuideResult(
    "traffic-accident-test",
    "교통사고로 다쳐 치료 중이고 과실비율이 억울합니다.",
    classification,
    [],
  );

  assert.equal(classification.subcategory, "damages");
  assert.equal(result.recommendedDocuments.some((item) => /차용증|계약서|계좌이체/.test(item)), false);
  assert.ok(result.recommendedDocuments.some((item) => item.includes("블랙박스")));
  assert.ok(result.recommendedDocuments.some((item) => item.includes("진단서")));
  assert.ok(result.missingInformation.some((item) => item.includes("보험사")));
  assert.ok(result.missingInformation.some((item) => item.includes("과실비율")));
});

test("unit: strict guidance separates criminal roles and legal categories", () => {
  const criminal = classifyLegalQuestion("경찰 고소와 조사 관련 상담입니다.");
  const victimResult = buildAiGuideResult("criminal-victim", "폭행 피해를 고소하려고 합니다.", criminal, [
    answer("criminal-party-role", "partyRole", "victim"),
  ]);
  const suspectResult = buildAiGuideResult("criminal-suspect", "고소를 당해 경찰 연락을 받았습니다.", criminal, [
    answer("criminal-party-role", "partyRole", "suspect"),
  ]);
  assert.ok(victimResult.recommendedDocuments.some((item) => item.includes("피해 증거")));
  assert.equal(victimResult.recommendedDocuments.some((item) => item.includes("공소장")), false);
  assert.ok(suspectResult.recommendedDocuments.some((item) => item.includes("반박")));
  assert.equal(suspectResult.recommendedDocuments.some((item) => item.includes("고소장·사건접수증")), false);

  const divorce = classifyLegalQuestion("자녀 양육권과 양육비 상담입니다.");
  const custodyResult = buildAiGuideResult("divorce-custody", "자녀 양육권과 양육비 상담입니다.", divorce, [
    answer("divorce-custody", "custodyConcern", "yes"),
  ]);
  assert.ok(custodyResult.recommendedDocuments.some((item) => item.includes("양육비")));

  const inheritance = classifyLegalQuestion("상속받을 재산보다 채무가 많아 한정승인을 고민합니다.");
  const inheritanceResult = buildAiGuideResult("inheritance-limited", "상속 채무 한정승인 상담입니다.", inheritance, [
    answer("inheritance-case-type", "caseType", "limited-acceptance"),
  ]);
  assert.ok(inheritanceResult.recommendedDocuments.some((item) => item.includes("채무")));

  const administrative = classifyLegalQuestion("공무원 징계 처분에 불복하려고 합니다.");
  const disciplineResult = buildAiGuideResult("administrative-discipline", "공무원 징계 처분에 불복하려고 합니다.", administrative, [
    answer("administrative-disposition-type", "dispositionType", "discipline"),
  ]);
  assert.ok(disciplineResult.recommendedDocuments.some((item) => item.includes("징계의결서")));
});

test("unit: follow-up answers override broad divorce classification for affair claims", () => {
  const classification = classifyLegalQuestion("이혼 문제로 상담하고 싶습니다.");
  const questions = [
    { id: "ai-followup-1", field: "aiFollowup1", category: "divorce", order: 1, type: "long_text", question: "이혼을 원하지 않으면서도 어떤 결과를 원하시나요?", required: true },
    { id: "ai-followup-2", field: "aiFollowup2", category: "divorce", order: 2, type: "boolean", question: "배우자의 부정행위 증거가 있나요?", required: true, options: [{ value: "yes", label: "예" }, { value: "no", label: "아니오" }] },
  ];
  const result = buildAiGuideResult("affair-followup", "현재 이혼 절차는 없습니다.", classification, [
    answer("ai-followup-1", "aiFollowup1", "이혼은 원하지 않고 상간자에게 책임을 묻고 싶습니다."),
    answer("ai-followup-2", "aiFollowup2", "yes"),
  ], questions);

  assert.equal(result.classification.subcategory, "affair");
  assert.ok(result.missingInformation.some((item) => item.includes("혼인 사실")));
  assert.ok(result.recommendedDocuments.some((item) => item.includes("부정행위")));
  assert.equal(result.recommendedDocuments.some((item) => /부동산|예금|퇴직금|재산 형성/.test(item)), false);
});

test("unit: custody goal takes priority over adultery as a secondary divorce fact", () => {
  const classification = classifyLegalQuestion("배우자의 바람으로 이혼을 고민하고 있습니다.");
  const questions = [
    { id: "ai-followup-1", field: "aiFollowup1", category: "divorce", order: 1, type: "long_text", question: "이혼에서 가장 중요하게 생각하는 결과는 무엇인가요?", required: true },
    { id: "ai-followup-2", field: "aiFollowup2", category: "divorce", order: 2, type: "boolean", question: "자녀 양육 계획이 있나요?", required: true, options: [{ value: "yes", label: "예" }, { value: "no", label: "아니오" }] },
  ];
  const result = buildAiGuideResult("custody-over-affair", "배우자의 바람으로 이혼을 고민하고 있습니다.", classification, [
    answer("ai-followup-1", "aiFollowup1", "양육권을 확보하고 자녀를 계속 양육하는 것이 가장 중요합니다."),
    answer("ai-followup-2", "aiFollowup2", "yes"),
  ], questions);

  assert.equal(result.classification.subcategory, "custody");
  assert.ok(result.missingInformation.some((item) => /주된 양육자|양육 환경/.test(item)));
  assert.ok(result.recommendedDocuments.some((item) => /양육 분담|돌봄/.test(item)));
  assert.equal(result.recommendedDocuments.some((item) => /숙박|상간 상대방|부정행위/.test(item)), false);
});

test("unit: verbal abuse and unpaid living expenses never produce affair guidance", () => {
  const input = "배우자의 반복적인 폭언과 생활비 미지급 때문에 이혼을 원합니다.";
  const classification = classifyLegalQuestion(input);
  const result = buildAiGuideResult("abuse-support-divorce", input, classification, [
    answer("ai-followup-1", "aiFollowup1", "폭언 중 물건을 집어던졌습니다."),
    answer("ai-followup-2", "aiFollowup2", "2025년부터 생활비를 주지 않았습니다."),
  ]);

  assert.notEqual(result.classification.subcategory, "affair");
  assert.ok(result.missingInformation.some((item) => /폭언|위협|생활비/.test(item)));
  assert.ok(result.recommendedDocuments.some((item) => /녹음|계좌 내역|생활비/.test(item)));
  assert.equal(result.missingInformation.some((item) => /상간|부정행위|혼인 사실/.test(item)), false);
  assert.equal(result.recommendedDocuments.some((item) => /상간|부정행위|숙박/.test(item)), false);
});

test("unit: violence-only divorce guidance excludes living-expense and property items", () => {
  const input = "배우자의 폭언과 폭행 때문에 이혼 소송을 하고 싶습니다.";
  const result = buildAiGuideResult("violence-only-divorce", input, classifyLegalQuestion(input), [
    answer("ai-followup-1", "aiFollowup1", "10년 동안 반복됐고 최근 물건을 집어던졌습니다."),
  ]);

  assert.ok(result.missingInformation.some((item) => /폭행|경찰|목격|위험/.test(item)));
  assert.ok(result.recommendedDocuments.some((item) => /녹음|진단서|112/.test(item)));
  assert.equal(result.missingInformation.some((item) => /생활비|주거|생계|소득|재산/.test(item)), false);
  assert.equal(result.recommendedDocuments.some((item) => /생활비|계좌|가계|소득|재산/.test(item)), false);
  assert.match(result.consultationOpinion ?? "", /재판상 이혼과 위자료 청구를 검토할 수 있습니다/);
  assert.match(result.consultationOpinion ?? "", /변호사 상담/);
});

test("unit: pre-litigation divorce guidance excludes pleadings not yet received", () => {
  const input = "배우자가 재산을 처분하고 있어 이혼과 재산분할 상담을 원합니다.";
  const classification = classifyLegalQuestion(input);
  const preSuit = buildAiGuideResult("divorce-before-suit", input, classification, [
    answer("divorce-status", "currentStatus", "considering"),
  ]);
  const pendingSuit = buildAiGuideResult("divorce-pending-suit", input, classification, [
    answer("divorce-status", "currentStatus", "lawsuit"),
  ]);
  assert.equal(preSuit.recommendedDocuments.some((item) => /소장|답변서|조정서류/.test(item)), false);
  assert.ok(pendingSuit.recommendedDocuments.some((item) => /소장|답변서|조정서류/.test(item)));
});

test("unit: de facto marriage guidance avoids divorce wording and uses status evidence", () => {
  const input = "사실혼 관계가 종료되어 재산분할을 청구하고 싶습니다.";
  const result = buildAiGuideResult("de-facto-property", input, classifyLegalQuestion(input), [
    answer("ai-followup-1", "aiFollowup1", "현재 법적 절차는 진행 중이지 않습니다."),
  ]);
  assert.equal(result.missingInformation.some((item) => /이혼 의사|이혼 소송/.test(item)), false);
  assert.ok(result.missingInformation.some((item) => /부부로 생활|공동생활|사실혼/.test(item)));
  assert.ok(result.recommendedDocuments.some((item) => /공동 주소|공동생활비|가족행사/.test(item)));
  assert.equal(result.recommendedDocuments.some((item) => /소장|답변서|조정서류/.test(item)), false);
});

test("unit: visitation guidance excludes general custody and child-support materials", () => {
  const input = "양육권 판결은 상대방에게 있지만 아이를 보여주지 않습니다. 면접교섭을 할 수 있을까요?";
  const result = buildAiGuideResult("visitation-after-judgment", input, classifyLegalQuestion(input), [
    answer("ai-followup-1", "aiFollowup1", "양육권 판결문이 있습니다."),
    answer("ai-followup-2", "aiFollowup2", "아이를 보여달라고 했지만 거부했습니다."),
  ]);
  assert.ok(result.missingInformation.some((item) => /면접교섭 방법|거부|마지막으로 자녀/.test(item)));
  assert.ok(result.recommendedDocuments.some((item) => /판결문|거절당한|면접교섭 일정/.test(item)));
  assert.equal(result.missingInformation.some((item) => /주된 양육자|양육 환경|친권·양육권/.test(item)), false);
  assert.equal(result.recommendedDocuments.some((item) => /학교|의료|생활비|양육비|근무시간/.test(item)), false);
  assert.match(result.consultationOpinion ?? "", /면접교섭을 청구할 수 있습니다/);
});

test("unit: unpaid child-support enforcement excludes custody-environment guidance", () => {
  const input = "양육비 판결 후 지급이 시작됐지만 6개월 전부터 지급되지 않아 강제로 받고 싶습니다.";
  const result = buildAiGuideResult("unpaid-child-support", input, classifyLegalQuestion(input), [
    answer("ai-followup-1", "aiFollowup1", "법원 판결이 있습니다."),
    answer("ai-followup-2", "aiFollowup2", "지급 요청 문자와 계좌 내역이 있습니다."),
  ]);
  assert.ok(result.missingInformation.some((item) => /미납 개월|미지급.*총액|직장·소득/.test(item)));
  assert.ok(result.recommendedDocuments.some((item) => /판결문|계좌 내역|미지급액 계산표/.test(item)));
  assert.equal(result.missingInformation.some((item) => /양육 환경|돌봄 시간|친권|면접교섭|학교/.test(item)), false);
  assert.equal(result.recommendedDocuments.some((item) => /학교|어린이집|의료|주거|돌봄 일정|면접교섭/.test(item)), false);
  assert.match(result.consultationOpinion ?? "", /이행명령|직접지급명령|강제집행/);
  assert.match(result.consultationOpinion ?? "", /변호사.*상담/);
});

test("unit: follow-up answers override broad civil classification for debt claims", () => {
  const classification = classifyLegalQuestion("민사 문제로 상담하고 싶습니다.", "civil");
  const questions = [
    { id: "ai-followup-1", field: "aiFollowup1", category: "civil", order: 1, type: "boolean", question: "돈을 빌려준 상대방과 계약서가 있나요?", required: true, options: [{ value: "yes", label: "예" }, { value: "no", label: "아니오" }] },
    { id: "ai-followup-2", field: "aiFollowup2", category: "civil", order: 2, type: "long_text", question: "상환 요청 후 상대방 반응은 어땠나요?", required: true },
  ];
  const result = buildAiGuideResult("debt-followup", "민사 문제로 상담하고 싶습니다.", classification, [
    answer("ai-followup-1", "aiFollowup1", "yes"),
    answer("ai-followup-2", "aiFollowup2", "상환을 요청했지만 묵묵부답입니다."),
  ], questions);

  assert.equal(result.classification.subcategory, "debt");
  assert.ok(result.missingInformation.some((item) => item.includes("빌려준 날짜와 금액")));
  assert.ok(result.recommendedDocuments.some((item) => item.includes("차용증")));
  assert.equal(result.recommendedDocuments.some((item) => /등기사항증명서|건축물대장|임대차|하자/.test(item)), false);
});

test("unit: debt guidance does not recheck a promissory note confirmed in a free-text answer", () => {
  const input = "1억 원을 빌려줬는데 돌려받지 못하고 있습니다.";
  const questions = [
    { id: "ai-followup-1", field: "aiFollowup1", category: "civil", order: 1, type: "long_text", question: "계약서나 관련 문서의 종류를 적어주세요.", required: true },
  ];
  const result = buildAiGuideResult("debt-written-document", input, classifyLegalQuestion(input), [
    answer("ai-followup-1", "aiFollowup1", "차용증, 거래 내역서 있음"),
  ], questions);

  assert.equal(result.missingInformation.some((item) => /차용증|계약서/.test(item)), false);
  assert.ok(result.recommendedDocuments.some((item) => /차용증/.test(item)));
});

test("unit: AI-generated debt questions do not turn an unspecified enforcement matter into a loan claim", () => {
  const input = "판결문을 가지고 있는데 상대방 재산에 강제집행을 할 수 있는지 상담하고 싶습니다.";
  const questions = [
    { id: "ai-followup-1", field: "aiFollowup1", category: "civil", order: 1, type: "boolean", question: "차용증이 있나요?", required: true, options: [{ value: "yes", label: "예" }, { value: "no", label: "아니오" }] },
    { id: "ai-followup-2", field: "aiFollowup2", category: "civil", order: 2, type: "date", question: "돈을 빌려준 날짜는 언제인가요?", required: true },
  ];
  const result = buildAiGuideResult("generic-enforcement", input, classifyLegalQuestion(input), [
    answer("ai-followup-1", "aiFollowup1", "no"),
    answer("ai-followup-2", "aiFollowup2", "2020-01-01"),
  ], questions);

  assert.notEqual(result.classification.subcategory, "debt");
  assert.equal(result.missingInformation.some((item) => /돈을 빌려준|변제기|차용증/.test(item)), false);
  assert.equal(result.recommendedDocuments.some((item) => /차용증|변제 약속/.test(item)), false);
});

test("unit: investment return guidance is tailored beyond a generic contract dispute", () => {
  const input = "투자금 5,000만 원을 지급했고 계약 종료 후 원금 반환과 수익금 정산을 요구하고 있습니다.";
  const result = buildAiGuideResult("investment-return", input, classifyLegalQuestion(input), []);

  assert.equal(result.classification.subcategory, "investment-return");
  assert.match(result.consultationOpinion ?? "", /원금 반환 약정|손익|정산 의무/);
  assert.ok(result.missingInformation.some((item) => /원금 보장|손실 부담|수익과 손실|자금 사용처/.test(item)));
  assert.ok(result.recommendedDocuments.some((item) => /투자계약서|사업제안서/.test(item)));
  assert.ok(result.recommendedDocuments.some((item) => /회계자료|손익/.test(item)));
  assert.equal(result.recommendedDocuments.some((item) => /견적서|발주서|공사/.test(item)), false);
});

test("unit: criminal appeal guidance excludes police-investigation intake", () => {
  const input = "형사재판 1심에서 징역형을 선고받았고 항소심에서 형량 감경을 원합니다.";
  const result = buildAiGuideResult("criminal-appeal", input, classifyLegalQuestion(input), []);

  assert.equal(result.classification.subcategory, "criminal-appeal");
  assert.match(result.consultationOpinion ?? "", /사실인정|법리 판단|양형/);
  assert.ok(result.missingInformation.some((item) => /1심 판결 이유|소송기록접수통지서|새로운 증거/.test(item)));
  assert.ok(result.recommendedDocuments.some((item) => /1심 판결문|항소장|항소이유서/.test(item)));
  assert.equal(result.missingInformation.some((item) => /경찰·검찰 연락|출석 예정일|압수수색/.test(item)), false);
  assert.equal(result.recommendedDocuments.some((item) => /출석요구 문자|고소 내용/.test(item)), false);
});

test("unit: criminal first-trial guidance matches pending and ongoing trial stages", () => {
  for (const input of [
    "공소장을 받았고 형사 1심 재판을 앞두고 있습니다.",
    "현재 형사재판 1심 공판이 진행 중입니다.",
  ]) {
    const result = buildAiGuideResult("criminal-first-trial", input, classifyLegalQuestion(input), []);
    assert.equal(result.classification.subcategory, "criminal-trial");
    assert.match(result.consultationOpinion ?? "", /공소사실|증거와 수사기록|방어 방향/);
    assert.ok(result.missingInformation.some((item) => /공소장|공판기일|증거목록|수사기록/.test(item)));
    assert.ok(result.recommendedDocuments.some((item) => /공소장|공판기일통지서|증거목록/.test(item)));
    assert.equal(result.missingInformation.some((item) => /경찰·검찰 연락|출석 예정일|압수수색/.test(item)), false);
    assert.equal(result.recommendedDocuments.some((item) => /출석요구 문자|고소 내용/.test(item)), false);
  }
});

test("unit: inheritance debt choice guidance balances renunciation and limited acceptance", () => {
  const input = "아버지가 돌아가셨는데 빚이 재산보다 많은 것 같습니다. 상속포기와 한정승인 중 어떤 방법을 선택해야 하나요?";
  const result = buildAiGuideResult("inheritance-debt-choice", input, classifyLegalQuestion(input), []);

  assert.equal(result.classification.subcategory, "inheritance-debt-choice");
  assert.match(result.consultationOpinion ?? "", /상속포기는.*한정승인은/);
  assert.ok(result.missingInformation.some((item) => /상속재산.*빚|후순위 상속인|예금 인출/.test(item)));
  assert.ok(result.recommendedDocuments.some((item) => /상속재산 조회|대출.*세금.*보증채무/.test(item)));
});

test("unit: inheritance guidance does not repeat a confirmed death date or duplicate awareness-date checks", () => {
  const input = "아버지가 돌아가셨는데 빚이 재산보다 많은 것 같습니다. 상속포기와 한정승인 중 어떤 방법을 선택해야 하나요?";
  const questions = [
    { id: "ai-followup-death", field: "aiFollowupDeath", category: "inheritance", order: 1, type: "date", question: "아버지의 사망일은 언제인가요?", required: true },
  ];
  const result = buildAiGuideResult("inheritance-known-death-date", input, classifyLegalQuestion(input), [
    answer("ai-followup-death", "aiFollowupDeath", "2026-06-11"),
  ], questions);

  const awarenessChecks = result.missingInformation.filter((item) => /상속\s*사실/.test(item) && /알게/.test(item));
  assert.equal(awarenessChecks.length, 1);
  assert.match(awarenessChecks[0], /사망일과 다르다면/);
  assert.equal(result.missingInformation.some((item) => /^사망일과 상속 사실/.test(item)), false);
});

test("unit: estate division guidance confirms spouse and number of children", () => {
  const input = "형제들과 상속재산분할 협의가 되지 않아 상담을 받고 싶습니다.";
  const result = buildAiGuideResult("estate-division-heirs", input, classifyLegalQuestion(input), [
    answer("inheritance-case-type", "caseType", "estate-division"),
  ]);

  assert.ok(result.missingInformation.some((item) => /배우자.*자녀가 몇 명/.test(item)));
  assert.ok(result.missingInformation.some((item) => /먼저 사망한 자녀.*배우자와 자녀/.test(item)));
  assert.ok(result.missingInformation.some((item) => /공동상속인 전원/.test(item)));
  assert.ok(result.recommendedDocuments.some((item) => /기본증명서.*가족관계증명서.*제적등본/.test(item)));
});

test("unit: contribution-share guidance confirms support duration and details", () => {
  const input = "형제가 부모님을 오랫동안 부양했다는 이유로 더 많은 상속재산을 요구합니다. 법적으로 더 받을 수 있는 제도가 있나요?";
  const result = buildAiGuideResult("inheritance-contribution-share", input, classifyLegalQuestion(input), [
    answer("inheritance-case-type", "caseType", "estate-division"),
  ]);

  assert.ok(result.missingInformation.some((item) => /부양한 시작일.*총 기간/.test(item)));
  assert.ok(result.missingInformation.some((item) => /동거.*간병.*생활비.*치료비/.test(item)));
  assert.ok(result.missingInformation.some((item) => /통상적인 부양.*특별한 기여/.test(item)));
});

test("unit: de facto spouse inheritance guidance focuses on legally relevant alternatives", () => {
  const input = "사실혼 배우자가 사망했습니다. 혼인신고는 하지 않았는데 상속을 받을 수 있나요?";
  const result = buildAiGuideResult("de-facto-spouse-inheritance", input, classifyLegalQuestion(input), [
    answer("ai-followup-death", "aiFollowupDeath", "2026-05-08"),
  ], [{ id: "ai-followup-death", field: "aiFollowupDeath", category: "inheritance", order: 1, type: "date", question: "사실혼 배우자의 사망일은 언제인가요?", required: true }]);

  assert.equal(result.missingInformation.some((item) => /상속 사실을 처음 알게/.test(item)), false);
  assert.ok(result.missingInformation.some((item) => /법률상 배우자.*자녀.*부모/.test(item)));
  assert.ok(result.missingInformation.some((item) => /유언장.*약정/.test(item)));
  assert.ok(result.missingInformation.some((item) => /보험금.*수익자/.test(item)));
  assert.ok(result.missingInformation.some((item) => /함께 마련.*기여/.test(item)));
  assert.ok(result.recommendedDocuments.some((item) => /공동 주소.*동거기간/.test(item)));
});

test("unit: debt guidance does not repeat confirmed facts or request documents confirmed absent", () => {
  const input = "친구에게 3,000만 원을 빌려줬는데 차용증은 없고 계좌이체 내역과 카카오톡 대화만 있습니다. 돈을 돌려받을 수 있나요?";
  const questions = [
    { id: "ai-followup-1", field: "aiFollowup1", category: "civil", order: 1, type: "long_text", question: "돈을 빌려준 날짜는 언제인가요?", required: true },
    { id: "ai-followup-2", field: "aiFollowup2", category: "civil", order: 2, type: "long_text", question: "상환을 요구한 날짜는 언제인가요?", required: true },
    { id: "ai-followup-3", field: "aiFollowup3", category: "civil", order: 3, type: "single_choice", question: "현재 법적 절차가 진행 중인가요?", required: true, options: [{ value: "yes", label: "예" }, { value: "no", label: "아니오" }] },
  ];
  const result = buildAiGuideResult("debt-known-facts", input, classifyLegalQuestion(input), [
    answer("ai-followup-1", "aiFollowup1", "2020-10-10"),
    answer("ai-followup-2", "aiFollowup2", "2026-05-11"),
    answer("ai-followup-3", "aiFollowup3", "no"),
  ], questions);

  assert.equal(result.missingInformation.some((item) => /차용증.{0,12}없다면.{0,30}(?:이체|대화)\s*기록/.test(item)), false);
  assert.equal(result.missingInformation.some((item) => /빌려준\s*날짜와\s*금액/.test(item)), false);
  assert.equal(result.recommendedDocuments.some((item) => /차용증|각서|공증서/.test(item)), false);
  assert.equal(result.recommendedDocuments.some((item) => /지급명령|소송서류/.test(item)), false);
  assert.ok(result.recommendedDocuments.some((item) => /계좌이체|입금/.test(item)));
  assert.ok(result.recommendedDocuments.some((item) => /독촉|대화/.test(item)));
});

test("unit: calculates session expiry and rate limits", () => {
  const expiresAt = new Date(createExpiry(7));
  const diffDays = Math.round((expiresAt.getTime() - Date.now()) / 86_400_000);
  assert.ok(diffDays >= 6 && diffDays <= 8);

  clearRateLimitBuckets();
  assert.equal(checkRateLimit("test-key", 2, 60_000, 1_000).allowed, true);
  assert.equal(checkRateLimit("test-key", 2, 60_000, 2_000).allowed, true);
  const limited = checkRateLimit("test-key", 2, 60_000, 3_000);
  assert.equal(limited.allowed, false);
  assert.ok((limited.retryAfterSeconds ?? 0) > 0);
});

test("unit/provider: OpenAI provider accepts structured JSON success", async () => {
  const provider = new OpenAiLegalGuideProvider({
    apiKey: "test-key",
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  category: "civil",
                  subcategory: "debt",
                  confidence: 0.82,
                  reasonSummary: "대여금 관련 표현이 확인됩니다.",
                  matchedTags: ["civil", "debt"],
                }),
              },
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  });
  const rule = classifyLegalQuestion("대여금 상담입니다.");
  const response = await provider.classify("대여금 상담입니다.", rule, {
    sessionId: "provider-success",
    initialQuestionRedacted: "대여금 상담입니다.",
    answers: [],
    promptVersion: "test",
  });
  assert.equal(response.data.category, "civil");
  assert.equal(response.data.subcategory, "debt");
  assert.equal(response.usage.totalTokens, 15);
});

test("unit/provider: OpenAI provider creates safe tailored follow-up questions", async () => {
  const provider = new OpenAiLegalGuideProvider({
    apiKey: "test-key",
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                questions: [
                  { question: "이사 예정일은 언제인가요?", type: "date", required: true },
                  { question: "소송 제기 마감일이 있나요?", type: "date", required: true },
                  { question: "임대차계약이 종료된 날짜는 언제인가요?", type: "date", required: true },
                  {
                    question: "임대인에게 반환을 요청한 자료가 있나요?",
                    type: "single_choice",
                    required: true,
                    options: [
                      { value: "yes", label: "있습니다" },
                      { value: "no", label: "없습니다" },
                    ],
                  },
                  {
                    question: "계약서나 관련 문서가 있나요?",
                    helpText: "계약서, 통지서 등 관련 문서의 종류를 입력해 주세요. 예: 계약서, 이메일 통지 등.",
                    type: "single_choice",
                    required: false,
                    options: [{ value: "yes", label: "예" }, { value: "no", label: "아니오" }],
                  },
                  {
                    question: "증거가 있다면, 어떤 종류의 증거가 있으며 그 주요 내용을 설명해 주세요.",
                    helpText: "예: 이메일, 문자 메시지, 계약서 등",
                    type: "long_text",
                    required: true,
                  },
                  { question: "사고와 관련된 경찰 보고서가 있나요?", type: "short_text", required: true },
                  { question: "이혼 후 원하는 결과는 무엇인가요?", type: "boolean", required: true },
                  { question: "상대방이 주장하는 하자의 구체적인 내용을 알고 있습니까?", helpText: "하자에 대한 설명이나 증거를 포함해 주세요.", type: "long_text", required: true },
                  { question: "배우자와의 이혼을 결심한 날짜는 언제인가요?", type: "date", required: true },
                ],
              }),
            },
          }],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  });
  const classification = classifyLegalQuestion("임대차 보증금을 돌려받지 못했습니다.");
  const response = await provider.createQuestions(classification, {
    sessionId: "provider-questions",
    initialQuestionRedacted: "임대차 보증금을 돌려받지 못했습니다.",
    answers: [],
    promptVersion: "test",
  });
  assert.equal(response.data.length, 5);
  assert.equal(response.data.some((item) => /이사\s*예정일/.test(item.question)), false);
  assert.equal(response.data.some((item) => /소송\s*제기\s*마감일/.test(item.question)), false);
  assert.equal(response.data.some((item) => /이혼.*결심/.test(item.question)), false);
  assert.equal(response.data.filter((item) => /서류|문서|자료|증거/.test(`${item.question} ${item.helpText ?? ""}`) && /종류|내용/.test(`${item.question} ${item.helpText ?? ""}`)).length, 1);
  assert.equal(response.data.find((item) => /종료된 날짜/.test(item.question))?.type, "date");
  const documentQuestion = response.data.find((item) => /종류와 내용을 구체적으로/.test(item.question));
  assert.equal(documentQuestion?.type, "long_text");
  assert.equal(documentQuestion?.options, undefined);
  const policeQuestion = response.data.find((item) => /경찰 보고서/.test(item.question));
  assert.equal(policeQuestion?.type, "boolean");
  assert.deepEqual(policeQuestion?.options, [
    { value: "yes", label: "예" },
    { value: "no", label: "아니오" },
  ]);
  const desiredOutcomeQuestion = response.data.find((item) => /원하는 결과/.test(item.question));
  assert.equal(desiredOutcomeQuestion?.type, "long_text");
  assert.equal(desiredOutcomeQuestion?.options, undefined);

  const flow = sanitizeQuestionFlow(
    response.data.map((question, index) => ({
      ...question,
      id: `ai-followup-${index + 1}`,
      field: `aiFollowup${index + 1}`,
      category: "civil",
      order: index + 1,
    })),
    "civil",
  );
  assert.equal(flow?.length, 5);
  assert.ok(flow?.some((item) => item.type === "boolean" && item.options?.map((option) => option.value).join(",") === "yes,no"));
  assert.ok(flow?.some((item) => /원하는 결과/.test(item.question) && item.type === "long_text" && item.options === undefined));
});

test("unit/provider: DUI document prompts use only DUI-specific records", async () => {
  const provider = new OpenAiLegalGuideProvider({
    apiKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ questions: [{
        question: "현재 가지고 있는 서류나 증거의 종류와 내용을 구체적으로 적어주세요.",
        helpText: "예: 판결문, 계약서, 계좌내역, 문자, 사진",
        type: "long_text",
        required: true,
      }] }) } }],
    }), { status: 200, headers: { "content-type": "application/json" } }),
  });
  const input = "술을 마시고 운전하다 적발됐고 혈중알코올농도는 0.09%라고 들었습니다. 초범이면 어떤 처벌을 받나요?";
  const response = await provider.createQuestions(classifyLegalQuestion(input), {
    sessionId: "dui-specific-documents",
    initialQuestionRedacted: input,
    answers: [],
    promptVersion: "test",
  });

  assert.equal(response.data.length, 1);
  assert.match(response.data[0].question, /음주측정 결과지|출석요구서/);
  assert.match(response.data[0].helpText ?? "", /혈중알코올농도|채혈|출석 예정일/);
  assert.doesNotMatch(response.data[0].helpText ?? "", /판결문|계약서|계좌내역/);
});

test("unit/provider: sexual consent wording is not mistaken for a later criminal settlement", async () => {
  const provider = new OpenAiLegalGuideProvider({
    apiKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ questions: [
        { question: "합의가 이루어진 날짜는 언제인가요?", helpText: "합의가 이루어진 구체적인 날짜를 입력해주세요.", type: "date", required: true },
        { question: "성관계 전후 카카오톡 대화에는 어떤 내용이 있나요?", type: "long_text", required: true },
      ] }) } }],
    }), { status: 200, headers: { "content-type": "application/json" } }),
  });
  const input = "성범죄로 고소당했지만 상대방과 합의해서 이루어진 관계였습니다. 카카오톡 대화가 증거가 될 수 있나요?";
  const response = await provider.createQuestions(classifyLegalQuestion(input), {
    sessionId: "sexual-consent-not-settlement",
    initialQuestionRedacted: input,
    answers: [],
    promptVersion: "test",
  });

  assert.equal(response.data.some((item) => /합의.{0,10}(?:날짜|언제)/.test(item.question)), false);
  assert.ok(response.data.some((item) => /카카오톡/.test(item.question)));
});

test("unit/provider: inheritance comparison questions do not assume renunciation", async () => {
  const provider = new OpenAiLegalGuideProvider({
    apiKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ questions: [
        { question: "상속을 포기하기로 결정한 이유는 무엇인가요?", helpText: "예: 빚이 많아서", type: "long_text", required: true },
        { question: "상속포기 신청을 위해 준비한 서류가 있나요?", type: "boolean", required: true },
        { question: "상속포기 기간이 언제였는지 아시나요?", helpText: "예: 2022년 1월 1일", type: "date", required: true },
        { question: "사망 후 아버지의 예금을 인출하거나 재산을 처분한 사실이 있나요?", type: "boolean", required: true },
      ] }) } }],
    }), { status: 200, headers: { "content-type": "application/json" } }),
  });
  const input = "아버지가 돌아가셨는데 빚이 재산보다 많은 것 같습니다. 상속포기와 한정승인 중 어떤 방법을 선택해야 하나요?";
  const response = await provider.createQuestions(classifyLegalQuestion(input), {
    sessionId: "inheritance-choice-questions",
    initialQuestionRedacted: input,
    answers: [],
    promptVersion: "test",
  });

  assert.equal(response.data.some((item) => /포기하기로 결정|상속포기 신청/.test(item.question)), false);
  assert.equal(response.data.filter((item) => /상속재산과 빚의 종류/.test(item.question)).length, 1);
  assert.equal(response.data.some((item) => /상속포기 기간/.test(item.question)), false);
  assert.equal(response.data.filter((item) => /돌아가신 날짜/.test(item.question) && item.type === "date").length, 1);
  assert.ok(response.data.some((item) => /예금을 인출|재산을 처분/.test(item.question)));
});

test("unit/provider: explanatory help text converts yes-no questions to written answers", async () => {
  const provider = new OpenAiLegalGuideProvider({
    apiKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ questions: [
        {
          question: "형이 재산을 관리하는 방식에 대해 알고 있는 내용이 있나요?",
          helpText: "예: 형이 재산을 어떻게 관리하고 있는지 설명해 주세요.",
          type: "boolean",
          required: true,
          options: [{ value: "yes", label: "예" }, { value: "no", label: "아니오" }],
        },
      ] }) } }],
    }), { status: 200, headers: { "content-type": "application/json" } }),
  });
  const input = "형이 아버지의 상속재산을 관리하고 있는데 사용 내역을 알 수 없습니다.";
  const response = await provider.createQuestions(classifyLegalQuestion(input), {
    sessionId: "inheritance-descriptive-question",
    initialQuestionRedacted: input,
    answers: [],
    promptVersion: "test",
  });

  assert.equal(response.data[0]?.type, "long_text");
  assert.equal(response.data[0]?.options, undefined);
});

test("unit/provider: reason questions are written answers even when generated as yes-no", async () => {
  const provider = new OpenAiLegalGuideProvider({
    apiKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ questions: [
        {
          question: "상속포기를 하지 않은 이유가 있나요?",
          helpText: "예: 정보 부족, 법적 조언 부족 등",
          type: "boolean",
          required: true,
          options: [{ value: "yes", label: "예" }, { value: "no", label: "아니오" }],
        },
      ] }) } }],
    }), { status: 200, headers: { "content-type": "application/json" } }),
  });
  const input = "아버지가 돌아가신 뒤 상속포기를 하지 못해 상담을 받고 싶습니다.";
  const response = await provider.createQuestions(classifyLegalQuestion(input), {
    sessionId: "inheritance-reason-written-answer",
    initialQuestionRedacted: input,
    answers: [],
    promptVersion: "test",
  });

  assert.equal(response.data[0]?.type, "long_text");
  assert.equal(response.data[0]?.options, undefined);
});

test("unit/provider: document inventory questions require a written list", async () => {
  const provider = new OpenAiLegalGuideProvider({
    apiKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ questions: [
        {
          question: "상속 관련하여 보유하고 있는 문서가 있나요?",
          helpText: "예: 사망증명서, 상속 관련 서류 등",
          type: "boolean",
          required: true,
          options: [{ value: "yes", label: "예" }, { value: "no", label: "아니오" }],
        },
      ] }) } }],
    }), { status: 200, headers: { "content-type": "application/json" } }),
  });
  const input = "상속포기와 한정승인 중 어떤 방법을 선택해야 하는지 상담받고 싶습니다.";
  const response = await provider.createQuestions(classifyLegalQuestion(input), {
    sessionId: "inheritance-document-inventory",
    initialQuestionRedacted: input,
    answers: [],
    promptVersion: "test",
  });

  assert.equal(response.data[0]?.type, "long_text");
  assert.equal(response.data[0]?.options, undefined);
  assert.match(response.data[0]?.helpText ?? "", /없다면.*없음/);
});

test("unit/provider: condition questions require a written description", async () => {
  const provider = new OpenAiLegalGuideProvider({
    apiKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ questions: [
        {
          question: "유언장 작성 당시 아버지의 정신적 상태는 어떠했나요?",
          helpText: "예: 건강했음, 병원에 입원 중이었음 등",
          type: "boolean",
          required: true,
          options: [{ value: "yes", label: "예" }, { value: "no", label: "아니오" }],
        },
      ] }) } }],
    }), { status: 200, headers: { "content-type": "application/json" } }),
  });
  const input = "아버지가 작성한 유언장의 효력에 관해 상담받고 싶습니다.";
  const response = await provider.createQuestions(classifyLegalQuestion(input), {
    sessionId: "will-mental-condition-written-answer",
    initialQuestionRedacted: input,
    answers: [],
    promptVersion: "test",
  });

  assert.equal(response.data[0]?.type, "long_text");
  assert.equal(response.data[0]?.options, undefined);
});

test("unit/provider: explicit death-date questions always use a date input", async () => {
  const provider = new OpenAiLegalGuideProvider({
    apiKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ questions: [
        {
          question: "사실혼 배우자의 사망일은 언제인가요?",
          helpText: "정확한 날짜를 입력해 주세요.",
          type: "long_text",
          required: true,
        },
      ] }) } }],
    }), { status: 200, headers: { "content-type": "application/json" } }),
  });
  const input = "사실혼 배우자가 사망한 뒤 상속 문제를 상담받고 싶습니다.";
  const response = await provider.createQuestions(classifyLegalQuestion(input), {
    sessionId: "de-facto-spouse-death-date",
    initialQuestionRedacted: input,
    answers: [],
    promptVersion: "test",
  });

  assert.equal(response.data[0]?.type, "date");
  assert.equal(response.data[0]?.options, undefined);
});

test("unit/provider: estate division always asks spouse and child count", async () => {
  const provider = new OpenAiLegalGuideProvider({
    apiKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ questions: [
        { question: "분할 대상 부동산은 무엇인가요?", type: "long_text", required: true },
        { question: "상속인 사이에 협의한 내용이 있나요?", type: "long_text", required: true },
      ] }) } }],
    }), { status: 200, headers: { "content-type": "application/json" } }),
  });
  const input = "형제들과 상속재산분할 협의가 되지 않아 상담을 받고 싶습니다.";
  const response = await provider.createQuestions(classifyLegalQuestion(input), {
    sessionId: "estate-division-heir-composition",
    initialQuestionRedacted: input,
    answers: [],
    promptVersion: "test",
  });

  const heirQuestion = response.data.find((item) => /배우자/.test(item.question) && /자녀가 몇 명/.test(item.question));
  assert.equal(heirQuestion?.type, "long_text");
  assert.match(heirQuestion?.helpText ?? "", /먼저 사망한 자녀/);
});

test("unit/provider: contribution-share consultation always asks support duration", async () => {
  const provider = new OpenAiLegalGuideProvider({
    apiKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ questions: [
        { question: "형제가 부모님을 어떤 방식으로 도왔나요?", type: "long_text", required: true },
        { question: "형제가 부담한 비용은 어느 정도인가요?", type: "long_text", required: true },
      ] }) } }],
    }), { status: 200, headers: { "content-type": "application/json" } }),
  });
  const input = "형제가 부모님을 오랫동안 부양했다는 이유로 더 많은 상속재산을 요구합니다. 법적으로 더 받을 수 있는 제도가 있나요?";
  const response = await provider.createQuestions(classifyLegalQuestion(input), {
    sessionId: "inheritance-support-duration",
    initialQuestionRedacted: input,
    answers: [],
    promptVersion: "test",
  });

  const durationQuestion = response.data.find((item) => /부양한 기간/.test(item.question));
  assert.equal(durationQuestion?.type, "long_text");
  assert.match(durationQuestion?.helpText ?? "", /시작한 시기.*총 기간/);
});

test("unit/provider: registered inherited coownership skips estate-division document inventory", async () => {
  const provider = new OpenAiLegalGuideProvider({
    apiKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ questions: [
        { question: "상속재산 분할과 관련된 문서가 있나요? 어떤 문서인지 알려주세요.", helpText: "예: 상속재산 목록, 유언장 등", type: "long_text", required: true },
        { question: "현재 토지는 누가 사용하고 있나요?", type: "long_text", required: true },
        { question: "토지를 현물로 나누거나 매각하는 방법 중 어떤 방식을 원하나요?", type: "long_text", required: true },
      ] }) } }],
    }), { status: 200, headers: { "content-type": "application/json" } }),
  });
  const input = "상속재산인 토지를 형제들과 공동으로 소유하고 있습니다. 합의가 되지 않으면 법원을 통해 분할할 수 있나요?";
  const response = await provider.createQuestions(classifyLegalQuestion(input), {
    sessionId: "registered-inherited-coownership",
    initialQuestionRedacted: input,
    answers: [],
    promptVersion: "test",
  });

  assert.equal(response.data.some((item) => /상속재산\s*분할.*문서/.test(item.question)), false);
  assert.ok(response.data.some((item) => /등기부상.*지분/.test(item.question)));
  assert.ok(response.data.some((item) => /누가 사용/.test(item.question)));
  assert.ok(response.data.some((item) => /현물.*매각/.test(item.question)));
});

test("unit/provider: administrative remedy comparison does not assume a procedure is underway", async () => {
  const provider = new OpenAiLegalGuideProvider({
    apiKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ questions: [
        { question: "현재 행정심판 또는 행정소송 중 어느 절차를 진행하고 있나요?", helpText: "예: 행정심판 진행 중", type: "boolean", required: true },
        { question: "현재 가지고 있는 서류나 증거의 종류와 내용을 구체적으로 적어주세요.", helpText: "예: 판결문, 계약서, 계좌내역", type: "long_text", required: true },
        { question: "영업정지 처분서를 받은 날짜는 언제인가요?", type: "date", required: true },
        { question: "영업정지 기간과 처분 사유는 어떻게 기재되어 있나요?", type: "long_text", required: true },
        { question: "영업정지가 바로 시작되어 긴급히 집행을 멈출 필요가 있나요?", type: "boolean", required: true },
      ] }) } }],
    }), { status: 200, headers: { "content-type": "application/json" } }),
  });
  const input = "음식점 영업정지 처분을 받았습니다. 행정심판과 행정소송 중 어떤 절차로 다투는 것이 좋나요?";
  const response = await provider.createQuestions(classifyLegalQuestion(input), {
    sessionId: "administrative-remedy-comparison",
    initialQuestionRedacted: input,
    answers: [],
    promptVersion: "test",
  });

  assert.equal(response.data.some((item) => /현재.*행정심판.*행정소송.*어느.*진행/.test(item.question)), false);
  const documentQuestion = response.data.find((item) => /영업정지 처분과 관련해 받은 문서/.test(item.question));
  assert.match(documentQuestion?.helpText ?? "", /영업정지 처분서.*영업정지 처분결정서.*사전통지서.*청문통지서/);
  assert.doesNotMatch(documentQuestion?.helpText ?? "", /판결문|계약서|계좌내역/);
  assert.ok(response.data.some((item) => /처분서를 받은 날짜/.test(item.question) && item.type === "date"));
  assert.ok(response.data.some((item) => /영업정지 기간.*처분 사유/.test(item.question)));
  assert.ok(response.data.some((item) => /집행을 멈출/.test(item.question)));
});

test("unit/provider: public-official discipline asks the current procedural stage", async () => {
  const provider = new OpenAiLegalGuideProvider({
    apiKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ questions: [
        { question: "징계 사유는 무엇인가요?", type: "long_text", required: true },
        { question: "받은 문서의 내용을 적어주세요.", type: "long_text", required: true },
        { question: "원하는 결과는 무엇인가요?", type: "long_text", required: true },
      ] }) } }],
    }), { status: 200, headers: { "content-type": "application/json" } }),
  });
  const input = "공무원 징계 절차에 어떻게 대응해야 하는지 상담받고 싶습니다.";
  const response = await provider.createQuestions(classifyLegalQuestion(input), {
    sessionId: "discipline-stage",
    initialQuestionRedacted: input,
    answers: [],
    promptVersion: "test",
  });

  const stageQuestion = response.data.find((item) => /징계 절차가 어느 단계/.test(item.question));
  assert.equal(stageQuestion?.type, "single_choice");
  assert.deepEqual(stageQuestion?.options?.map((item) => item.value), [
    "before-discipline-decision",
    "after-decision-before-appeal",
    "appeal-pending",
    "after-appeal-before-lawsuit",
    "administrative-lawsuit-pending",
  ]);
});

test("unit: public-official discipline result follows the selected procedural stage", () => {
  const input = "공무원 징계 처분에 불복하려고 합니다.";
  const questions = [{
    id: "ai-followup-1", field: "aiFollowup1", category: "administrative", order: 1, type: "single_choice",
    question: "현재 공무원 징계 절차가 어느 단계인가요?", required: true,
    options: [{ value: "after-appeal-before-lawsuit", label: "소청심사 결정 후·행정소송 제기 전" }],
  }];
  const result = buildAiGuideResult("discipline-after-appeal", input, classifyLegalQuestion(input), [
    answer("ai-followup-1", "aiFollowup1", "after-appeal-before-lawsuit"),
  ], questions);

  assert.ok(result.missingInformation.some((item) => /소청심사 결정서를 받은 날짜/.test(item)));
  assert.ok(result.recommendedDocuments.some((item) => /소청심사 결정서.*수령일/.test(item)));
  assert.match(result.consultationOpinion ?? "", /행정소송 제기/);
  assert.match(result.consultationOpinion ?? "", /변호사.*상담/);
});

test("unit: registered inherited land uses a co-owned-property partition result", () => {
  const input = "상속재산인 토지를 형제들과 공동으로 소유하고 있습니다. 합의가 되지 않으면 법원을 통해 분할할 수 있나요?";
  const result = buildAiGuideResult("co-owned-land-partition", input, classifyLegalQuestion(input), []);

  assert.equal(result.classification.category, "civil");
  assert.equal(result.classification.subcategory, "co-owned-property-division");
  assert.match(result.consultationOpinion ?? "", /공유물분할청구소송/);
  assert.ok(result.missingInformation.some((item) => /등기부상.*지분/.test(item)));
  assert.ok(result.missingInformation.some((item) => /현물분할.*지분 매수.*매각/.test(item)));
  assert.ok(result.recommendedDocuments.some((item) => /등기사항증명서/.test(item)));
  assert.equal(result.missingInformation.some((item) => /상속인|상속재산.*목록|기여분|특별수익/.test(item)), false);
  assert.equal(result.recommendedDocuments.some((item) => /유언장|상속재산.*목록|가족관계/.test(item)), false);
});

test("unit/provider: reserved-share questions use objective dates instead of a decision date", async () => {
  const provider = new OpenAiLegalGuideProvider({
    apiKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify({ questions: [
        { question: "다른 자녀가 유류분 청구를 하기로 결정한 날짜는 언제인가요?", helpText: "예: 2023년 10월 1일", type: "date", required: true },
        { question: "부모님이 돌아가신 날짜는 언제인가요?", type: "date", required: true },
        { question: "다른 자녀에게 재산을 증여한 사실을 언제 처음 알게 되었나요?", type: "date", required: true },
        { question: "증여된 재산의 종류와 대략적인 가액은 얼마인가요?", type: "long_text", required: true },
      ] }) } }],
    }), { status: 200, headers: { "content-type": "application/json" } }),
  });
  const input = "부모님이 생전에 대부분의 재산을 한 자녀에게 증여했습니다. 다른 자녀가 유류분을 청구할 수 있나요?";
  const response = await provider.createQuestions(classifyLegalQuestion(input), {
    sessionId: "reserved-share-objective-dates",
    initialQuestionRedacted: input,
    answers: [],
    promptVersion: "test",
  });

  assert.equal(response.data.some((item) => /유류분.{0,12}(?:결정|하기로)/.test(item.question)), false);
  assert.ok(response.data.some((item) => /돌아가신 날짜/.test(item.question)));
  assert.ok(response.data.some((item) => /증여한 사실.*처음 알게/.test(item.question)));
  assert.ok(response.data.some((item) => /재산의 종류.*가액/.test(item.question)));
});

test("unit: construction payment guidance excludes lease and sale materials", () => {
  const input = "공사를 완료했는데 상대방이 천장 누수 하자를 주장하며 공사대금 지급을 거절하고 있습니다.";
  const result = buildAiGuideResult("construction-payment", input, classifyLegalQuestion(input), []);
  assert.ok(result.missingInformation.some((item) => /총 공사대금|받지 못한 금액/.test(item)));
  assert.ok(result.missingInformation.some((item) => /하자의 원인|시공 범위/.test(item)));
  assert.ok(result.recommendedDocuments.some((item) => /공사도급계약서|견적서|공사내역서/.test(item)));
  assert.ok(result.recommendedDocuments.some((item) => /기성내역서|미지급액 계산표/.test(item)));
  assert.equal(result.missingInformation.some((item) => /부동산·임대차|점유·사용·대금 지급 경위/.test(item)), false);
  assert.equal(result.recommendedDocuments.some((item) => /등기사항증명서|건축물대장|임대차·매매|보증금/.test(item)), false);
});

test("unit: lease deposit return guidance excludes generic contract and construction materials", () => {
  const input = "임대차계약이 종료되었고 집주인에게 보증금 3,000만 원 반환을 요청했지만 돌려받지 못했습니다.";
  const result = buildAiGuideResult("lease-deposit-return", input, classifyLegalQuestion(input), []);
  assert.ok(result.missingInformation.some((item) => /열쇠를 반환|즉시 반환할 준비/.test(item)));
  assert.ok(result.missingInformation.some((item) => /차임·관리비·공과금|공제될 금액/.test(item)));
  assert.ok(result.recommendedDocuments.some((item) => /임대차계약서/.test(item)));
  assert.ok(result.recommendedDocuments.some((item) => /보증금 지급/.test(item)));
  assert.ok(result.recommendedDocuments.some((item) => /보증금 반환을 요청/.test(item)));
  assert.equal(result.missingInformation.some((item) => /차용증|계약 내용과 체결일|각 당사자가 이행|위반 시점|해제·해지 또는 이행/.test(item)), false);
  assert.equal(result.recommendedDocuments.some((item) => /견적서|발주서|공사 계약|손해 발생 자료/.test(item)), false);
});

test("screen-contract: AI date questions name the event without redundant explanation questions", () => {
  const runtime = fs.readFileSync(path.join(projectRoot, "src/lib/ai/provider-runtime.ts"), "utf8");
  const provider = fs.readFileSync(path.join(projectRoot, "src/lib/ai/openai-provider.ts"), "utf8");
  assert.doesNotMatch(runtime, /방금 입력한 날짜에는 어떤 일이 있었고/);
  assert.match(provider, /Every date question must name the exact event/);
  assert.match(provider, /do not ask a follow-up about what happened on that date/);
});

test("unit/provider: OpenAI provider fails on timeout and invalid JSON", async () => {
  const timeoutProvider = new OpenAiLegalGuideProvider({
    apiKey: "test-key",
    timeoutMs: 1,
    maxRetries: 0,
    fetchImpl: async (_url, init) =>
      new Promise((resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
        setTimeout(() => resolve(new Response("{}", { status: 200 })), 20);
      }),
  });
  const rule = classifyLegalQuestion("대여금 상담입니다.");
  await assert.rejects(
    () =>
      timeoutProvider.classify("대여금 상담입니다.", rule, {
        sessionId: "provider-timeout",
        initialQuestionRedacted: "대여금 상담입니다.",
        answers: [],
        promptVersion: "test",
      }),
    /timeout|aborted/i,
  );

  const invalidJsonProvider = new OpenAiLegalGuideProvider({
    apiKey: "test-key",
    maxRetries: 0,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: "{not-json" } }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
  });
  await assert.rejects(
    () =>
      invalidJsonProvider.classify("대여금 상담입니다.", rule, {
        sessionId: "provider-invalid-json",
        initialQuestionRedacted: "대여금 상담입니다.",
        answers: [],
        promptVersion: "test",
      }),
    /invalid_json/i,
  );
});

test("unit/provider: generative rate limit and budget limit are enforced", () => {
  clearGenerativeUsage();
  const originalDailyLimit = process.env.AI_DAILY_REQUEST_LIMIT;
  const originalDailyBudget = process.env.AI_DAILY_BUDGET_USD;
  const originalMonthlyBudget = process.env.AI_MONTHLY_BUDGET_USD;
  process.env.AI_DAILY_REQUEST_LIMIT = "1";
  process.env.AI_DAILY_BUDGET_USD = "0.0001";
  process.env.AI_MONTHLY_BUDGET_USD = "0.0001";
  assert.equal(canUseGenerativeAi().allowed, true);
  recordGenerativeUsage({ estimatedCostUsd: 0.0002 });
  const limited = canUseGenerativeAi();
  assert.equal(limited.allowed, false);
  assert.ok(["rate_limit", "daily_budget", "monthly_budget"].includes(limited.reason));
  process.env.AI_DAILY_REQUEST_LIMIT = originalDailyLimit;
  process.env.AI_DAILY_BUDGET_USD = originalDailyBudget;
  process.env.AI_MONTHLY_BUDGET_USD = originalMonthlyBudget;
  clearGenerativeUsage();
});

test("integration: creates AI session, stores answers, creates final result and transfer token", async () => {
  const session = await saveAiGuideSession(makeSession());
  assert.ok(getLocalAiGuideSession(session.id));

  const withAnswer = await updateAiGuideSession({
    ...session,
    status: "questioning",
    answers: [answer("civil-dispute-type", "disputeType", "debt")],
  });
  assert.equal(getLocalAiGuideSession(withAnswer.id)?.answers.length, 1);

  const result = buildAiGuideResult(withAnswer.id, withAnswer.initialQuestionRedacted, withAnswer.classification, withAnswer.answers);
  const transferToken = createTransferToken(withAnswer.id, withAnswer.publicToken);
  const transferred = await updateAiGuideSession({
    ...withAnswer,
    status: "transferred",
    result,
    consentToTransfer: true,
    transferToken,
  });

  const transferSession = await getAiGuideSessionByTransferToken(transferToken);
  assert.equal(transferSession?.id, transferred.id);
  assert.ok(transferSession?.result?.consultationSummary);
});

test("integration: consultation submission keeps AI summary for admin detail rendering", () => {
  const classification = classifyLegalQuestion("대여금 상담입니다.");
  const result = buildAiGuideResult("summary-session", "대여금 상담입니다.", classification, [
    answer("civil-dispute-type", "disputeType", "debt"),
  ]);
  const submission = saveConsultationSubmission(
    {
      name: "홍길동",
      phone: "010-1111-2222",
      category: "civil",
      message: "AI 상담요약 포함",
      privacyAgreed: true,
      source: "ai-guide",
      aiTransferToken: "transfer-test",
      aiSummary: result.consultationSummary,
    },
    "ZEU-TEST-0001",
  );

  assert.equal(submission.source, "ai-guide");
  assert.equal(submission.aiSummary?.category, "civil");
  assert.equal(submission.aiSummary?.userQuestion, "대여금 상담입니다.");
  assert.ok(submission.aiSummary?.confirmedFacts.length);
});

test("screen-contract: admin shows AI field statistics and original questions", () => {
  const adminSource = fs.readFileSync(path.join(projectRoot, "src/components/admin/ConsultationsPage.tsx"), "utf8");
  assert.match(adminSource, /selected\.aiSummary\.categoryLabel/);
  assert.match(adminSource, /selected\.aiSummary\.subcategoryLabel/);
  assert.match(adminSource, /분야별 상담 현황/);
  assert.match(adminSource, /admin-consultation-question-preview/);
  assert.match(adminSource, /상담자가 처음 입력한 질문/);
  assert.match(adminSource, /getAiOriginalQuestion\(selected\)/);
  assert.match(adminSource, /기존 접수 건으로 최초 질문이 저장되어 있지 않습니다/);
});

test("integration/security: blocks invalid, expired, and non-consented transfer access", async () => {
  assert.equal(getLocalAiGuideSession("missing-session-id"), undefined);
  assert.equal(await getAiGuideSessionByTransferToken("missing-transfer-token"), undefined);

  const expiredToken = createTransferToken();
  await saveAiGuideSession(
    makeSession({
      id: createAiSessionId(),
      status: "transferred",
      result: buildAiGuideResult("expired", "대여금", classifyLegalQuestion("대여금"), []),
      consentToTransfer: true,
      transferToken: expiredToken,
      expiresAt: addDays(-1),
    }),
  );
  assert.equal(await getAiGuideSessionByTransferToken(expiredToken), undefined);

  const noConsentToken = createTransferToken();
  await saveAiGuideSession(
    makeSession({
      id: createAiSessionId(),
      status: "transferred",
      result: buildAiGuideResult("no-consent", "대여금", classifyLegalQuestion("대여금"), []),
      consentToTransfer: false,
      transferToken: noConsentToken,
    }),
  );
  const noConsentSession = await getAiGuideSessionByTransferToken(noConsentToken);
  assert.equal(Boolean(noConsentSession?.consentToTransfer), false);
});

test("integration/security: blocks another browser from reusing a session id", () => {
  const session = makeSession({
    id: "11111111-1111-4111-8111-111111111111",
    publicToken: "owner-browser-token",
  });
  const ownerRequest = {
    cookies: {
      get: (name) =>
        name === `zeu_ai_session_${session.id}` ? { value: "owner-browser-token" } : undefined,
    },
  };
  const otherBrowserRequest = {
    cookies: {
      get: () => undefined,
    },
  };
  const forgedBrowserRequest = {
    cookies: {
      get: (name) =>
        name === `zeu_ai_session_${session.id}` ? { value: "wrong-token" } : undefined,
    },
  };

  assert.equal(isAiSessionOwner(ownerRequest, session), true);
  assert.equal(isAiSessionOwner(otherBrowserRequest, session), false);
  assert.equal(isAiSessionOwner(forgedBrowserRequest, session), false);
});

test("integration/security: Supabase RLS migration protects AI and consultation data", () => {
  const migration = fs.readFileSync(path.join(projectRoot, "supabase", "migrations", "010_ai_guide_core.sql"), "utf8");
  for (const table of [
    "consultations",
    "ai_guide_sessions",
    "ai_guide_answers",
    "ai_guide_results",
    "ai_guide_events",
    "ai_guide_feedback",
    "ai_safety_events",
  ]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(migration, /active admins read ai sessions/);
  assert.match(migration, /active admins manage consultations/);
  assert.doesNotMatch(migration, /anonymous read ai sessions/i);
  assert.doesNotMatch(migration, /anonymous read ai results/i);
});

test("integration/storage: Supabase-backed AI and consultation write paths exist", () => {
  const sessionStore = fs.readFileSync(path.join(projectRoot, "src", "lib", "ai", "session-store.ts"), "utf8");
  const consultationRoute = fs.readFileSync(path.join(projectRoot, "src", "app", "api", "consultations", "route.ts"), "utf8");
  const consultationValidation = fs.readFileSync(path.join(projectRoot, "src", "lib", "consultation-validation.ts"), "utf8");
  const aiSettingsRoute = fs.readFileSync(path.join(projectRoot, "src", "app", "api", "admin", "ai-settings", "route.ts"), "utf8");

  assert.match(sessionStore, /ai_guide_sessions/);
  assert.match(sessionStore, /ai_guide_answers/);
  assert.match(sessionStore, /ai_guide_results/);
  assert.match(sessionStore, /ai_guide_events/);
  assert.match(consultationRoute, /consultations/);
  assert.match(consultationRoute, /ai_session_id/);
  assert.match(consultationValidation, /\/api\/consultations/);
  assert.match(aiSettingsRoute, /generativeEnabled/);
});

test("screen-contract: AI guide includes fallback, transfer, and responsive CSS hooks", () => {
  const shell = fs.readFileSync(path.join(projectRoot, "src", "components", "ai-guide", "AiGuideShell.tsx"), "utf8");
  const css = fs.readFileSync(path.join(projectRoot, "src", "app", "globals.css"), "utf8");

  assert.match(shell, /uiState === "failed"/);
  assert.match(shell, /AI 요약 포함 상담신청/);
  assert.match(shell, /바로 상담 신청하기/);
  assert.match(shell, /간단 상담 의견/);
  assert.match(shell, /buildConsultationCtaComment\(result\)/);
  assert.match(shell, /result\.consultationOpinion/);
  assert.match(shell, /대여금 반환 청구를 검토할 수 있습니다|reviewTarget/);
  assert.match(shell, /getLegalReviewTarget/);
  assert.match(shell, /onClick=\{transferToConsultation\}/);
  assert.match(shell, /sectionComments/);
  assert.match(shell, /fallbackComment/);
  assert.match(shell, /<strong>AI 의견<\/strong>/);
  assert.match(shell, /softenResultItem/);
  assert.match(shell, /있는지 확인해주세요/);
  assert.match(shell, /있다면 준비해주세요/);
  assert.match(shell, /classified\.questions\.length === 0/);
  assert.match(shell, /setUiState\("start"\)/);
  assert.match(shell, /autoAdvanceChoice/);
  assert.doesNotMatch(shell, /사건 분야 직접 선택/);
  assert.match(shell, /<strong>입력 예시<\/strong>/);
  assert.match(shell, /<span key=\{starter\}>/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /\.ai-guide-question/);
});

test("screen-contract: every choice question advances immediately and requests time out safely", () => {
  const shell = fs.readFileSync(path.join(projectRoot, "src/components/ai-guide/AiGuideShell.tsx"), "utf8");
  assert.match(shell, /const autoAdvanceChoice = Boolean\(currentQuestion\?\.options\?\.length\)/);
  assert.match(shell, /controller\.abort\(\)/);
  assert.match(shell, /45_000/);
  assert.match(shell, /응답이 지연되고 있습니다/);
  assert.match(shell, /다시 질문하기/);
});

test("screen-contract: case filters preserve Next.js history state for card navigation", () => {
  const explorer = fs.readFileSync(
    path.join(projectRoot, "src/components/cases/CasesExplorer.tsx"),
    "utf8",
  );

  assert.match(
    explorer,
    /history\.replaceState\(window\.history\.state,\s*"",\s*next\)/,
  );
  assert.doesNotMatch(explorer, /history\.replaceState\(null,\s*"",\s*next\)/);
});

test("screen-contract: practice help links uncertain visitors to AI consultation", () => {
  const practicePage = fs.readFileSync(
    path.join(projectRoot, "src/app/practice/page.tsx"),
    "utf8",
  );

  assert.match(practicePage, /href=\{siteConfig\.links\.aiGuide\}/);
  assert.match(practicePage, /AI 상담으로 분야 찾기/);
});
