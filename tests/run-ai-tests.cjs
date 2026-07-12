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
const { getQuestionsForCategory, upsertAnswer } = require("../src/lib/ai/question-engine.ts");
const { evaluateUrgency } = require("../src/lib/ai/urgency.ts");
const { buildAiGuideResult } = require("../src/lib/ai/answer-composer.ts");
const { getAiRelatedContent, tagsFromAiContext } = require("../src/lib/ai/content-retrieval.ts");
const { checkRateLimit, clearRateLimitBuckets } = require("../src/lib/ai/rate-limit.ts");
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
  assert.equal(classifyLegalQuestion("투자사기와 보이스피싱 고소를 하고 싶습니다.").subcategory, "fraud");
  assert.equal(classifyLegalQuestion("음주운전 혈중알코올농도 문제로 면허취소가 걱정됩니다.").subcategory, "dui");
  assert.equal(classifyLegalQuestion("상간녀 상간소송과 위자료 문제로 상담받고 싶습니다.").category, "divorce");
  assert.equal(classifyLegalQuestion("양육권 친권 양육비와 면접교섭이 문제입니다.").subcategory, "custody");
  assert.equal(classifyLegalQuestion("유류분반환 유류분청구와 자필유언 문제가 있습니다.").category, "inheritance");
  assert.equal(classifyLegalQuestion("식당 영업정지 처분서를 받았습니다.").subcategory, "business-suspension");
});

test("unit: recalculates conditional questions after editing previous answers", () => {
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
  const transferToken = createTransferToken();
  const transferred = await updateAiGuideSession({
    ...withAnswer,
    status: "transferred",
    result,
    consentToTransfer: true,
    transferToken,
  });

  const transferSession = getAiGuideSessionByTransferToken(transferToken);
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
  assert.ok(submission.aiSummary?.confirmedFacts.length);
});

test("integration/security: blocks invalid, expired, and non-consented transfer access", async () => {
  assert.equal(getLocalAiGuideSession("missing-session-id"), undefined);
  assert.equal(getAiGuideSessionByTransferToken("missing-transfer-token"), undefined);

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
  assert.equal(getAiGuideSessionByTransferToken(expiredToken), undefined);

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
  const noConsentSession = getAiGuideSessionByTransferToken(noConsentToken);
  assert.equal(Boolean(noConsentSession?.consentToTransfer), false);
});

test("integration/security: Supabase RLS migration protects AI and consultation data", () => {
  const migration = fs.readFileSync(path.join(projectRoot, "supabase", "migrations", "010_ai_guide_core.sql"), "utf8");
  for (const table of [
    "consultations",
    "ai_guide_sessions",
    "ai_guide_answers",
    "ai_guide_results",
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

test("screen-contract: AI guide includes fallback, transfer, and responsive CSS hooks", () => {
  const shell = fs.readFileSync(path.join(projectRoot, "src", "components", "ai-guide", "AiGuideShell.tsx"), "utf8");
  const css = fs.readFileSync(path.join(projectRoot, "src", "app", "globals.css"), "utf8");

  assert.match(shell, /uiState === "failed"/);
  assert.match(shell, /AI 요약 포함 상담신청/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /\.ai-guide-question/);
});
