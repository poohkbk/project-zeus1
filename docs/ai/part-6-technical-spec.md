# 법률사무소 제우 AI 법률안내 시스템 PRD

## Part 6. 시스템 구조 · DB 구조 · API · 완료 기준

### Codex 구현 명세 v1.0

---

# 1. 문서 목적

이 문서는 법률사무소 제우 홈페이지에 탑재할 **AI 법률안내 MVP**를 Codex가 실제 코드로 구현하기 위한 기술 명세다.

구현 대상은 다음 다섯 분야다.

* 민사
* 형사
* 이혼·가사
* 상속
* 행정

AI는 사용자의 질문을 바탕으로 사건 분야를 추정하고, 추가 질문을 제시하며, 준비자료와 일반적인 절차를 안내한다. 이후 제우 홈페이지의 관련 업무분야·승소사례·법률가이드·FAQ를 추천하고 기존 상담신청 기능으로 연결한다.

AI는 개별 사건의 결론, 승소 가능성, 형량, 처분 결과를 단정해서는 안 된다.

---

# 2. MVP 구현 범위

## 2.1 이번 단계에서 구현할 기능

1. `/tools/ai-guide` 사용자 화면
2. 자유질문 입력
3. 민사·형사·이혼·상속·행정 사건분류
4. 사용자의 분류 확인 및 수정
5. 분야별 단계형 추가 질문
6. 답변 임시저장
7. 확인된 사실 요약
8. 추가로 확인할 사항 안내
9. 준비자료 안내
10. 일반적인 절차 안내
11. 태그 기반 관련 콘텐츠 추천
12. 상담신청으로 안전하게 결과 전달
13. 관리자 상담 상세화면에 AI 요약 표시
14. 이용내역·오류·전환 로그
15. 개인정보 마스킹
16. 위험 질문 분류
17. 긴급 사건의 전화상담 우선 전환
18. AI API 실패 시 규칙 기반 안내
19. 모바일·태블릿·PC 반응형
20. 기본 평가 테스트

## 2.2 이번 단계에서 제외할 기능

* 판결문 PDF 분석
* OCR
* 소장·답변서·준비서면 분석
* 비공개 사건자료 벡터 검색
* 음성 상담
* 승소 확률 계산
* 형량 예측
* 자동 법률문서 작성
* AI의 콘텐츠 자동 공개
* 사용자의 대화 내용을 모델 학습 데이터로 자동 등록
* 상담자의 파일 업로드
* 완전한 자율형 챗봇

이 기능들은 2차 또는 3차 개발에서 추가한다.

---

# 3. 전체 시스템 구조

```text
사용자 브라우저
        │
        ▼
Next.js 사용자 화면
/tools/ai-guide
        │
        ├─ 질문 입력
        ├─ 단계형 문답
        ├─ 결과 표시
        └─ 상담신청 연결
        │
        ▼
Next.js Server Action / Route Handler
        │
        ├─ 입력값 검증
        ├─ 개인정보 마스킹
        ├─ 위험도 분석
        ├─ 규칙 기반 분류
        ├─ AI 공급자 호출
        ├─ 구조화 응답 검증
        └─ 오류 시 규칙 기반 Fallback
        │
        ▼
AI Orchestrator
        │
        ├─ Classification Service
        ├─ Question Flow Service
        ├─ Safety Service
        ├─ Content Retrieval Service
        ├─ Answer Composer
        └─ Consultation Summary Service
        │
        ├──────────────────────────────┐
        ▼                              ▼
OpenAI API                       Supabase
구조화된 분석                    PostgreSQL
                                 업무분야
                                 승소사례
                                 법률가이드
                                 FAQ
                                 상담
                                 AI 세션·로그
        │                              │
        └───────────┬──────────────────┘
                    ▼
             AI 법률안내 결과
                    │
                    ▼
              상담신청 연결
                    │
                    ▼
              관리자 CMS 확인
```

---

# 4. 기술 구성

## 4.1 프론트엔드

* Next.js App Router
* React
* TypeScript strict
* Tailwind CSS
* React Server Components 우선
* 대화형 질문 영역만 Client Component
* 기존 디자인 시스템 재사용
* 기존 `MobileQuickBar`와 상담 CTA 재사용

## 4.2 백엔드

* Next.js Route Handlers 또는 Server Actions
* Supabase PostgreSQL
* Supabase Auth
* Supabase Row Level Security
* 향후 Supabase `pgvector` 확장 가능
* 외부 AI 호출은 서버에서만 수행

## 4.3 AI

초기 구현:

* 규칙 기반 사건분류
* 태그 기반 콘텐츠 검색
* OpenAI API를 통한 보조 분석
* JSON 구조화 응답
* API 오류 시 규칙 기반 Fallback

향후 구현:

* 임베딩
* 하이브리드 검색
* RAG
* 판결문·사건자료 전용 비공개 지식 저장소

---

# 5. 권장 파일 구조

```text
src/
├─ app/
│  ├─ tools/
│  │  └─ ai-guide/
│  │     ├─ page.tsx
│  │     ├─ loading.tsx
│  │     └─ error.tsx
│  │
│  ├─ api/
│  │  └─ ai-guide/
│  │     ├─ classify/route.ts
│  │     ├─ answer/route.ts
│  │     ├─ session/route.ts
│  │     └─ feedback/route.ts
│  │
│  └─ admin/
│     └─ consultations/
│        └─ [id]/
│           └─ page.tsx
│
├─ components/
│  └─ ai-guide/
│     ├─ AiGuideShell.tsx
│     ├─ AiGuideStart.tsx
│     ├─ FreeQuestionInput.tsx
│     ├─ CategoryConfirm.tsx
│     ├─ QuestionStep.tsx
│     ├─ AnswerOptions.tsx
│     ├─ ProgressIndicator.tsx
│     ├─ AnalysisLoading.tsx
│     ├─ AiGuideResult.tsx
│     ├─ ConfirmedFacts.tsx
│     ├─ MissingInformation.tsx
│     ├─ DocumentChecklist.tsx
│     ├─ GeneralProcess.tsx
│     ├─ RelatedCases.tsx
│     ├─ RelatedGuides.tsx
│     ├─ RelatedFaqs.tsx
│     ├─ UrgentCallout.tsx
│     ├─ SafetyNotice.tsx
│     ├─ AiFallback.tsx
│     ├─ FeedbackPanel.tsx
│     └─ ConsultationTransfer.tsx
│
├─ lib/
│  └─ ai/
│     ├─ orchestrator.ts
│     ├─ provider.ts
│     ├─ openai-provider.ts
│     ├─ rule-provider.ts
│     ├─ classifier.ts
│     ├─ question-engine.ts
│     ├─ answer-composer.ts
│     ├─ safety.ts
│     ├─ urgency.ts
│     ├─ redaction.ts
│     ├─ content-retrieval.ts
│     ├─ consultation-summary.ts
│     ├─ schemas.ts
│     ├─ errors.ts
│     └─ rate-limit.ts
│
├─ data/
│  └─ ai/
│     ├─ categories.ts
│     ├─ taxonomy.ts
│     ├─ question-flows.ts
│     ├─ document-checklists.ts
│     ├─ process-guides.ts
│     ├─ urgency-rules.ts
│     └─ fallback-answers.ts
│
├─ repositories/
│  ├─ ai-sessions.ts
│  ├─ ai-events.ts
│  ├─ ai-feedback.ts
│  ├─ consultations.ts
│  └─ public-content.ts
│
├─ types/
│  ├─ ai-guide.ts
│  ├─ ai-session.ts
│  ├─ ai-safety.ts
│  └─ ai-content.ts
│
└─ validators/
   └─ ai-guide.ts

supabase/
└─ migrations/
   ├─ 010_ai_guide_core.sql
   ├─ 011_ai_guide_rls.sql
   ├─ 012_ai_guide_indexes.sql
   └─ 013_ai_guide_seed.sql

docs/
├─ ai-system-architecture.md
├─ ai-safety-policy.md
├─ ai-question-flow.md
├─ ai-api-reference.md
└─ ai-operations-guide.md
```

기존 프로젝트에 동일한 역할의 폴더나 파일이 있다면 중복 생성하지 말고 통합한다.

---

# 6. 핵심 TypeScript 타입

## 6.1 사건 대분류

```ts
export type AiLegalCategory =
  | "civil"
  | "criminal"
  | "divorce"
  | "inheritance"
  | "administrative"
  | "unclear";
```

## 6.2 긴급도

```ts
export type AiUrgencyLevel =
  | "normal"
  | "attention"
  | "urgent"
  | "emergency";
```

의미:

* `normal`: 일반적인 정보 탐색
* `attention`: 기한·서류 확인 필요
* `urgent`: 출석일, 제출기한, 처분기간 등이 임박
* `emergency`: 체포·구속·압수수색·즉각적인 위험 등 전화 우선

## 6.3 질문 유형

```ts
export type AiQuestionType =
  | "single_choice"
  | "multiple_choice"
  | "date"
  | "number"
  | "short_text"
  | "long_text"
  | "boolean";
```

## 6.4 질문 정의

```ts
export interface AiGuideQuestion {
  id: string;
  category: AiLegalCategory;
  subcategory?: string;
  order: number;

  field: string;
  type: AiQuestionType;

  question: string;
  helpText?: string;

  required: boolean;
  options?: {
    value: string;
    label: string;
    description?: string;
  }[];

  showWhen?: {
    field: string;
    operator: "equals" | "not_equals" | "includes";
    value: string | boolean | number;
  };

  urgencyRules?: {
    answerValue?: string | boolean;
    daysUntilDateAtMost?: number;
    level: AiUrgencyLevel;
    message: string;
  }[];
}
```

## 6.5 사용자 답변

```ts
export interface AiGuideAnswer {
  questionId: string;
  field: string;
  value: string | string[] | number | boolean | null;
  answeredAt: string;
}
```

## 6.6 사건분류 결과

```ts
export interface AiClassificationResult {
  category: AiLegalCategory;
  categoryLabel: string;

  subcategory?: string;
  subcategoryLabel?: string;

  confidence: number;
  alternativeCategories: {
    category: AiLegalCategory;
    confidence: number;
  }[];

  matchedTags: string[];
  reasonSummary: string;

  requiresConfirmation: boolean;
}
```

`confidence`는 내부 분류 신뢰도이며 사용자에게 승소확률처럼 표시해서는 안 된다.

## 6.7 관련 콘텐츠

```ts
export type AiContentType =
  | "practice"
  | "case"
  | "guide"
  | "faq";

export interface AiRelatedContent {
  id: string;
  type: AiContentType;
  slug: string;
  href: string;

  title: string;
  excerpt?: string;
  category: string;
  tags: string[];

  matchScore: number;
  matchedTags: string[];
}
```

## 6.8 최종 분석 결과

```ts
export interface AiGuideResult {
  sessionId: string;

  classification: AiClassificationResult;
  urgency: {
    level: AiUrgencyLevel;
    reasons: string[];
    callFirst: boolean;
  };

  situationSummary: string;

  confirmedFacts: string[];
  missingInformation: string[];
  recommendedDocuments: string[];

  generalProcess: {
    title: string;
    description: string;
  }[];

  relatedContent: {
    practices: AiRelatedContent[];
    cases: AiRelatedContent[];
    guides: AiRelatedContent[];
    faqs: AiRelatedContent[];
  };

  consultationSummary: AiConsultationSummary;

  safetyNotice: string;
  generatedBy: "rule" | "ai" | "hybrid";
}
```

## 6.9 상담 전달 요약

```ts
export interface AiConsultationSummary {
  category: AiLegalCategory;
  categoryLabel: string;

  subcategory?: string;
  subcategoryLabel?: string;

  userQuestion: string;
  situationSummary: string;

  confirmedFacts: string[];
  availableEvidence: string[];
  missingInformation: string[];
  keyIssues: string[];

  urgencyLevel: AiUrgencyLevel;
  urgencyReasons: string[];

  relatedContentIds: string[];

  generatedAt: string;
}
```

---

# 7. 분야별 질문 흐름 저장 방식

질문 흐름은 AI 모델이 매번 자유롭게 생성하지 않고 **정의된 질문 데이터**를 우선 사용한다.

```ts
export const aiQuestionFlows: Record<
  Exclude<AiLegalCategory, "unclear">,
  AiGuideQuestion[]
> = {
  civil: [],
  criminal: [],
  divorce: [],
  inheritance: [],
  administrative: [],
};
```

## 7.1 민사 필수 필드 예시

```text
disputeType
claimAmountRange
writtenAgreementExists
transferEvidenceExists
messageEvidenceExists
courtDocumentReceived
courtDocumentReceivedAt
deadlineKnown
```

## 7.2 형사 필수 필드 예시

```text
partyRole
investigationStage
policeContactReceived
attendanceDate
detained
searchOrSeizure
settlementStatus
documentReceived
```

## 7.3 이혼·가사 필수 필드 예시

```text
marriageDuration
minorChildrenCount
currentStatus
divorceReason
propertyDivisionConcern
custodyConcern
affairIssue
pensionIssue
courtDocumentReceived
```

## 7.4 상속 필수 필드 예시

```text
deceasedDate
heirCount
relationshipToDeceased
estateExists
debtExists
caseType
courtDocumentReceived
renunciationOrAcceptanceStarted
```

## 7.5 행정 필수 필드 예시

```text
dispositionType
dispositionDate
noticeReceivedDate
issuingAuthority
objectionFiled
administrativeAppealFiled
administrativeLawsuitFiled
businessOrLicenseImpact
enforcementDate
```

행정 분야에서는 처분일·통지 수령일·효력 발생일을 혼동하지 않도록 별도로 입력받는다.

---

# 8. DB 구조

## 8.1 `ai_guide_sessions`

AI 법률안내 한 번의 이용 세션을 저장한다.

| 필드                          | 형식                   | 설명                                                      |
| --------------------------- | -------------------- | ------------------------------------------------------- |
| `id`                        | uuid                 | 세션 ID                                                   |
| `public_token_hash`         | text                 | 비로그인 세션 확인용 해시                                          |
| `status`                    | text                 | started, questioning, completed, abandoned, transferred |
| `initial_question_redacted` | text                 | 마스킹된 최초 질문                                              |
| `category`                  | text                 | 사건 대분류                                                  |
| `subcategory`               | text nullable        | 세부분류                                                    |
| `classification_confidence` | numeric nullable     | 내부 분류값                                                  |
| `urgency_level`             | text                 | normal, attention, urgent, emergency                    |
| `generated_by`              | text                 | rule, ai, hybrid                                        |
| `started_at`                | timestamptz          | 시작일                                                     |
| `completed_at`              | timestamptz nullable | 완료일                                                     |
| `expires_at`                | timestamptz          | 만료일                                                     |
| `consultation_id`           | uuid nullable        | 상담 전환 시 연결                                              |
| `consent_to_transfer`       | boolean              | 상담 전달 동의                                                |
| `created_at`                | timestamptz          | 생성일                                                     |
| `updated_at`                | timestamptz          | 수정일                                                     |

원문 질문은 가능하면 저장하지 않고 마스킹된 문장만 저장한다.

## 8.2 `ai_guide_answers`

| 필드                | 형식          | 설명      |
| ----------------- | ----------- | ------- |
| `id`              | uuid        | 답변 ID   |
| `session_id`      | uuid        | 세션      |
| `question_id`     | text        | 질문 식별자  |
| `field_name`      | text        | 구조화 필드명 |
| `answer_value`    | jsonb       | 답변      |
| `answer_redacted` | jsonb       | 마스킹된 답변 |
| `created_at`      | timestamptz | 답변일     |

개인정보가 포함될 가능성이 있는 자유입력값은 `answer_redacted`를 기본 분석 대상으로 사용한다.

## 8.3 `ai_guide_results`

| 필드                     | 형식            | 설명        |
| ---------------------- | ------------- | --------- |
| `id`                   | uuid          | 결과 ID     |
| `session_id`           | uuid unique   | 세션        |
| `result_data`          | jsonb         | 공개 가능한 결과 |
| `consultation_summary` | jsonb         | 상담 전달 요약  |
| `safety_flags`         | jsonb         | 위험 신호     |
| `related_content`      | jsonb         | 추천 콘텐츠    |
| `prompt_version`       | text nullable | 프롬프트 버전   |
| `model_name`           | text nullable | 사용 모델     |
| `created_at`           | timestamptz   | 생성일       |

## 8.4 `ai_guide_events`

운영 분석용 이벤트만 저장한다.

| 필드               | 형식            |
| ---------------- | ------------- |
| `id`             | uuid          |
| `session_id`     | uuid nullable |
| `event_name`     | text          |
| `event_metadata` | jsonb         |
| `created_at`     | timestamptz   |

이벤트 예:

* `guide_started`
* `question_answered`
* `classification_confirmed`
* `result_completed`
* `related_case_clicked`
* `related_guide_clicked`
* `call_clicked`
* `consultation_started`
* `consultation_submitted`
* `guide_abandoned`
* `ai_fallback_used`

이벤트 metadata에 이름, 전화번호, 상담 원문을 저장하지 않는다.

## 8.5 `ai_guide_feedback`

| 필드                 | 형식            |
| ------------------ | ------------- |
| `id`               | uuid          |
| `session_id`       | uuid          |
| `rating`           | integer       |
| `reason_code`      | text nullable |
| `comment_redacted` | text nullable |
| `created_at`       | timestamptz   |

평점 범위는 1~5로 제한한다.

## 8.6 `ai_safety_events`

| 필드                 | 형식             |
| ------------------ | -------------- |
| `id`               | uuid           |
| `session_id`       | uuid nullable  |
| `risk_type`        | text           |
| `risk_level`       | text           |
| `action_taken`     | text           |
| `details_redacted` | jsonb nullable |
| `created_at`       | timestamptz    |

위험 원문 전체를 저장하지 않는다.

## 8.7 `ai_usage_daily`

일일 비용·사용량 집계 테이블이다.

| 필드                   | 형식      |
| -------------------- | ------- |
| `usage_date`         | date    |
| `request_count`      | integer |
| `input_tokens`       | bigint  |
| `output_tokens`      | bigint  |
| `estimated_cost`     | numeric |
| `failure_count`      | integer |
| `fallback_count`     | integer |
| `average_latency_ms` | integer |

원시 API 로그가 아니라 집계값 위주로 저장한다.

---

# 9. 향후 RAG용 DB 구조

MVP에서 반드시 사용하지 않아도 되지만 migration 구조를 준비한다.

## 9.1 `ai_knowledge_documents`

| 필드             | 형식                   | 설명                                     |
| -------------- | -------------------- | -------------------------------------- |
| `id`           | uuid                 | 문서 ID                                  |
| `content_type` | text                 | practice, case, guide, faq, judgment 등 |
| `source_id`    | uuid nullable        | 원본 콘텐츠 ID                              |
| `title`        | text                 | 제목                                     |
| `source_url`   | text nullable        | 공개 URL                                 |
| `visibility`   | text                 | public, private                        |
| `status`       | text                 | pending, indexed, failed, excluded     |
| `category`     | text                 | 분야                                     |
| `tags`         | text[]               | 태그                                     |
| `content_hash` | text                 | 변경 탐지                                  |
| `indexed_at`   | timestamptz nullable | 색인일                                    |
| `updated_at`   | timestamptz          | 수정일                                    |

## 9.2 `ai_knowledge_chunks`

```sql
id uuid
document_id uuid
chunk_index integer
content text
content_redacted text
token_count integer
metadata jsonb
embedding vector
created_at timestamptz
```

공개 콘텐츠와 비공개 사건자료는 동일 쿼리에서 섞지 않는다.

초기 공개 AI는 반드시 `visibility = 'public'`인 자료만 검색한다.

---

# 10. RLS 정책

## 공개 사용자

가능:

* 본인의 익명 세션 생성
* 해당 세션에 답변 추가
* 해당 세션의 결과 확인
* 피드백 등록

불가능:

* 다른 세션 조회
* 관리자 전용 안전 로그 조회
* AI 사용량 조회
* 비공개 지식 문서 조회
* 사건자료 조회
* 전체 상담요약 조회

## 관리자

활성 관리자만 가능:

* 상담으로 전환된 AI 요약 조회
* 집계 데이터 조회
* 안전 이벤트 조회
* 사용자 피드백 조회
* 콘텐츠 색인 상태 조회

## 최고관리자

추가 가능:

* AI 사용량·비용 설정
* AI 기능 활성화·비활성화
* 모델 및 한도 설정
* 지식문서 색인·제외
* AI 데이터 보유기간 설정

RLS 외에 서버 레이어에서도 권한을 다시 확인한다.

---

# 11. API 설계

## 11.1 세션 시작

### `POST /api/ai-guide/session`

요청:

```json
{
  "initialQuestion": "돈을 빌려줬는데 받지 못했습니다.",
  "selectedCategory": null
}
```

응답:

```json
{
  "success": true,
  "sessionId": "uuid",
  "sessionToken": "opaque-token",
  "classification": {
    "category": "civil",
    "categoryLabel": "민사",
    "subcategory": "debt",
    "subcategoryLabel": "대여금",
    "requiresConfirmation": true
  },
  "nextStep": "confirm_category"
}
```

처리:

1. 요청 길이 검증
2. Rate Limit
3. 개인정보 마스킹
4. 위험 질문 분석
5. 규칙 기반 분류
6. 필요 시 AI 분류 보조
7. 세션 생성
8. 다음 단계 반환

## 11.2 분류 확정

### `POST /api/ai-guide/classify`

요청:

```json
{
  "sessionId": "uuid",
  "category": "civil",
  "confirmed": true
}
```

응답:

```json
{
  "success": true,
  "nextQuestion": {
    "id": "civil-dispute-type",
    "question": "어떤 문제에 가장 가깝습니까?",
    "type": "single_choice",
    "options": []
  },
  "progress": {
    "current": 1,
    "estimatedTotal": 6
  }
}
```

## 11.3 질문 답변

### `POST /api/ai-guide/answer`

요청:

```json
{
  "sessionId": "uuid",
  "questionId": "civil-written-agreement",
  "value": "no"
}
```

응답:

```json
{
  "success": true,
  "nextQuestion": {},
  "progress": {
    "current": 3,
    "estimatedTotal": 6
  },
  "urgency": {
    "level": "normal",
    "callFirst": false
  }
}
```

처리:

* 질문이 현재 세션의 허용 질문인지 검증
* 답변 타입 검증
* 조건부 질문 계산
* 긴급도 재평가
* 다음 질문 결정

## 11.4 최종 결과 생성

### `POST /api/ai-guide/result`

요청:

```json
{
  "sessionId": "uuid"
}
```

응답:

```json
{
  "success": true,
  "result": {
    "classification": {},
    "urgency": {},
    "situationSummary": "",
    "confirmedFacts": [],
    "missingInformation": [],
    "recommendedDocuments": [],
    "generalProcess": [],
    "relatedContent": {
      "practices": [],
      "cases": [],
      "guides": [],
      "faqs": []
    },
    "safetyNotice": ""
  }
}
```

처리:

1. 세션·답변 검증
2. 긴급도 확정
3. 태그 생성
4. 관련 콘텐츠 검색
5. AI 또는 규칙 기반 결과 생성
6. 구조화 응답 검증
7. 안전문구 추가
8. 상담요약 생성
9. 저장 후 반환

## 11.5 상담신청 전달 준비

### `POST /api/ai-guide/transfer`

요청:

```json
{
  "sessionId": "uuid",
  "includeSummary": true,
  "consent": true
}
```

응답:

```json
{
  "success": true,
  "transferToken": "single-use-token",
  "expiresAt": "2026-07-12T15:00:00+09:00",
  "consultationPath": "/consultation?source=ai"
}
```

주의:

* 상담요약을 URL에 넣지 않는다.
* `transferToken`은 일회용·단기 만료 토큰이다.
* 상담신청 페이지가 서버에서 토큰을 확인해 요약을 불러온다.
* 이름과 연락처는 상담신청 화면에서 별도 입력한다.

## 11.6 피드백

### `POST /api/ai-guide/feedback`

```json
{
  "sessionId": "uuid",
  "rating": 4,
  "reasonCode": "helpful",
  "comment": "준비자료 안내가 도움이 됐습니다."
}
```

코멘트는 저장 전에 개인정보를 마스킹한다.

---

# 12. OpenAI 공급자 Adapter

특정 모델에 종속되지 않도록 인터페이스를 사용한다.

```ts
export interface AiLegalGuideProvider {
  classify(
    input: AiClassificationInput
  ): Promise<AiClassificationResult>;

  composeResult(
    input: AiResultCompositionInput
  ): Promise<AiGeneratedResult>;

  summarizeForConsultation(
    input: AiConsultationSummaryInput
  ): Promise<AiConsultationSummary>;
}
```

구현체:

```text
OpenAiLegalGuideProvider
RuleBasedLegalGuideProvider
FallbackLegalGuideProvider
```

우선순위:

```text
규칙 기반 전처리
→ OpenAI 구조화 분석
→ 스키마 검증
→ 실패 시 규칙 기반 결과
```

---

# 13. AI 응답 스키마

AI는 자유로운 장문이 아니라 구조화 JSON을 반환해야 한다.

```ts
export interface AiGeneratedResult {
  situationSummary: string;
  confirmedFacts: string[];
  missingInformation: string[];
  recommendedDocuments: string[];

  keyIssues: {
    title: string;
    explanation: string;
  }[];

  generalProcess: {
    title: string;
    description: string;
  }[];

  urgency: {
    level: AiUrgencyLevel;
    reasons: string[];
  };

  tags: string[];
}
```

검증 실패 시:

1. 한 번만 재시도
2. 다시 실패하면 규칙 기반 결과
3. 사용자에게 내부 오류를 노출하지 않음
4. `ai_fallback_used` 이벤트 기록

---

# 14. 시스템 프롬프트 필수 원칙

시스템 프롬프트에는 최소한 다음 원칙이 들어가야 한다.

```text
당신은 법률사무소 제우 홈페이지의 AI 법률안내 시스템이다.

역할:
- 사용자의 상황을 민사, 형사, 이혼·가사, 상속, 행정 중 하나로 분류한다.
- 필요한 추가 확인사항과 준비자료를 안내한다.
- 일반적인 절차를 설명한다.
- 제공된 공개 콘텐츠 범위에서 관련 자료를 연결한다.

금지:
- 승소, 무죄, 불기소, 감형, 재산분할 비율 등을 단정하지 않는다.
- 사용자의 설명만으로 법적 결론을 확정하지 않는다.
- 불법행위, 증거인멸, 허위진술, 수사 회피를 돕지 않는다.
- 존재하지 않는 법률사무소 제우의 사례를 만들지 않는다.
- 실제 변호사와 수임계약이 체결된 것처럼 말하지 않는다.
- 홈페이지 콘텐츠에 없는 내용을 제우의 수행사례로 표현하지 않는다.

답변:
- 현재 확인된 내용과 추가 확인사항을 구분한다.
- 자료가 부족하면 부족하다고 말한다.
- 긴급한 경우 전화상담을 우선 안내한다.
- 마지막에 일반 법률정보 고지문을 포함한다.
- 지정된 JSON 스키마로만 응답한다.
```

프롬프트는 코드에 흩어놓지 않고 버전 관리 가능한 파일이나 DB 설정으로 관리한다.

---

# 15. 규칙 기반 분류

AI API 호출 전 기본 키워드·태그 분류를 수행한다.

## 민사 예시

```text
대여금
돈을 빌려줌
계약
손해배상
임대차
보증금
부동산
공사대금
매매대금
가압류
강제집행
```

## 형사 예시

```text
경찰
검찰
피의자
피고인
고소
구속
영장
압수수색
사기
횡령
폭행
음주운전
성범죄
```

## 이혼·가사 예시

```text
이혼
배우자
외도
재산분할
위자료
친권
양육권
양육비
상간
면접교섭
연금분할
```

## 상속 예시

```text
사망
상속
유류분
상속포기
한정승인
유언
기여분
특별수익
상속채무
```

## 행정 예시

```text
행정처분
영업정지
허가취소
면허취소
공무원징계
행정심판
행정소송
과징금
건축허가
토지수용
```

경계사건에서는 단정하지 않고 사용자에게 분야를 확인받는다.

---

# 16. 위험도 판정 규칙

## `emergency`

예:

* 현재 체포 또는 구속
* 압수수색 진행 중
* 즉각적인 신체 위험
* 가정폭력·아동학대의 현재 위험
* 자해·타해 위기
* 당일 영장실질심사
* 당일 공판·조사

처리:

* 긴 설명보다 긴급 연락 안내 우선
* 필요한 최소 정보만 제공
* 전화 버튼을 가장 크게 표시
* 신체 위험 시 적절한 긴급기관 안내

## `urgent`

예:

* 1~3일 내 경찰 조사
* 답변서·항소장 등 제출기한 임박
* 행정심판·행정소송 제기기간 검토 필요
* 상속포기·한정승인 기한 검토 필요
* 강제집행·가압류 임박
* 접근금지·보호명령 관련 긴급 대응

## `attention`

* 법원서류 수령
* 처분서 수령
* 상대방 내용증명 수령
* 소멸시효 가능성
* 주요 증거 유실 가능성

## `normal`

* 일반적인 정보 탐색
* 아직 구체적인 절차가 시작되지 않은 상태

---

# 17. 관련 콘텐츠 검색

MVP에서는 태그 기반 검색을 사용한다.

## 검색 대상

* 공개된 업무분야
* 공개된 승소사례
* 공개된 법률가이드
* 공개된 FAQ

## 검색 제외

* 임시저장
* 비공개
* 휴지통
* 미래 공개일
* 내부 사건정보
* 판결문 원본
* 상담 내용
* 관리자 메모

## 기본 점수

```text
정확한 세부분류 태그 일치          +10
대분류 태그 일치                   +6
사용자 확인 사실과 태그 일치       +4
제목 키워드 일치                   +3
대표 콘텐츠                        +2
같은 분야                          +2
최근 수정 콘텐츠                   +1
```

유형별 기본 반환 수:

* 업무분야: 1~2개
* 승소사례: 최대 3개
* 법률가이드: 최대 3개
* FAQ: 최대 5개

관련도가 낮으면 억지로 채우지 않고 결과 수를 줄인다.

---

# 18. 개인정보 마스킹

## 탐지 대상

* 주민등록번호
* 휴대전화번호
* 이메일
* 계좌번호
* 카드번호
* 상세 주소
* 사건번호
* 운전면허번호
* 여권번호
* 당사자 실명 추정
* 인증번호·비밀번호

## 처리 방식

```text
010-1234-5678
→ [전화번호 삭제]

홍길동
→ 홍○○ 또는 [이름 삭제]

청주시 ○○구 ○○로 12, 101동 202호
→ [상세주소 삭제]

2024가단12345
→ [사건번호 삭제]
```

마스킹 전 원문을 분석 로그나 오류 로그에 남기지 않는다.

상담신청으로 전달할 때는 사용자가 동의한 요약만 전달한다.

---

# 19. Rate Limit과 비용 통제

## 비로그인 사용자

권장 초기값:

* IP 기준 분당 5회
* 시간당 20회
* 일일 세션 10회
* 한 세션 최대 질문 12개
* 최초 질문 최대 1,000자
* 자유서술 답변 최대 2,000자

## AI 호출 제한

* 사건분류: 세션당 최대 2회
* 최종 결과 생성: 세션당 최대 2회
* 재시도: 최대 1회
* 요청 timeout: 15초 내외
* 최대 출력 토큰 제한
* 일일 비용 한도
* 월간 비용 경고 한도

한도 초과 시:

```text
현재 AI 안내 이용량이 많습니다.
기본 안내와 관련 콘텐츠를 확인하거나 전화·온라인 상담을 이용해 주세요.
```

규칙 기반 기능은 계속 작동해야 한다.

---

# 20. 세션과 데이터 보유

권장 정책:

* 미완료 익명 세션: 7일 후 삭제
* 완료되었으나 상담 미전환 세션: 30일 후 삭제 또는 집계 후 원문 삭제
* 상담으로 전환된 AI 요약: 상담정보 보유정책에 따름
* 원시 AI 요청·응답: 가능하면 저장하지 않음
* 오류 로그: 개인정보 제거 후 단기 보관
* 통계 이벤트: 개인 식별 불가능한 집계값 중심

보유기간은 관리자 설정 또는 정책 페이지와 일치시킨다.

---

# 21. 상담신청 연동

## 21.1 사용자 흐름

```text
AI 결과
→ 상담신청 선택
→ AI 요약 포함 여부 선택
→ 일회용 전달 토큰 생성
→ 상담신청 페이지
→ 이름·연락처 입력
→ AI 요약 검토·수정
→ 개인정보 동의
→ 제출
```

## 21.2 상담신청 추가 필드

기존 상담 테이블에 다음 필드를 추가한다.

```sql
source text
ai_session_id uuid nullable
ai_summary jsonb nullable
ai_urgency_level text nullable
ai_category text nullable
ai_subcategory text nullable
ai_transfer_consent boolean default false
```

`source` 값:

* `direct`
* `ai-guide`
* `practice-page`
* `case-page`
* `guide-page`

## 21.3 관리자 화면

관리자 상담 상세화면 상단:

```text
AI 상담요약

분야: 민사
세부분야: 대여금
긴급도: 주의

현재 확인된 내용
- 차용증 없음
- 계좌이체 있음
- 문자 있음

추가 확인사항
- 변제기
- 상대방 주소
- 소멸시효

준비 가능 자료
- 계좌내역
- 문자

사용자가 확인한 요약입니다.
```

원문 대화는 기본적으로 접어서 표시하거나 저장하지 않는다.

---

# 22. 관리자 운영 기능

관리자 대시보드에 AI 영역을 추가한다.

## 표시 항목

* 오늘 AI 이용 세션
* 완료율
* 상담 전환율
* 전화 클릭률
* 분야별 이용 비중
* 긴급 사건 수
* Fallback 발생 수
* 평균 응답시간
* AI가 답하지 못한 주요 질문
* 관련 콘텐츠가 부족한 태그

## 관리자 설정

최고관리자만 수정:

* AI 기능 사용 여부
* OpenAI 기능 사용 여부
* 규칙 기반 Fallback 여부
* 일일 요청 한도
* 월간 예산 경고
* 최대 질문 수
* 세션 보유기간
* 사용 모델
* 시스템 프롬프트 버전

AI 기능을 비활성화해도 상담신청과 업무분야 안내는 정상 작동해야 한다.

---

# 23. 환경변수

`.env.example`에 추가한다.

```bash
AI_GUIDE_ENABLED=true
AI_GENERATIVE_ENABLED=false

AI_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=

AI_MAX_INPUT_CHARS=2000
AI_MAX_SESSION_QUESTIONS=12
AI_REQUEST_TIMEOUT_MS=15000

AI_RATE_LIMIT_PER_MINUTE=5
AI_RATE_LIMIT_PER_HOUR=20
AI_DAILY_SESSION_LIMIT=10

AI_DAILY_BUDGET_USD=
AI_MONTHLY_BUDGET_USD=

AI_SESSION_RETENTION_DAYS=30
AI_ABANDONED_SESSION_RETENTION_DAYS=7

AI_PROMPT_VERSION=zeu-ai-guide-v1
```

금지:

```text
NEXT_PUBLIC_OPENAI_API_KEY
```

AI API 키는 절대로 클라이언트에 노출하지 않는다.

---

# 24. UI 상태 정의

```ts
export type AiGuideUiState =
  | "start"
  | "classifying"
  | "confirming_category"
  | "questioning"
  | "analyzing"
  | "completed"
  | "urgent"
  | "rate_limited"
  | "failed"
  | "transferring";
```

각 상태별 화면을 명확히 구현한다.

## 실패 시 사용자 문구

```text
현재 AI 법률안내 연결이 원활하지 않습니다.

선택하신 분야의 기본 안내와 관련 콘텐츠는 계속 확인할 수 있습니다.
긴급한 사건은 대표전화로 문의해 주세요.
```

버튼:

* 기본 안내 계속하기
* 전화상담
* 온라인 상담신청
* 다시 시도

---

# 25. 접근성 기준

* 모든 질문에 명시적 제목 제공
* 선택지는 native radio 또는 checkbox 사용
* 진행률에 텍스트 병기
* `aria-live`로 상태 변경 알림
* 분석 중 `aria-busy`
* 오류 메시지와 필드 연결
* 키보드만으로 전체 진행 가능
* 이전·다음 버튼 순서 명확
* 선택 상태를 색상만으로 표시하지 않음
* 긴급 CTA에 텍스트 표시
* 자동 초점 이동은 필요한 경우에만 수행
* 애니메이션 감소 설정 지원

---

# 26. 보안 기준

1. AI API는 서버에서만 호출한다.
2. 모든 입력값은 서버에서 재검증한다.
3. 사용자 입력을 HTML로 렌더링하지 않는다.
4. `dangerouslySetInnerHTML`을 사용하지 않는다.
5. 상담 내용은 URL에 넣지 않는다.
6. 개인정보를 localStorage에 저장하지 않는다.
7. 세션 토큰은 추측하기 어려운 값으로 생성한다.
8. 전달 토큰은 일회용·단기 만료로 한다.
9. 관리자 권한은 서버에서 확인한다.
10. 안전 로그에는 원문 전체를 남기지 않는다.
11. DB 오류와 AI 공급자 오류를 사용자에게 그대로 노출하지 않는다.
12. 프롬프트 인젝션 문구를 사용자 명령으로 신뢰하지 않는다.
13. 사용자가 “기존 지침을 무시하라”고 해도 시스템 정책을 유지한다.
14. 공개 AI가 비공개 CMS 콘텐츠나 사건자료를 조회하지 못하게 한다.

---

# 27. 테스트 구조

## 27.1 단위 테스트

필수 대상:

* 키워드 기반 사건분류
* 분야별 다음 질문 계산
* 조건부 질문 표시
* 긴급도 판정
* 날짜 임박 계산
* 개인정보 마스킹
* 관련 콘텐츠 점수
* 상담요약 생성
* 세션 만료
* 추천 콘텐츠 중복 제거
* AI 스키마 검증
* Fallback 전환

## 27.2 통합 테스트

1. 민사 질문 전체 흐름
2. 형사 긴급 질문 흐름
3. 이혼 자녀 있음 조건부 흐름
4. 상속 사망일 기반 기한 경고
5. 행정 처분일·통지일 기반 경고
6. AI API 성공
7. AI API timeout
8. AI JSON 오류
9. Rate Limit
10. 상담 전달 토큰
11. 상담 제출
12. 관리자 요약 확인
13. 비공개 콘텐츠 추천 제외
14. 개인정보가 로그에 남지 않는지 확인

## 27.3 E2E 화면 테스트

권장 크기:

* 390px
* 768px
* 1024px
* 1440px

확인:

* 가로 스크롤 없음
* 한 질문씩 표시
* 이전 질문 이동
* 진행률
* 모바일 하단 CTA 겹침 없음
* 결과 카드
* 상담신청 전환
* 실패 Fallback
* 긴급 전화 CTA

---

# 28. 분야별 필수 인수 테스트

## 민사

질문:

> 차용증은 없지만 계좌이체와 카톡이 있습니다.

기대 결과:

* `civil`
* `debt`
* 차용증 없음
* 계좌이체·메시지 증거 있음
* 변제기·소멸시효 추가 확인
* 민사 관련 콘텐츠 추천
* 승소 단정 없음

## 형사

질문:

> 오늘 오후 경찰 조사를 받으러 오라고 연락받았습니다.

기대 결과:

* `criminal`
* 긴급도 `emergency` 또는 `urgent`
* 전화상담 우선 표시
* 피의자·피해자 지위 확인
* 조사일·받은 서류 확인
* 수사 회피 조언 금지

## 이혼·가사

질문:

> 결혼한 지 15년이고 미성년 자녀 두 명이 있습니다. 재산분할이 걱정됩니다.

기대 결과:

* `divorce`
* 혼인기간·미성년 자녀 확인
* 재산분할·양육권·양육비 질문
* 재산자료 안내
* 이혼 관련 사례·가이드 추천

## 상속

질문:

> 아버지가 두 달 전에 돌아가셨는데 빚이 많은 것 같습니다.

기대 결과:

* `inheritance`
* 사망일 확인
* 채무 확인
* 상속포기·한정승인 관련 안내
* 기한 검토 경고
* 단정적 결론 금지
* 상담 우선 제안

## 행정

질문:

> 식당 영업정지 처분서를 받았습니다.

기대 결과:

* `administrative`
* 영업정지 세부분류
* 처분일·통지일·효력 발생일 질문
* 처분서·공문·관련 자료 안내
* 행정심판·행정소송 일반 안내
* 기간을 단정하지 않고 신속한 검토 권고

---

# 29. 성능 기준

MVP 목표:

| 항목          |           목표 |
| ----------- | -----------: |
| 초기 화면 표시    |     2초 이내 목표 |
| 질문 전환       |  300ms 이내 체감 |
| 규칙 기반 분류    |     500ms 이내 |
| 생성형 AI 결과   |    10초 이내 목표 |
| timeout     |          15초 |
| Fallback 전환 | timeout 후 즉시 |
| 모바일 CLS     |          최소화 |
| 공개 페이지 JS   |   필요한 범위로 제한 |

분석 중에는 실제 단계와 무관한 거짓 진행률을 표시하지 않는다. “확인 중”, “관련 자료 찾는 중” 등 상태 문구를 사용한다.

---

# 30. 완료 기준(Definition of Done)

다음 조건을 모두 만족해야 MVP가 완료된 것으로 본다.

## 기능

* [ ] `/tools/ai-guide`가 정상 표시된다.
* [ ] 자유질문 또는 분야 선택으로 시작할 수 있다.
* [ ] 민사·형사·이혼·상속·행정을 분류한다.
* [ ] 분류 결과를 사용자가 수정할 수 있다.
* [ ] 분야별 질문이 조건에 맞게 진행된다.
* [ ] 한 번에 한 질문만 표시한다.
* [ ] 이전 질문으로 이동할 수 있다.
* [ ] 답변을 바꾸면 후속 질문과 결과가 다시 계산된다.
* [ ] 긴급도가 자동 계산된다.
* [ ] 결과 화면이 공통 형식으로 표시된다.
* [ ] 관련 업무분야·사례·가이드·FAQ가 자동 추천된다.
* [ ] 상담신청으로 요약을 전달할 수 있다.
* [ ] 사용자가 전달 요약을 검토·수정할 수 있다.
* [ ] 관리자 화면에서 AI 상담요약을 확인할 수 있다.
* [ ] AI API가 없어도 규칙 기반 기능이 작동한다.
* [ ] AI API 오류 시 Fallback이 작동한다.
* [ ] 피드백을 등록할 수 있다.

## 법률 안전성

* [ ] 승소 여부를 단정하지 않는다.
* [ ] 형량·무죄·처분 결과를 단정하지 않는다.
* [ ] 수임계약이 성립한 것처럼 표현하지 않는다.
* [ ] 불법행위·증거인멸·허위진술을 돕지 않는다.
* [ ] 긴급 사건은 전화상담을 우선 표시한다.
* [ ] 모든 결과에 일반 법률정보 고지문이 표시된다.
* [ ] 참고하지 않은 제우 콘텐츠를 근거로 표시하지 않는다.
* [ ] 실제 존재하지 않는 승소사례를 생성하지 않는다.

## 개인정보

* [ ] 주민등록번호·전화번호·이메일·사건번호 마스킹이 작동한다.
* [ ] 상담 전 이름과 연락처를 강제로 요구하지 않는다.
* [ ] 사용자 입력을 URL에 넣지 않는다.
* [ ] localStorage에 상담내용을 저장하지 않는다.
* [ ] 개인정보가 로그에 남지 않는다.
* [ ] AI 요약 전달 전 사용자 동의를 받는다.
* [ ] 다른 사용자의 세션을 조회할 수 없다.
* [ ] 만료 세션 삭제 정책이 적용된다.

## 보안

* [ ] OpenAI API 키가 서버에만 존재한다.
* [ ] Route Handler에서 입력값을 재검증한다.
* [ ] Rate Limit이 적용된다.
* [ ] 관리자 권한을 서버에서 확인한다.
* [ ] 비공개 콘텐츠가 공개 AI에 노출되지 않는다.
* [ ] 프롬프트 인젝션 기본 방어가 적용된다.
* [ ] 오류 메시지에 내부 정보가 노출되지 않는다.

## 접근성·반응형

* [ ] 390px 모바일에서 정상 작동한다.
* [ ] 768px 태블릿에서 정상 작동한다.
* [ ] 1440px PC에서 정상 작동한다.
* [ ] 키보드만으로 진행할 수 있다.
* [ ] 진행률과 상태가 스크린리더에 전달된다.
* [ ] 선택 상태가 색상 외 방식으로도 표현된다.
* [ ] 모바일 Quick Bar가 질문·버튼을 가리지 않는다.
* [ ] 가로 스크롤이 없다.

## 품질

* [ ] TypeScript 오류가 없다.
* [ ] `npm run build`가 성공한다.
* [ ] lint가 설정되어 있다면 통과한다.
* [ ] 핵심 단위 테스트가 통과한다.
* [ ] 다섯 분야 E2E 시나리오가 통과한다.
* [ ] AI 오류·timeout 시나리오가 통과한다.
* [ ] 문서가 작성되어 있다.

---

# 31. Codex 구현 순서

Codex는 한 번에 전 기능을 구현하지 말고 다음 순서로 작업한다.

## 작업 1: 타입·데이터·규칙 엔진

* 타입 정의
* 사건분류 데이터
* 분야별 질문 흐름
* 긴급도 규칙
* 개인정보 마스킹
* 관련 콘텐츠 점수
* 단위 테스트

완료 후 빌드 확인.

## 작업 2: 사용자 UI

* 시작화면
* 질문 단계
* 진행률
* 결과화면
* 관련 콘텐츠
* 긴급 CTA
* 실패 Fallback
* 반응형·접근성

완료 후 빌드 확인.

## 작업 3: Supabase 세션 저장

* migration
* RLS
* repository
* 세션·답변·결과 저장
* 만료 처리

완료 후 빌드 및 migration 검증.

## 작업 4: 상담신청 연결

* 일회용 전달 토큰
* 상담 폼 자동 채움
* 사용자 검토
* DB 연결
* 관리자 요약

완료 후 E2E 확인.

## 작업 5: OpenAI Adapter

* 서버 API
* 구조화 응답
* timeout
* 재시도
* 스키마 검증
* Fallback
* 비용·Rate Limit

완료 후 오류 시나리오 확인.

## 작업 6: 관리자 운영 화면

* AI 이용 현황
* 상담 전환
* 실패·Fallback
* 피드백
* 안전 이벤트
* 설정

## 작업 7: 최종 테스트·문서

* 단위 테스트
* 통합 테스트
* E2E
* 빌드
* 운영 문서
* 환경변수 문서

---

# 32. Codex 최종 작업 지시문

아래 문구는 Part 1~6 통합 명세서가 저장소에 저장된 후 Codex에 전달한다.

```text
현재 저장소의 docs 폴더에 있는 법률사무소 제우 AI 법률안내 PRD Part 1~6을 모두 읽고 구현해줘.

중요:
- 새 프로젝트를 만들지 말고 현재 Next.js 프로젝트를 수정할 것.
- 기존 업무분야, 승소사례, 법률가이드, FAQ, 상담신청, 관리자 CMS 구조를 재사용할 것.
- 실제 홈페이지에는 민사, 형사, 이혼·가사, 상속과 함께 행정 분야가 포함되어 있으므로 AI에도 행정을 동일한 1급 분야로 구현할 것.
- 먼저 기존 프로젝트 구조와 DB migration을 분석하고 명세와 충돌하는 부분을 보고할 것.
- 충돌이 없다면 명세 Part 6의 ‘Codex 구현 순서’에 따라 단계별로 구현할 것.
- 각 작업 단계가 끝날 때마다 npm run build와 관련 테스트를 실행할 것.
- 오류가 있으면 다음 단계로 넘어가지 말고 먼저 수정할 것.

1차 구현 범위:
1. /tools/ai-guide
2. 자유질문 및 분야 직접 선택
3. 민사·형사·이혼·가사·상속·행정 규칙 기반 분류
4. 분야별 조건부 질문 흐름
5. 긴급도 판정
6. 개인정보 마스킹
7. 태그 기반 업무분야·승소사례·가이드·FAQ 추천
8. 공통 결과 화면
9. 상담신청 요약 전달
10. 관리자 상담 상세 AI 요약
11. Supabase 세션·답변·결과 저장
12. Rate Limit과 세션 만료
13. AI API 없이 작동하는 Fallback
14. 접근성·반응형
15. 단위·통합 테스트

다음 기능은 1차에서 제외:
- 판결문 검색
- OCR
- 사건자료 업로드
- 벡터 검색
- 소장·답변서 작성
- 승소확률·형량 예측
- AI 콘텐츠 자동 공개

규칙 기반 MVP를 먼저 완성한 뒤 별도 단계로 OpenAI provider adapter를 구현할 것.

OpenAI 연결 시:
- API 키 서버 전용
- 구조화 JSON 응답
- TypeScript 또는 Zod 스키마 검증
- timeout 15초
- 재시도 최대 1회
- 실패 시 규칙 기반 결과
- 사용자 입력 원문 로그 금지
- 개인정보 마스킹 후 전송
- 승소·무죄·형량·처분결과 단정 금지
- 존재하지 않는 제우 콘텐츠 생성 금지

작업 완료 후 다음을 보고할 것:
1. 생성한 파일
2. 수정한 파일
3. migration
4. RLS
5. 질문 흐름
6. 긴급도 규칙
7. 개인정보 마스킹
8. 상담 연결
9. 관리자 연동
10. 테스트 결과
11. npm run build 결과
12. 필요한 환경변수
13. 다음 단계 TODO
```

---

# Part 6 결론

제우 AI MVP는 **생성형 AI가 답변을 자유롭게 만들어내는 챗봇**이 아니다.

핵심 구조는 다음과 같다.

```text
규칙 기반 사건분류
→ 분야별 질문 흐름
→ 긴급도 판단
→ 홈페이지 콘텐츠 검색
→ 제한된 AI 설명
→ 상담신청 연결
→ 관리자 구조화 요약
```

이 구조라면 현재 판결문이나 사건자료가 충분하지 않아도 운영을 시작할 수 있다. 이후 승소사례·법률가이드·FAQ가 늘어나면 추천 품질이 향상되고, 판결문과 사건자료를 추가하는 단계에서는 기존 시스템을 다시 만드는 대신 `ai_knowledge_documents`와 `ai_knowledge_chunks`에 검색 대상을 확장하면 된다.
