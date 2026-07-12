import type { AiClassificationResult, AiGuideAnswer, AiGuideResult } from "./ai-guide";

export interface AiProviderContext {
  sessionId: string;
  initialQuestionRedacted: string;
  answers: AiGuideAnswer[];
  promptVersion: string;
}

export interface AiProviderClassification {
  category?: AiClassificationResult["category"];
  subcategory?: AiClassificationResult["subcategory"];
  confidence?: number;
  reasonSummary?: string;
  matchedTags?: string[];
}

export interface AiProviderResultDraft {
  situationSummary?: string;
  missingInformation?: string[];
  safetyNotice?: string;
}

export interface AiProviderUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  estimatedCostUsd?: number;
}

export interface AiProviderResponse<T> {
  data: T;
  usage?: AiProviderUsage;
}

export interface AiLegalGuideProvider {
  name: "rule" | "openai";
  classify(
    inputRedacted: string,
    ruleClassification: AiClassificationResult,
    context: AiProviderContext,
  ): Promise<AiProviderResponse<AiProviderClassification>>;
  composeResult(
    ruleResult: AiGuideResult,
    context: AiProviderContext,
  ): Promise<AiProviderResponse<AiProviderResultDraft>>;
}
