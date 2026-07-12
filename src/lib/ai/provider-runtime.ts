import type { AiClassificationResult, AiGuideAnswer, AiGuideResult } from "@/types/ai-guide";
import { getOpenAiApiKey, getAiProviderSettings, getPromptVersion } from "./provider-config";
import {
  applyProviderClassification,
  applyProviderResultDraft,
  OpenAiLegalGuideProvider,
} from "./openai-provider";
import {
  canUseGenerativeAi,
  recordGenerativeFailure,
  recordGenerativeFallback,
  recordGenerativeUsage,
} from "./provider-usage";
import { saveAiGuideEvent } from "./session-store";

function isProviderReady() {
  const settings = getAiProviderSettings();
  return settings.generativeEnabled && Boolean(getOpenAiApiKey());
}

export async function enhanceClassificationWithProvider(
  sessionId: string,
  inputRedacted: string,
  ruleClassification: AiClassificationResult,
) {
  if (!isProviderReady()) return ruleClassification;
  const budget = canUseGenerativeAi();
  if (!budget.allowed) {
    recordGenerativeFallback();
    await saveAiGuideEvent(sessionId, "generative_fallback", { reason: budget.reason, stage: "classification" });
    return ruleClassification;
  }

  try {
    const provider = new OpenAiLegalGuideProvider({ apiKey: getOpenAiApiKey() });
    const response = await provider.classify(inputRedacted, ruleClassification, {
      sessionId,
      initialQuestionRedacted: inputRedacted,
      answers: [],
      promptVersion: getPromptVersion(),
    });
    recordGenerativeUsage(response.usage);
    await saveAiGuideEvent(sessionId, "generative_classification_succeeded", {
      provider: provider.name,
      promptVersion: getPromptVersion(),
    });
    return applyProviderClassification(ruleClassification, response.data);
  } catch (error) {
    recordGenerativeFailure();
    recordGenerativeFallback();
    await saveAiGuideEvent(sessionId, "generative_fallback", {
      reason: error instanceof Error ? error.message : "unknown",
      stage: "classification",
    });
    return ruleClassification;
  }
}

export async function enhanceResultWithProvider(
  ruleResult: AiGuideResult,
  initialQuestionRedacted: string,
  answers: AiGuideAnswer[],
) {
  if (!isProviderReady()) return ruleResult;
  const budget = canUseGenerativeAi();
  if (!budget.allowed) {
    recordGenerativeFallback();
    await saveAiGuideEvent(ruleResult.sessionId, "generative_fallback", { reason: budget.reason, stage: "result" });
    return {
      ...ruleResult,
      aiProviderNotice: "현재 AI 연결이 원활하지 않지만 기본 안내는 계속 이용할 수 있습니다.",
    };
  }

  try {
    const provider = new OpenAiLegalGuideProvider({ apiKey: getOpenAiApiKey() });
    const response = await provider.composeResult(ruleResult, {
      sessionId: ruleResult.sessionId,
      initialQuestionRedacted,
      answers,
      promptVersion: getPromptVersion(),
    });
    recordGenerativeUsage(response.usage);
    await saveAiGuideEvent(ruleResult.sessionId, "generative_result_succeeded", {
      provider: provider.name,
      promptVersion: getPromptVersion(),
    });
    return applyProviderResultDraft(ruleResult, response.data);
  } catch (error) {
    recordGenerativeFailure();
    recordGenerativeFallback();
    await saveAiGuideEvent(ruleResult.sessionId, "generative_fallback", {
      reason: error instanceof Error ? error.message : "unknown",
      stage: "result",
    });
    return {
      ...ruleResult,
      aiProviderNotice: "현재 AI 연결이 원활하지 않지만 기본 안내는 계속 이용할 수 있습니다.",
    };
  }
}
