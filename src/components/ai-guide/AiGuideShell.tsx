"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { aiCategoryOptions } from "@/data/ai/categories";
import { siteConfig } from "@/config/site";
import { SimpleIcon } from "@/components/icons/SimpleIcon";
import type {
  AiClassificationResult,
  AiGuideAnswer,
  AiGuideQuestion,
  AiGuideResult,
  AiGuideUiState,
  AiLegalCategory,
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
  const [selectedCategory, setSelectedCategory] = useState<AiLegalCategory | "">("");
  const [sessionId, setSessionId] = useState("");
  const [classification, setClassification] = useState<AiClassificationResult>();
  const [questions, setQuestions] = useState<AiGuideQuestion[]>([]);
  const [answers, setAnswers] = useState<AiGuideAnswer[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentValue, setCurrentValue] = useState("");
  const [result, setResult] = useState<AiGuideResult>();
  const [errorMessage, setErrorMessage] = useState("");
  const [redactionFindings, setRedactionFindings] = useState<string[]>([]);

  const currentQuestion = questions[currentIndex];
  const progress = useMemo(() => {
    if (questions.length === 0) return 0;
    return Math.round((answers.length / questions.length) * 100);
  }, [answers.length, questions.length]);

  async function startGuide(category?: AiLegalCategory) {
    setErrorMessage("");
    setUiState("classifying");
    try {
      const response = await postJson<SessionResponse>("/api/ai-guide/session", {
        question,
        category: category || selectedCategory || undefined,
      });
      setSessionId(response.sessionId);
      setClassification(response.classification);
      setRedactionFindings(response.redactionFindings);
      if (response.safetyGuidance?.flags.length) {
        await createResult(response.sessionId);
        return;
      }
      setUiState("confirming_category");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "AI 안내를 시작하지 못했습니다.");
      setUiState("failed");
    }
  }

  async function confirmCategory(category?: AiLegalCategory) {
    if (!sessionId || !classification) return;
    setErrorMessage("");
    setUiState("classifying");
    try {
      const response = await postJson<ClassifyResponse>("/api/ai-guide/classify", {
        sessionId,
        category: category ?? classification.category,
      });
      setClassification(response.classification);
      setQuestions(response.questions);
      setAnswers([]);
      setCurrentIndex(0);
      setCurrentValue("");
      setUiState("questioning");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "분류를 확정하지 못했습니다.");
      setUiState("failed");
    }
  }

  async function submitAnswer() {
    if (!sessionId || !currentQuestion) return;
    setErrorMessage("");
    try {
      const response = await postJson<AnswerResponse>("/api/ai-guide/answer", {
        sessionId,
        answer: {
          questionId: currentQuestion.id,
          field: currentQuestion.field,
          value: currentValue || null,
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
    }
  }

  async function createResult(targetSessionId = sessionId) {
    if (!targetSessionId) return;
    setUiState("analyzing");
    try {
      const response = await postJson<{ result: AiGuideResult }>("/api/ai-guide/result", { sessionId: targetSessionId });
      setResult(response.result);
      setUiState(response.result.urgency.callFirst ? "urgent" : "completed");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "결과를 만들지 못했습니다.");
      setUiState("failed");
    }
  }

  function goBack() {
    if (currentIndex <= 0) {
      setUiState("confirming_category");
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
          <span className="section-kicker">AI Legal Guide</span>
          <h1>법률사무소 제우 AI 법률안내</h1>
          <p>
            사건 분야를 먼저 나누고, 필요한 자료와 관련 콘텐츠를 정리해 상담 전 준비를 돕습니다.
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
            <div className="ai-category-grid" aria-label="사건 분야 직접 선택">
              {aiCategoryOptions.map((category) => (
                <button
                  type="button"
                  key={category.value}
                  data-active={selectedCategory === category.value}
                  onClick={() => setSelectedCategory(category.value)}
                >
                  {category.label}
                </button>
              ))}
            </div>
            <div className="ai-starter-row">
              {starterQuestions.map((starter) => (
                <button type="button" key={starter} onClick={() => setQuestion(starter)}>
                  {starter}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={uiState === "classifying" || (!question.trim() && !selectedCategory)}
              onClick={() => startGuide()}
            >
              {uiState === "classifying" ? "분석 중..." : "질문하기"}
            </button>
          </div>
        ) : null}

        {uiState === "confirming_category" && classification ? (
          <div className="ai-guide-confirm">
            <span className="section-kicker">분류 확인</span>
            <h2>{classification.categoryLabel} {classification.subcategoryLabel ? `· ${classification.subcategoryLabel}` : ""}</h2>
            <p>{classification.reasonSummary}</p>
            {redactionFindings.length > 0 ? (
              <p className="ai-safety-note">개인정보로 보이는 항목을 가린 뒤 분석했습니다: {redactionFindings.join(", ")}</p>
            ) : null}
            <div className="ai-guide-actions">
              <button className="btn btn-primary" type="button" onClick={() => confirmCategory()}>
                맞습니다
              </button>
              <div className="ai-category-grid compact">
                {aiCategoryOptions.map((category) => (
                  <button type="button" key={category.value} onClick={() => confirmCategory(category.value)}>
                    {category.label}
                  </button>
                ))}
              </div>
            </div>
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
            <QuestionInput question={currentQuestion} value={currentValue} onChange={setCurrentValue} />
            {errorMessage ? <p className="ai-guide-error-text">{errorMessage}</p> : null}
            <div className="ai-guide-actions">
              <button type="button" className="btn btn-secondary" onClick={goBack}>
                이전
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={currentQuestion.required && !currentValue}
                onClick={submitAnswer}
              >
                다음
              </button>
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

            <div className="ai-result-grid">
              <ResultList title="현재 확인된 내용" items={result.confirmedFacts} />
              <ResultList title="추가 확인이 필요한 사항" items={result.missingInformation} />
              <ResultList title="준비하면 좋은 자료" items={result.recommendedDocuments} />
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

function ResultList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="ai-result-card">
      <h3>{title}</h3>
      <ul>
        {items.length > 0 ? items.map((item) => <li key={item}>{item}</li>) : <li>추가 확인이 필요합니다.</li>}
      </ul>
    </section>
  );
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
