import { aiCategoryLabels, aiSubcategoryLabels } from "@/data/ai/categories";
import type { AiClassificationResult, AiGuideResult, AiLegalCategory, AiSubcategory } from "@/types/ai-guide";
import type {
  AiLegalGuideProvider,
  AiProviderClassification,
  AiProviderContext,
  AiProviderQuestionDraft,
  AiProviderResponse,
  AiProviderResultDraft,
  AiProviderUsage,
} from "@/types/ai-provider";

const categories = new Set<AiLegalCategory>(["civil", "criminal", "divorce", "inheritance", "administrative", "unclear"]);
const subcategories = new Set<AiSubcategory>([
  "debt",
  "contract",
  "damages",
  "police-investigation",
  "fraud",
  "dui",
  "property-division",
  "custody",
  "affair",
  "renunciation",
  "limited-acceptance",
  "reserved-share",
  "business-suspension",
  "license-cancellation",
  "discipline",
  "administrative-appeal",
  "administrative-lawsuit",
  "general",
]);

interface OpenAiProviderOptions {
  apiKey: string;
  model?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxRetries?: number;
  maxInputChars?: number;
  maxOutputTokens?: number;
}

class AiProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiProviderError";
  }
}

function safeString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.slice(0, maxLength) : undefined;
}

function stringArray(value: unknown, limit: number) {
  if (!Array.isArray(value)) return undefined;
  return value.filter((item): item is string => typeof item === "string").slice(0, limit);
}

function softenMissingInformation(item: string) {
  return item
    .replace(/확인이 필요합니다\.?$/, "확인해주세요.")
    .replace(/([이가]) 필요합니다\.?$/, "$1 있는지 확인해주세요.")
    .replace(/ 필요합니다\.?$/, " 있는지 확인해주세요.");
}

function softenRecommendedDocument(item: string) {
  return item
    .replace(/([이가]) 필요합니다\.?$/, "$1 있다면 준비해주세요.")
    .replace(/ 필요합니다\.?$/, " 있다면 준비해주세요.");
}

function parseJsonObject(content: unknown) {
  if (typeof content !== "string") throw new AiProviderError("invalid_json");
  try {
    const parsed = JSON.parse(content) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("not object");
    return parsed as Record<string, unknown>;
  } catch {
    throw new AiProviderError("invalid_json");
  }
}

function validateClassification(value: Record<string, unknown>): AiProviderClassification {
  const category = categories.has(value.category as AiLegalCategory)
    ? (value.category as AiLegalCategory)
    : undefined;
  const subcategory = subcategories.has(value.subcategory as AiSubcategory)
    ? (value.subcategory as AiSubcategory)
    : undefined;
  const confidence =
    typeof value.confidence === "number" && value.confidence >= 0 && value.confidence <= 1
      ? value.confidence
      : undefined;
  return {
    category,
    subcategory,
    confidence,
    reasonSummary: safeString(value.reasonSummary, 240),
    matchedTags: stringArray(value.matchedTags, 8),
  };
}

function validateResultDraft(value: Record<string, unknown>): AiProviderResultDraft {
  const comments = value.sectionComments as Record<string, unknown> | undefined;
  return {
    situationSummary: safeString(value.situationSummary, 520),
    confirmedFacts: stringArray(value.confirmedFacts, 8),
    missingInformation: stringArray(value.missingInformation, 8)
      ?.filter((item) => !["추가 확인이 필요합니다.", "추가 확인이 필요합니다", "확인이 필요합니다."].includes(item.trim()))
      .map(softenMissingInformation),
    recommendedDocuments: stringArray(value.recommendedDocuments, 8)?.map(softenRecommendedDocument),
    consultationOpinion: safeString(value.consultationOpinion, 520),
    sectionComments: comments && typeof comments === "object" ? {
      confirmedFacts: safeString(comments.confirmedFacts, 80) ?? "확인된 사실을 바탕으로 핵심 쟁점을 더 살펴볼 수 있습니다.",
      missingInformation: safeString(comments.missingInformation, 80) ?? "남은 사실관계는 변호사 상담에서 구체적으로 확인해보세요.",
      recommendedDocuments: safeString(comments.recommendedDocuments, 80) ?? "관련 자료를 준비하면 상담을 더 정확하게 진행할 수 있습니다.",
    } : undefined,
    relatedContentIds: stringArray(value.relatedContentIds, 12),
    safetyNotice: safeString(value.safetyNotice, 520),
  };
}

function validateQuestionDrafts(value: Record<string, unknown>): AiProviderQuestionDraft[] {
  if (!Array.isArray(value.questions)) return [];
  const allowedTypes = new Set(["single_choice", "date", "short_text", "long_text", "boolean"]);
  return value.questions.slice(0, 6).flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const draft = item as Record<string, unknown>;
    const question = safeString(draft.question, 180)?.trim();
    const type = allowedTypes.has(draft.type as string)
      ? (draft.type as AiProviderQuestionDraft["type"])
      : "short_text";
    if (!question) return [];
    const genericDateQuestion = type === "date"
      && /중요한\s*날짜|관련(?:된|한)\s*날짜|특별한\s*날짜/.test(question)
      && !/결혼|혼인|별거|계약|변제|상환|사망|상속|인지|알게\s*된|접수|제출|송달|수령|처분|출석|재판|사고|폭언|폭행|미지급|퇴거|해지|해제/.test(question);
    if (genericDateQuestion) return [];
    const vagueDocumentQuestion = /중요한\s*(?:서류|증거)|관련(?:된|한)\s*(?:서류|증거)|준비(?:한|할|하는)\s*(?:서류|증거)|(?:서류|증거)(?:가|를)\s*(?:있나요|가지고|보유)/.test(question)
      && !/계약서|차용증|소장|고소장|처분서|진단서|등기|가족관계|혼인관계|계좌|녹음|영상|문자|영수증|공소장|판결|조정/.test(question);
    const documentReadinessQuestion = /(?:서류|자료|증거).{0,12}(?:준비|갖추|마련)(?:되|했|하셨|되어)|(?:준비|갖추|마련).{0,12}(?:서류|자료|증거)/.test(question);
    const options = Array.isArray(draft.options)
      ? draft.options.slice(0, 5).flatMap((option) => {
          if (!option || typeof option !== "object" || Array.isArray(option)) return [];
          const entry = option as Record<string, unknown>;
          const label = safeString(entry.label, 60)?.trim();
          const optionValue = safeString(entry.value, 40)?.trim();
          return label && optionValue ? [{ label, value: optionValue }] : [];
        })
      : undefined;
    const openQuestion = /무엇|어떤|언제|어디|누구|왜|얼마|어떻게|말씀해|알려주|설명해|구체적/.test(question);
    const booleanQuestion = !openQuestion && (type === "boolean" || (["short_text", "long_text"].includes(type ?? "") && /(?:있나요|없나요|인가요|하나요|했나요|받았나요|되었나요|중인가요|맞나요)\?$/.test(question)));
    return [{
      question: vagueDocumentQuestion || documentReadinessQuestion ? "현재 가지고 있는 서류나 증거의 종류와 내용을 구체적으로 적어주세요." : question,
      helpText: vagueDocumentQuestion || documentReadinessQuestion
        ? "예: 판결문·조정조서, 계약서, 계좌내역, 문자·카카오톡, 사진, 녹음. 자료가 없어도 상담할 수 있으므로 없다면 ‘없음’이라고 적어주세요."
        : safeString(draft.helpText, 220),
      type: vagueDocumentQuestion || documentReadinessQuestion ? "long_text" : booleanQuestion ? "boolean" : type === "boolean" ? "long_text" : type === "single_choice" && (!options || options.length < 2) ? "short_text" : type,
      required: draft.required !== false,
      options: vagueDocumentQuestion || documentReadinessQuestion ? undefined : booleanQuestion
        ? [{ value: "yes", label: "예" }, { value: "no", label: "아니오" }]
        : type === "boolean"
          ? undefined
          : options,
    }];
  });
}

function usageFromResponse(value: Record<string, unknown>): AiProviderUsage {
  const usage = value.usage as Record<string, unknown> | undefined;
  if (!usage || typeof usage !== "object") return {};
  return {
    inputTokens: typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : undefined,
    outputTokens: typeof usage.completion_tokens === "number" ? usage.completion_tokens : undefined,
    totalTokens: typeof usage.total_tokens === "number" ? usage.total_tokens : undefined,
  };
}

export class OpenAiLegalGuideProvider implements AiLegalGuideProvider {
  name = "openai" as const;
  private apiKey: string;
  private model: string;
  private fetchImpl: typeof fetch;
  private timeoutMs: number;
  private maxRetries: number;
  private maxInputChars: number;
  private maxOutputTokens: number;

  constructor(options: OpenAiProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.maxRetries = options.maxRetries ?? 1;
    this.maxInputChars = options.maxInputChars ?? Number(process.env.AI_MAX_INPUT_CHARS ?? 2000);
    this.maxOutputTokens = options.maxOutputTokens ?? Number(process.env.AI_MAX_OUTPUT_TOKENS ?? 700);
  }

  async classify(
    inputRedacted: string,
    ruleClassification: AiClassificationResult,
    context: AiProviderContext,
  ): Promise<AiProviderResponse<AiProviderClassification>> {
    const json = await this.chatJson([
      {
        role: "system",
        content:
          "You classify Korean legal consultation intake for LAW OFFICE ZEU. Return JSON only. Do not decide outcomes. Use only redacted user text.",
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "classification_assist",
          promptVersion: context.promptVersion,
          allowedCategories: Array.from(categories),
          allowedSubcategories: Array.from(subcategories),
          ruleClassification,
          redactedQuestion: inputRedacted.slice(0, this.maxInputChars),
          outputSchema: {
            category: "civil|criminal|divorce|inheritance|administrative|unclear",
            subcategory: "allowed subcategory or general",
            confidence: "number 0..1",
            reasonSummary: "short Korean reason",
            matchedTags: ["public non-private tags only"],
          },
        }),
      },
    ]);
    return { data: validateClassification(json.data), usage: json.usage };
  }

  async composeResult(
    ruleResult: Parameters<AiLegalGuideProvider["composeResult"]>[0],
    context: AiProviderContext,
  ): Promise<AiProviderResponse<AiProviderResultDraft>> {
    const publicRelatedContent = [
      ...ruleResult.relatedContent.practices,
      ...ruleResult.relatedContent.cases,
      ...ruleResult.relatedContent.guides,
      ...ruleResult.relatedContent.faqs,
    ].map((item) => ({
      id: item.id,
      title: item.title,
      href: item.href,
      type: item.type,
      matchedTags: item.matchedTags,
    }));
    const json = await this.chatJson([
      {
        role: "system",
        content:
          "You write cautious Korean legal intake results for LAW OFFICE ZEU. Return JSON only. Never guarantee acquittal, victory, sentence, property division ratio, or administrative outcome. Do not cite content not provided. Tailor every fact, question, and document to the user's actual incident; ignore irrelevant generic rule-result items. The user's stated desired outcome controls the primary issue. In divorce matters, if custody, parental rights, child support, or a parenting plan is the stated concern, missing information and documents must focus on the child and parenting even when adultery is also mentioned. Never infer adultery from verbal abuse, violence, personality differences, separation, failure to pay living expenses, financial conflict, or a general wish to divorce. Mention affair evidence or an affair damages claim only when the user explicitly states adultery, an affair, infidelity, or a third-party affair claim. Treat verbal abuse/violence and nonpayment of living expenses as separate issues: when only abuse or violence is stated, never ask for living-expense periods, financial support, housing, livelihood, income, or property documents. Focus only on frequency, severity, threats, injuries, police or medical records, witnesses, children witnessing violence, and current safety. The consultationOpinion must explicitly give a cautious preliminary view on whether litigation or the requested legal procedure can be considered. If the facts indicate it can be considered, say so plainly and naturally recommend consulting a lawyer. For a traffic accident, never mention loan notes, loan agreements, contracts, or bank transfers; focus on accident circumstances, police/insurance reports, fault, treatment, dashcam, medical and damage records. Missing information must identify concrete unknown facts and use a checking phrase such as '있는지 확인해주세요', never '필요합니다'. Recommended documents are optional aids, not prerequisites for litigation; never use '필요합니다' and prefer wording such as '있다면 준비해주세요' or short document names. The consultationOpinion must be a genuinely useful preliminary legal comment, not a transcript or concatenation of questions and answers. State the core factual meaning, a legally available response that can be reviewed, and the one or two conditions that materially affect that review. Use cautious but concrete language such as '청구를 검토할 수 있습니다' or '대응 가능성이 있습니다'; do not merely say that legal review is possible. Never begin with a generic category label and never copy question marks from intake questions.",
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "final_explanation",
          promptVersion: context.promptVersion,
          redactedQuestion: context.initialQuestionRedacted.slice(0, this.maxInputChars),
          answers: context.answers.map((answer) => {
            const question = context.questions?.find((item) => item.id === answer.questionId);
            return {
              question: question?.question ?? answer.field,
              value: answer.value,
              selectedLabel: question?.options?.find((option) => option.value === answer.value)?.label,
            };
          }),
          ruleResult: {
            category: ruleResult.classification.category,
            subcategory: ruleResult.classification.subcategory,
            urgency: ruleResult.urgency,
            situationSummary: ruleResult.situationSummary,
            confirmedFacts: ruleResult.confirmedFacts,
            missingInformation: ruleResult.missingInformation,
            recommendedDocuments: ruleResult.recommendedDocuments,
            safetyNotice: ruleResult.safetyNotice,
          },
          publicRelatedContent,
          outputSchema: {
            situationSummary: "Korean, cautious, under 520 chars",
            confirmedFacts: ["facts confirmed by the user's actual answers, Korean, max 8"],
            missingInformation: ["specific unanswered fact phrased as a request to check whether it exists; Korean, max 8; never use 필요합니다; never generic"],
            recommendedDocuments: ["optional documents useful for consultation; Korean, max 8; never imply the document is required to pursue the case; never use 필요합니다"],
            consultationOpinion: "2-4 natural Korean sentences, under 520 characters. Give a concrete preliminary legal view based on the facts, identify the legal response that may be pursued, and explain the decisive conditions. Do not repeat intake questions or guarantee an outcome.",
            sectionComments: {
              confirmedFacts: "about 50 Korean characters, brief interpretation of confirmed facts",
              missingInformation: "about 50 Korean characters, naturally recommend lawyer consultation for unresolved issues",
              recommendedDocuments: "about 50 Korean characters, explain how the documents help consultation",
            },
            relatedContentIds: ["Select only content directly similar to the consultation question AND follow-up answers. Choose at most 2 case IDs, 2 guide IDs, and 2 FAQ IDs. Never select merely because it shares a broad legal category. Return an empty array when no item is genuinely relevant."],
            safetyNotice: "Korean disclaimer, no outcome guarantee",
          },
        }),
      },
    ]);
    return { data: validateResultDraft(json.data), usage: json.usage };
  }

  async createQuestions(
    classification: AiClassificationResult,
    context: AiProviderContext,
  ): Promise<AiProviderResponse<AiProviderQuestionDraft[]>> {
    const json = await this.chatJson([
      {
        role: "system",
        content:
          "You create a short Korean legal consultation intake flow for LAW OFFICE ZEU. Return JSON only. Ask only facts needed for a lawyer to understand the matter. Never request resident registration numbers, account passwords, unnecessary identifying data, illegal acts, or predictions of case outcomes. Questions must be neutral, plain Korean, and one fact per question. For criminal matters, the first question must determine whether the user is a victim/complainant, suspect/accused/defendant, or witness, and all later questions must match that role. Every question genuinely answerable with yes or no must use type 'boolean' with options [{value:'yes',label:'예'},{value:'no',label:'아니오'}]. Questions containing what/which/when/where/who/why/how/how much or asking for a desired outcome, explanation, or specific details must use short_text or long_text, never boolean. Evidence and document questions must never be yes/no. Ask the user to list the exact case-specific evidence they have, give relevant examples in helpText, and explicitly instruct them to enter '없음' when they have none. For a de facto marriage, examples should include proof of cohabitation, shared address or household expenses, wedding/family recognition, messages, photos, joint assets, and contributions. Never ask vague questions such as whether the user has 'important documents' or 'documents related to preparing for divorce'. Name the exact evidence or document and explain its relevance in the question. Never ask for an unspecified 'important date'. Every date question must name the exact event, such as marriage date, separation date, repayment due date, discovery date, or document service date. When the event is already named in the date question, do not ask a follow-up about what happened on that date or why it matters; that would be redundant. Do not ask the user to describe what happened on a marriage date, contract date, death date, filing date, service date, or any other self-explanatory date.",
      },
      {
        role: "user",
        content: JSON.stringify({
          task: "tailored_follow_up_questions",
          promptVersion: context.promptVersion,
          classification: {
            category: classification.category,
            subcategory: classification.subcategory,
          },
          redactedConsultationRequest: context.initialQuestionRedacted.slice(0, this.maxInputChars),
          requirements: {
            count: "3 to 6",
            language: "Korean",
            allowedTypes: ["single_choice", "date", "short_text", "long_text", "boolean"],
            includeWhenRelevant: ["current procedural stage", "important dates or deadlines", "available documents or evidence", "the result the user wants"],
          },
          outputSchema: {
            questions: [{
              question: "specific Korean question",
              helpText: "optional short example or explanation",
              type: "allowed type",
              required: true,
              options: [{ value: "short-safe-value", label: "Korean label" }],
            }],
          },
        }),
      },
    ]);
    return { data: validateQuestionDrafts(json.data), usage: json.usage };
  }

  private async chatJson(messages: Array<{ role: "system" | "user"; content: string }>) {
    if (!this.apiKey) throw new AiProviderError("missing_api_key");
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
      try {
        const response = await this.fetchImpl("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            messages,
            response_format: { type: "json_object" },
            max_tokens: this.maxOutputTokens,
            temperature: 0.2,
          }),
        });
        if (!response.ok) throw new AiProviderError("openai_error");
        const payload = (await response.json()) as Record<string, unknown>;
        const choices = payload.choices as Array<{ message?: { content?: unknown } }> | undefined;
        const data = parseJsonObject(choices?.[0]?.message?.content);
        return { data, usage: usageFromResponse(payload) };
      } catch (error) {
        lastError = error;
        if (attempt >= this.maxRetries) break;
      } finally {
        clearTimeout(timeout);
      }
    }
    if (lastError instanceof Error && lastError.name === "AbortError") {
      throw new AiProviderError("timeout");
    }
    throw lastError instanceof Error ? lastError : new AiProviderError("openai_error");
  }
}

export function applyProviderClassification(
  ruleClassification: AiClassificationResult,
  providerClassification: AiProviderClassification,
): AiClassificationResult {
  const category = providerClassification.category ?? ruleClassification.category;
  const subcategory = providerClassification.subcategory ?? ruleClassification.subcategory ?? "general";
  return {
    ...ruleClassification,
    category,
    categoryLabel: aiCategoryLabels[category],
    subcategory,
    subcategoryLabel: aiSubcategoryLabels[subcategory],
    confidence: providerClassification.confidence ?? ruleClassification.confidence,
    reasonSummary: providerClassification.reasonSummary ?? ruleClassification.reasonSummary,
    matchedTags: providerClassification.matchedTags ?? ruleClassification.matchedTags,
  };
}

export function applyProviderResultDraft(
  ruleResult: Parameters<AiLegalGuideProvider["composeResult"]>[0],
  draft: AiProviderResultDraft,
): Parameters<AiLegalGuideProvider["composeResult"]>[0] {
  const situationSummary = draft.situationSummary ?? ruleResult.situationSummary;
  const trafficAccident = /교통사고|자동차\s*사고|차량\s*사고|보행자\s*사고|접촉사고|추돌|블랙박스/.test(
    ruleResult.consultationSummary.userQuestion,
  );
  const removeTrafficIrrelevantItems = (items: string[]) => trafficAccident
    ? items.filter((item) => !/차용증|대여금|계약서|계좌이체/.test(item))
    : items;
  const confirmedFacts = draft.confirmedFacts?.length
    ? draft.confirmedFacts
    : ruleResult.confirmedFacts;
  const concreteFallbackByCategory: Record<AiGuideResult["classification"]["category"], string[]> = {
    civil: ["상대방의 최근 답변과 요구 내용", "계약·지급·반환과 관련된 정확한 날짜와 금액"],
    criminal: ["현재 수사·재판 단계와 다음 예정일", "혐의 사실과 관련 증거의 구체적인 내용"],
    divorce: ["상대방의 이혼 의사와 현재 협의 내용", "재산·자녀·별거에 관한 정확한 현황"],
    inheritance: ["사망일과 상속 사실을 안 날짜", "상속재산·채무와 다른 상속인의 입장"],
    administrative: ["처분서 수령일과 불복기한", "처분 사유와 제출된 소명자료의 내용"],
    unclear: ["분쟁이 시작된 경위와 상대방의 입장", "중요한 날짜·금액·보유 문서의 구체적인 내용"],
  };
  const missingInformation = removeTrafficIrrelevantItems(
    ruleResult.missingInformation.length
      ? ruleResult.missingInformation
      : concreteFallbackByCategory[ruleResult.classification.category],
  );
  const recommendedDocuments = removeTrafficIrrelevantItems(ruleResult.recommendedDocuments);
  const safetyNotice = draft.safetyNotice ?? ruleResult.safetyNotice;
  const sectionComments = draft.sectionComments ?? {
    confirmedFacts: "확인된 사실을 바탕으로 사건의 핵심 쟁점을 정리할 수 있습니다.",
    missingInformation: "남은 쟁점은 변호사 상담을 통해 구체적으로 확인해보세요.",
    recommendedDocuments: "관련 자료를 지참하면 보다 정확한 상담에 도움이 됩니다.",
  };
  const violenceDivorce = ruleResult.classification.category === "divorce"
    && /폭언|욕설|모욕|가정폭력|폭행|상해|위협|물건을\s*집어던/.test([
      ruleResult.consultationSummary.userQuestion,
      ...ruleResult.confirmedFacts,
    ].join(" "));
  const visitationMatter = ruleResult.classification.category === "divorce"
    && /면접교섭|아이를\s*(?:보고|만나)|자녀를\s*(?:보고|만나)|아이를\s*보여주|자녀를\s*보여주/.test([
      ruleResult.consultationSummary.userQuestion,
      ...ruleResult.confirmedFacts,
    ].join(" "));
  const consultationOpinion = violenceDivorce || visitationMatter
    ? ruleResult.consultationOpinion
    : draft.consultationOpinion?.trim() || ruleResult.consultationOpinion;
  const allowedRelatedIds = new Set(draft.relatedContentIds ?? []);
  const relatedContent = draft.relatedContentIds
    ? {
        practices: ruleResult.relatedContent.practices.filter((item) => allowedRelatedIds.has(item.id)),
        cases: ruleResult.relatedContent.cases.filter((item) => allowedRelatedIds.has(item.id)).slice(0, 2),
        guides: ruleResult.relatedContent.guides.filter((item) => allowedRelatedIds.has(item.id)).slice(0, 2),
        faqs: ruleResult.relatedContent.faqs.filter((item) => allowedRelatedIds.has(item.id)).slice(0, 2),
      }
    : {
        practices: [],
        cases: ruleResult.relatedContent.cases.slice(0, 2),
        guides: ruleResult.relatedContent.guides.slice(0, 2),
        faqs: ruleResult.relatedContent.faqs.slice(0, 2),
      };

  return {
    ...ruleResult,
    situationSummary,
    confirmedFacts,
    missingInformation,
    recommendedDocuments,
    consultationOpinion,
    sectionComments,
    relatedContent,
    safetyNotice,
    generatedBy: "hybrid",
    consultationSummary: {
      ...ruleResult.consultationSummary,
      situationSummary,
      confirmedFacts,
      missingInformation,
      relatedContentIds: [
        ...relatedContent.practices,
        ...relatedContent.cases,
        ...relatedContent.guides,
        ...relatedContent.faqs,
      ].map((item) => item.id),
    },
  };
}
