import type { AiClassificationResult, AiGuideAnswer, AiGuideResult } from "@/types/ai-guide";
import type { AiGuideQuestion } from "@/types/ai-guide";
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
  questions: AiGuideQuestion[] = [],
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
      questions,
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

export async function createTailoredQuestions(
  sessionId: string,
  initialQuestionRedacted: string,
  classification: AiClassificationResult,
  fallbackQuestions: AiGuideQuestion[],
) {
  if (!isProviderReady()) return fallbackQuestions;
  const budget = canUseGenerativeAi();
  if (!budget.allowed) {
    recordGenerativeFallback();
    return fallbackQuestions;
  }

  try {
    const provider = new OpenAiLegalGuideProvider({ apiKey: getOpenAiApiKey() });
    const response = await provider.createQuestions(classification, {
      sessionId,
      initialQuestionRedacted,
      answers: [],
      promptVersion: getPromptVersion(),
    });
    recordGenerativeUsage(response.usage);
    if (response.data.length < 3) return fallbackQuestions;
    const category = classification.category === "unclear" ? "civil" : classification.category;
    const questions: AiGuideQuestion[] = response.data.slice(0, 6).map((draft, index) => ({
      id: `ai-followup-${index + 1}`,
      category,
      order: index + 1,
      field: category === "criminal" && index === 0 ? "partyRole" : `aiFollowup${index + 1}`,
      type: category === "criminal" && index === 0 ? "single_choice" : draft.type ?? "short_text",
      question: category === "criminal" && index === 0 ? "현재 어느 입장에 가깝습니까?" : draft.question ?? "추가로 확인할 내용을 입력해주세요.",
      helpText: draft.helpText,
      required: draft.required !== false,
      options: category === "criminal" && index === 0 ? [
        { value: "suspect", label: "피의자·피고소인·피고인" },
        { value: "victim", label: "피해자·고소인" },
        { value: "witness", label: "참고인·증인" },
        { value: "unknown", label: "잘 모르겠습니다" },
      ] : draft.options?.map((option) => ({
        value: option.value ?? "",
        label: option.label ?? "",
      })).filter((option) => option.value && option.label),
    }));
    await saveAiGuideEvent(sessionId, "tailored_questions_created", { count: questions.length });
    return questions;
  } catch (error) {
    recordGenerativeFailure();
    recordGenerativeFallback();
    await saveAiGuideEvent(sessionId, "generative_fallback", {
      reason: error instanceof Error ? error.message : "unknown",
      stage: "questions",
    });
    return fallbackQuestions;
  }
}
