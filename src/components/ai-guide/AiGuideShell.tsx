"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { siteConfig } from "@/config/site";
import { SimpleIcon } from "@/components/icons/SimpleIcon";
import type {
  AiClassificationResult,
  AiGuideAnswer,
  AiGuideQuestion,
  AiGuideResult,
  AiGuideUiState,
} from "@/types/ai-guide";

const starterQuestions = [
  "돈을 빌려줬는데 못 받고 있습니다.",
  "경찰에서 연락이 왔습니다.",
  "이혼하려고 합니다.",
  "상속포기하려고 합니다.",
  "영업정지 처분을 받았습니다.",
];

type SessionResponse = {
  sessionId: string;
  classification: AiClassificationResult;
  redactionFindings: string[];
  safetyGuidance?: {
    flags: string[];
    notices: string[];
  };
};

type ClassifyResponse = {
  classification: AiClassificationResult;
  questions: AiGuideQuestion[];
};

type AnswerResponse = {
  answers: AiGuideAnswer[];
  nextQuestion?: AiGuideQuestion;
  questions: AiGuideQuestion[];
  totalQuestions: number;
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) throw new Error(payload.message || "요청을 처리하지 못했습니다.");
  return payload as T;
}

function QuestionInput({
  question,
  value,
  onChange,
}: {
  question: AiGuideQuestion;
  value: string;
  onChange: (value: string) => void;
}) {
  if (question.options?.length) {
    return (
      <fieldset className="ai-choice-group">
        <legend className="sr-only">{question.question}</legend>
        {question.options.map((option) => (
          <label key={option.value} className="ai-choice-card">
            <input
              type="radio"
              name={question.id}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
            {option.description ? <small>{option.description}</small> : null}
          </label>
        ))}
      </fieldset>
    );
  }

  if (question.type === "date") {
    return (
      <input
        className="ai-guide-input"
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <textarea
      className="ai-guide-textarea"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      maxLength={2000}
    />
  );
}

export function AiGuideShell() {
  const router = useRouter();
  const [uiState, setUiState] = useState<AiGuideUiState>("start");
  const [question, setQuestion] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [questions, setQuestions] = useState<AiGuideQuestion[]>([]);
  const [answers, setAnswers] = useState<AiGuideAnswer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentValue, setCurrentValue] = useState("");
  const [result, setResult] = useState<AiGuideResult>();
  const [errorMessage, setErrorMessage] = useState("");
  const [redactionFindings, setRedactionFindings] = useState<string[]>([]);
  const [answerPending, setAnswerPending] = useState(false);

  const currentQuestion = questions[currentIndex];
  const progress = useMemo(() => {
    if (questions.length === 0) return 0;
    return Math.round((answers.length / questions.length) * 100);
  }, [answers.length, questions.length]);

  const autoAdvanceChoice = Boolean(
    currentQuestion?.options?.length &&
    currentQuestion.options.some((option) => option.value === "yes") &&
    currentQuestion.options.some((option) => option.value === "no") &&
    currentQuestion.options.every((option) => ["yes", "no", "unknown"].includes(option.value)),
  );

  async function startGuide() {
    setErrorMessage("");
    setUiState("classifying");
    try {
      const response = await postJson<SessionResponse>("/api/ai-guide/session", {
        question,
      });
      setSessionId(response.sessionId);
      setRedactionFindings(response.redactionFindings);
      if (response.safetyGuidance?.flags.length) {
        await createResult(response.sessionId);
        return;
      }
      const classified = await postJson<ClassifyResponse>("/api/ai-guide/classify", {
        sessionId: response.sessionId,
        category: response.classification.category,
      });
      setQuestions(classified.questions);
      setAnswers([]);
      setCurrentIndex(0);
      setCurrentValue("");
      if (classified.questions.length === 0) {
        await createResult(response.sessionId);
        return;
      }
      setUiState("questioning");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI 안내를 시작하지 못했습니다.");
      setUiState("failed");
    }
  }

  async function submitAnswer(valueOverride?: string) {
    const answerValue = valueOverride ?? currentValue;
    if (!sessionId || !currentQuestion || answerPending) return;
    setErrorMessage("");
    setAnswerPending(true);
    try {
      const response = await postJson<AnswerResponse>("/api/ai-guide/answer", {
        sessionId,
        questions,
        answer: {
          questionId: currentQuestion.id,
          field: currentQuestion.field,
          value: answerValue || null,
        },
      });
      setAnswers(response.answers);
      setQuestions(response.questions);
      const nextIndex = response.questions.findIndex((item) => item.id === response.nextQuestion?.id);
      if (nextIndex >= 0) {
        setCurrentIndex(nextIndex);
        const nextExisting = response.answers.find((answer) => answer.questionId === response.nextQuestion?.id);
        setCurrentValue(String(nextExisting?.value ?? ""));
        return;
      }
      await createResult();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "답변을 저장하지 못했습니다.");
    } finally {
      setAnswerPending(false);
    }
  }

  function changeAnswer(value: string) {
    setCurrentValue(value);
    if (autoAdvanceChoice) void submitAnswer(value);
  }

  async function createResult(targetSessionId = sessionId) {
    if (!targetSessionId) return;
    setUiState("analyzing");
    try {
      const response = await postJson<{ result: AiGuideResult }>("/api/ai-guide/result", {
        sessionId: targetSessionId,
        questions,
      });
      setResult(response.result);
      setUiState(response.result.urgency.callFirst ? "urgent" : "completed");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "결과를 만들지 못했습니다.");
      setUiState("failed");
    }
  }

  function goBack() {
    if (currentIndex <= 0) {
      setUiState("start");
      return;
    }
    const previousIndex = currentIndex - 1;
    const previousQuestion = questions[previousIndex];
    const previousAnswer = answers.find((answer) => answer.questionId === previousQuestion.id);
    setCurrentIndex(previousIndex);
    setCurrentValue(String(previousAnswer?.value ?? ""));
  }

  async function transferToConsultation() {
    if (!sessionId) return;
    setUiState("transferring");
    try {
      const response = await postJson<{ transferToken: string }>("/api/ai-guide/transfer", {
        sessionId,
        consent: true,
      });
      router.push(`/consultation?aiTransfer=${encodeURIComponent(response.transferToken)}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "상담신청으로 전달하지 못했습니다.");
      setUiState(result?.urgency.callFirst ? "urgent" : "completed");
    }
  }

  return (
    <section className="ai-guide" aria-live="polite">
      <div className="site-shell ai-guide-hero">
        <div>
          <span className="section-kicker">AI Legal Consultation</span>
          <h1>법률사무소 제우 AI 상담</h1>
          <p>
            상담 내용을 AI가 분석하고, 필요한 자료와 관련 콘텐츠를 정리해 상담 전 준비를 돕습니다.
            승소 여부나 처분 결과를 단정하지 않습니다.
          </p>
        </div>
        <aside>
          <strong>긴급 사건</strong>
          <p>오늘 조사, 구속, 압수수색, 접근금지, 행정처분 기한이 임박한 경우 전화상담을 먼저 이용해주세요.</p>
          <a href={siteConfig.phoneHref}>
            <SimpleIcon name="phone" />
            {siteConfig.phone}
          </a>
        </aside>
      </div>

      <div className="site-shell ai-guide-panel">
        {uiState === "start" || uiState === "classifying" ? (
          <div className="ai-guide-start">
            <h2>궁금한 내용을 입력해주세요.</h2>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value.slice(0, 1000))}
              placeholder="예: 돈을 빌려줬는데 못 받고 있습니다."
              maxLength={1000}
            />
            <div className="ai-starter-examples">
              <p><strong>입력 예시</strong> 아래 문장을 참고해 상황을 자유롭게 작성해주세요.</p>
              <div className="ai-starter-row" aria-label="상담 내용 입력 예시">
                {starterQuestions.map((starter) => (
                  <span key={starter}>{starter}</span>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={uiState === "classifying" || !question.trim()}
              onClick={() => startGuide()}
            >
              {uiState === "classifying" ? "분석 중..." : "질문하기"}
            </button>
          </div>
        ) : null}

        {uiState === "questioning" && currentQuestion ? (
          <div className="ai-guide-question">
            <div className="ai-progress">
              <span>{Math.min(currentIndex + 1, questions.length)} / {questions.length}</span>
              <i style={{ width: `${progress}%` }} />
            </div>
            <h2>{currentQuestion.question}</h2>
            {currentQuestion.helpText ? <p>{currentQuestion.helpText}</p> : null}
            {redactionFindings.length > 0 && currentIndex === 0 ? (
              <p className="ai-safety-note">개인정보로 보이는 항목을 가린 뒤 분석했습니다: {redactionFindings.join(", ")}</p>
            ) : null}
            <QuestionInput question={currentQuestion} value={currentValue} onChange={changeAnswer} />
            {errorMessage ? <p className="ai-guide-error-text">{errorMessage}</p> : null}
            <div className="ai-guide-actions">
              <button type="button" className="btn btn-secondary" onClick={goBack}>
                이전
              </button>
              {!autoAdvanceChoice ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={answerPending || (currentQuestion.required && !currentValue)}
                  onClick={() => submitAnswer()}
                >
                  {answerPending ? "저장 중..." : "다음"}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {uiState === "analyzing" || uiState === "transferring" ? (
          <div className="ai-guide-loading" aria-busy="true">
            <span className="section-kicker">분석 중</span>
            <h2>{uiState === "transferring" ? "상담신청으로 안전하게 전달하고 있습니다." : "관련 자료를 확인하고 있습니다."}</h2>
            <p>입력 내용은 마스킹된 요약으로만 처리합니다.</p>
          </div>
        ) : null}

        {(uiState === "completed" || uiState === "urgent") && result ? (
          <div className="ai-guide-result">
            {result.urgency.callFirst ? (
              <div className="ai-urgent-callout">
                <strong>전화상담 우선 권장</strong>
                <p>{result.urgency.reasons.join(" ")}</p>
                <a className="btn btn-accent" href={siteConfig.phoneHref}>
                  {siteConfig.phone} 전화상담
                </a>
              </div>
            ) : null}

            <header>
              <span className="section-kicker">분석 결과</span>
              <h2>
                {result.classification.categoryLabel}
                {result.classification.subcategoryLabel ? ` · ${result.classification.subcategoryLabel}` : ""}
              </h2>
              <p>{result.situationSummary}</p>
            </header>

            {(result.safetyWarnings?.length ?? 0) > 0 ? (
              <section className="ai-safety-alert" aria-label="안전 안내">
                <strong>안전 안내</strong>
                <ul>
                  {result.safetyWarnings.map((notice) => (
                    <li key={notice}>{notice}</li>
                  ))}
                </ul>
              </section>
            ) : null}

            {result.aiProviderNotice ? (
              <p className="ai-safety-note">{result.aiProviderNotice}</p>
            ) : null}

            <div className="ai-result-grid">
              <ResultList
                title="현재 확인된 내용"
                items={result.confirmedFacts}
                comment={result.sectionComments?.confirmedFacts}
                fallbackComment="확인된 사실을 바탕으로 사건의 핵심 쟁점과 대응 방향을 구체적으로 살펴볼 수 있습니다."
              />
              <ResultList
                title="추가 확인이 필요한 사항"
                items={result.missingInformation}
                comment={result.sectionComments?.missingInformation}
                fallbackComment="남은 사실에 따라 대응이 달라질 수 있으므로 변호사 상담으로 확인해보세요."
              />
              <ResultList
                title="준비하면 좋은 자료"
                items={result.recommendedDocuments}
                comment={result.sectionComments?.recommendedDocuments}
                fallbackComment="관련 자료를 준비하면 변호사가 사실관계와 대응 방향을 더 정확히 검토할 수 있습니다."
              />
            </div>
            <div className="ai-result-consultation-cta">
              <p>
                <strong>간단 상담 의견</strong>
                <span>{buildConsultationCtaComment(result)}</span>
              </p>
              <button type="button" className="btn btn-primary" onClick={transferToConsultation}>
                바로 상담 신청하기
              </button>
            </div>

            <section className="ai-result-section">
              <h3>일반적인 절차</h3>
              <div className="ai-process-row">
                {result.generalProcess.map((step) => (
                  <article key={step.title}>
                    <strong>{step.title}</strong>
                    <p>{step.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <RelatedSection title="관련 업무분야" items={result.relatedContent.practices} />
            <RelatedSection title="관련 승소사례" items={result.relatedContent.cases} />
            <RelatedSection title="관련 법률가이드" items={result.relatedContent.guides} />
            <RelatedSection title="FAQ" items={result.relatedContent.faqs} />

            <p className="ai-safety-note">{result.safetyNotice}</p>
            {errorMessage ? <p className="ai-guide-error-text">{errorMessage}</p> : null}
            <div className="ai-guide-actions">
              <a className="btn btn-secondary" href={siteConfig.phoneHref}>
                전화상담
              </a>
              <button type="button" className="btn btn-primary" onClick={transferToConsultation}>
                AI 요약 포함 상담신청
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setUiState("start")}>
                새 질문
              </button>
            </div>
          </div>
        ) : null}

        {uiState === "failed" ? (
          <div className="ai-guide-error">
            <span className="section-kicker">Fallback</span>
            <h2>현재 AI 법률안내 연결이 원활하지 않습니다.</h2>
            <p>{errorMessage || "선택하신 분야의 기본 안내와 상담신청은 계속 이용할 수 있습니다."}</p>
            <div className="ai-guide-actions">
              <button type="button" className="btn btn-primary" onClick={() => setUiState("start")}>
                기본 안내 계속하기
              </button>
              <a className="btn btn-secondary" href={siteConfig.phoneHref}>
                전화상담
              </a>
              <Link className="btn btn-outline" href="/consultation">
                온라인 상담신청
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function ResultList({
  title,
  items,
  comment,
  fallbackComment,
}: {
  title: string;
  items: string[];
  comment?: string;
  fallbackComment: string;
}) {
  const displayItems = items.map((item) => softenResultItem(title, item));
  return (
    <section className="ai-result-card">
      <h3>{title}</h3>
      <ul>
        {displayItems.length > 0
          ? displayItems.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)
          : <li>현재 입력 내용에서 확인할 항목이 없습니다.</li>}
      </ul>
      <p className="ai-result-card-comment">
        <strong>AI 의견</strong>
        {comment?.trim() || fallbackComment}
      </p>
    </section>
  );
}

function softenResultItem(title: string, item: string) {
  if (title === "추가 확인이 필요한 사항") {
    return item
      .replace(/확인이 필요합니다\.?$/, "확인해주세요.")
      .replace(/([이가]) 필요합니다\.?$/, "$1 있는지 확인해주세요.")
      .replace(/ 필요합니다\.?$/, " 있는지 확인해주세요.");
  }
  if (title === "준비하면 좋은 자료") {
    return item
      .replace(/([이가]) 필요합니다\.?$/, "$1 있다면 준비해주세요.")
      .replace(/ 필요합니다\.?$/, " 있다면 준비해주세요.");
  }
  return item;
}

function buildConsultationCtaComment(result: AiGuideResult) {
  const issueLabel = result.classification.subcategoryLabel || result.classification.categoryLabel;
  const reviewTarget = getLegalReviewTarget(result);
  const confirmed = result.confirmedFacts
    .filter((item) => !item.includes("아직 구체적으로 확인된"))
    .slice(0, 2)
    .map((item) => item.length > 75 ? `${item.slice(0, 72)}…` : item);

  if (confirmed.length === 0) {
    return `${issueLabel} 관련하여 ${reviewTarget} 가능성을 검토하는 것은 가능합니다. 구체적인 판단을 위해 사실관계와 자료를 더 확인해야 합니다.`;
  }

  return `${issueLabel} 관련하여 ${confirmed.join(" · ")} 내용이 확인되었습니다. 현재 내용으로 ${reviewTarget} 가능성을 검토하는 것은 가능합니다. 구체적인 판단은 변호사 상담에서 확인해보세요.`;
}

function getLegalReviewTarget(result: AiGuideResult) {
  const subcategory = result.classification.subcategory;
  if (subcategory === "debt") return "대여금 반환 청구";
  if (subcategory === "contract") return "계약 이행·해제 또는 손해배상 청구";
  if (subcategory === "damages") return "손해배상 청구";
  if (subcategory === "affair") return "상간자 손해배상 청구";
  if (subcategory === "property-division") return "이혼과 재산분할 청구";
  if (subcategory === "custody") return "친권·양육권·양육비 청구";
  if (subcategory === "renunciation") return "상속포기 신청";
  if (subcategory === "limited-acceptance") return "한정승인 신청";
  if (subcategory === "reserved-share") return "유류분 반환 청구";
  if (["business-suspension", "license-cancellation", "discipline", "administrative-appeal", "administrative-lawsuit"].includes(subcategory ?? "")) {
    return "행정처분 불복";
  }
  if (result.classification.category === "criminal") return "형사 고소 또는 방어 대응";
  if (result.classification.category === "divorce") return "이혼·가사 청구";
  if (result.classification.category === "inheritance") return "상속 관련 청구·신청";
  if (result.classification.category === "administrative") return "행정처분 불복";
  return "법적 대응";
}

function RelatedSection({ title, items }: { title: string; items: AiGuideResult["relatedContent"]["cases"] }) {
  if (items.length === 0) return null;
  return (
    <section className="ai-result-section">
      <h3>{title}</h3>
      <div className="ai-related-grid">
        {items.map((item) => (
          <Link key={item.id} href={item.href}>
            <span>{item.category}</span>
            <strong>{item.title}</strong>
            {item.excerpt ? <p>{item.excerpt}</p> : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
