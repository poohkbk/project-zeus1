import { aiCategoryLabels, aiSubcategoryLabels } from "@/data/ai/categories";
import type { AiClassificationResult, AiLegalCategory, AiSubcategory } from "@/types/ai-guide";
import type {
  AiLegalGuideProvider,
  AiProviderClassification,
  AiProviderContext,
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
    missingInformation: stringArray(value.missingInformation, 8),
    safetyNotice: safeString(value.safetyNotice, 520),
  };
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
          answers: context.answers.map((answer) => ({
            field: answer.field,
            value: answer.value,
          })),
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
            missingInformation: ["Korean items, no private data, max 8"],
            safetyNotice: "Korean disclaimer, no outcome guarantee",
          },
        }),
      },
    ]);
    return { data: validateResultDraft(json.data), usage: json.usage };
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
  const missingInformation = draft.missingInformation?.length
    ? Array.from(new Set([...draft.missingInformation, ...ruleResult.missingInformation])).slice(0, 8)
    : ruleResult.missingInformation;
  const safetyNotice = draft.safetyNotice ?? ruleResult.safetyNotice;

  return {
    ...ruleResult,
    situationSummary,
    missingInformation,
    safetyNotice,
    generatedBy: "hybrid",
    consultationSummary: {
      ...ruleResult.consultationSummary,
      situationSummary,
      missingInformation,
    },
  };
}
