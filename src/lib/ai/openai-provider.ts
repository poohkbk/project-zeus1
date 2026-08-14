import { aiCategoryLabels, aiSubcategoryLabels } from "@/data/ai/categories";
import type { AiClassificationResult, AiLegalCategory, AiSubcategory } from "@/types/ai-guide";
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
  return {
    situationSummary: safeString(value.situationSummary, 520),
    confirmedFacts: stringArray(value.confirmedFacts, 8),
    missingInformation: stringArray(value.missingInformation, 8),
    recommendedDocuments: stringArray(value.recommendedDocuments, 8),
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
    const options = Array.isArray(draft.options)
      ? draft.options.slice(0, 5).flatMap((option) => {
          if (!option || typeof option !== "object" || Array.isArray(option)) return [];
          const entry = option as Record<string, unknown>;
          const label = safeString(entry.label, 60)?.trim();
          const optionValue = safeString(entry.value, 40)?.trim();
          return label && optionValue ? [{ label, value: optionValue }] : [];
        })
      : undefined;
    return [{
      question,
      helpText: safeString(draft.helpText, 220),
      type: type === "single_choice" && (!options || options.length < 2) ? "short_text" : type,
      required: draft.required !== false,
      options,
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
          "You write cautious Korean legal guide copy for LAW OFFICE ZEU. Return JSON only. Never guarantee acquittal, victory, sentence, property division ratio, or administrative outcome. Do not cite content not provided.",
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
            missingInformation: ["Korean items, no private data, max 8"],
            recommendedDocuments: ["documents specifically useful for these facts and answers, Korean, max 8"],
            relatedContentIds: ["IDs from publicRelatedContent that are directly relevant; empty array when none"],
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
          "You create a short Korean legal consultation intake flow for LAW OFFICE ZEU. Return JSON only. Ask only facts needed for a lawyer to understand the matter. Never request resident registration numbers, account passwords, unnecessary identifying data, illegal acts, or predictions of case outcomes. Questions must be neutral, plain Korean, and one fact per question.",
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
  const confirmedFacts = draft.confirmedFacts?.length
    ? draft.confirmedFacts
    : ruleResult.confirmedFacts;
  const missingInformation = draft.missingInformation
    ? draft.missingInformation
    : ruleResult.missingInformation;
  const recommendedDocuments = draft.recommendedDocuments?.length
    ? draft.recommendedDocuments
    : ruleResult.recommendedDocuments;
  const safetyNotice = draft.safetyNotice ?? ruleResult.safetyNotice;
  const allowedRelatedIds = new Set(draft.relatedContentIds ?? []);
  const relatedContent = draft.relatedContentIds
    ? {
        practices: ruleResult.relatedContent.practices.filter((item) => allowedRelatedIds.has(item.id)),
        cases: ruleResult.relatedContent.cases.filter((item) => allowedRelatedIds.has(item.id)),
        guides: ruleResult.relatedContent.guides.filter((item) => allowedRelatedIds.has(item.id)),
        faqs: ruleResult.relatedContent.faqs.filter((item) => allowedRelatedIds.has(item.id)),
      }
    : ruleResult.relatedContent;

  return {
    ...ruleResult,
    situationSummary,
    confirmedFacts,
    missingInformation,
    recommendedDocuments,
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
