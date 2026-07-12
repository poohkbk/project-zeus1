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
const { getAiRelatedContent } = require("../src/lib/ai/content-retrieval.ts");

test("classifies civil debt questions", () => {
  const result = classifyLegalQuestion("돈을 빌려줬는데 못 받고 있습니다. 차용증과 계좌이체가 있습니다.");
  assert.equal(result.category, "civil");
  assert.equal(result.subcategory, "debt");
  assert.ok(result.matchedTags.includes("debt"));
});

test("classifies administrative disposition questions", () => {
  const result = classifyLegalQuestion("식당 영업정지 처분서를 받았습니다.");
  assert.equal(result.category, "administrative");
  assert.equal(result.subcategory, "business-suspension");
});

test("redacts sensitive personal data", () => {
  const result = redactSensitiveData("전화는 010-1234-5678 2024가단2345 test@example.com");
  assert.match(result.redacted, /\[전화번호 삭제\]/);
  assert.match(result.redacted, /\[사건번호 삭제\]/);
  assert.match(result.redacted, /\[이메일 삭제\]/);
});

test("shows conditional divorce custody question only with minor children", () => {
  const base = getQuestionsForCategory("divorce", []);
  assert.equal(base.some((question) => question.field === "custodyConcern"), true);
  const answers = upsertAnswer([], {
    questionId: "divorce-children",
    field: "minorChildrenCount",
    value: "none",
    answeredAt: new Date().toISOString(),
  });
  const questions = getQuestionsForCategory("divorce", answers);
  assert.equal(questions.some((question) => question.field === "custodyConcern"), false);
});

test("marks urgent criminal attendance dates", () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const urgency = evaluateUrgency("criminal", [
    {
      questionId: "criminal-attendance-date",
      field: "attendanceDate",
      value: tomorrow.toISOString().slice(0, 10),
      answeredAt: new Date().toISOString(),
    },
  ]);
  assert.equal(urgency.callFirst, true);
});

test("returns real related content without inventing cases", () => {
  const classification = classifyLegalQuestion("돈을 빌려줬는데 못 받고 있습니다.");
  const related = getAiRelatedContent(classification, []);
  assert.ok(related.cases.length > 0);
  assert.ok(related.cases.every((item) => item.href.startsWith("/cases/")));
});

test("builds a safe rule-based result", () => {
  const classification = classifyLegalQuestion("경찰에서 오늘 조사받으러 오라고 했습니다.");
  const result = buildAiGuideResult("session-test", "경찰에서 오늘 조사받으러 오라고 했습니다.", classification, []);
  assert.equal(result.generatedBy, "rule");
  assert.match(result.safetyNotice, /일반적인 법률정보/);
  assert.equal(result.urgency.callFirst, true);
});

test("creates a Korean consultation summary from masked AI answers", () => {
  const question = redactSensitiveData("대여금 010-1234-5678 차용증 계좌이체 증거가 있습니다.");
  const classification = classifyLegalQuestion(question.redacted);
  const result = buildAiGuideResult("session-transfer-test", question.redacted, classification, [
    {
      questionId: "civil-dispute-type",
      field: "disputeType",
      value: "debt",
      answeredAt: new Date().toISOString(),
    },
    {
      questionId: "civil-written-agreement",
      field: "writtenAgreementExists",
      value: "no",
      answeredAt: new Date().toISOString(),
    },
    {
      questionId: "civil-transfer-evidence",
      field: "transferEvidenceExists",
      value: "yes",
      answeredAt: new Date().toISOString(),
    },
    {
      questionId: "civil-message-evidence",
      field: "messageEvidenceExists",
      value: "no",
      answeredAt: new Date().toISOString(),
    },
  ]);

  assert.equal(result.consultationSummary.userQuestion.includes("010-1234-5678"), false);
  assert.ok(result.consultationSummary.availableEvidence.length > 0);
  assert.ok(result.consultationSummary.relatedContentIds.length > 0);
  assert.equal(result.consultationSummary.confirmedFacts.some((fact) => fact.includes("writtenAgreementExists")), false);
  assert.equal(result.consultationSummary.confirmedFacts.some((fact) => fact.includes("disputeType")), false);
  assert.ok(result.consultationSummary.confirmedFacts.some((fact) => fact.includes("문제 유형")));
  assert.ok(result.consultationSummary.availableEvidence.some((fact) => fact.includes("계좌이체")));
});
