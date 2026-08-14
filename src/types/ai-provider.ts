import type { AiClassificationResult, AiGuideAnswer, AiGuideQuestion, AiGuideResult } from "./ai-guide";

export interface AiProviderContext {
  sessionId: string;
  initialQuestionRedacted: string;
  answers: AiGuideAnswer[];
  questions?: AiGuideQuestion[];
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
  confirmedFacts?: string[];
  missingInformation?: string[];
  recommendedDocuments?: string[];
  sectionComments?: AiGuideResult["sectionComments"];
  relatedContentIds?: string[];
  safetyNotice?: string;
}

export interface AiProviderQuestionDraft {
  question?: string;
  helpText?: string;
  type?: AiGuideQuestion["type"];
  required?: boolean;
  options?: Array<{ value?: string; label?: string }>;
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
  createQuestions(
    classification: AiClassificationResult,
    context: AiProviderContext,
  ): Promise<AiProviderResponse<AiProviderQuestionDraft[]>>;
  composeResult(
    ruleResult: AiGuideResult,
    context: AiProviderContext,
  ): Promise<AiProviderResponse<AiProviderResultDraft>>;
}
