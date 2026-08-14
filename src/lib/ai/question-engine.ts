import { aiQuestionFlows } from "@/data/ai/question-flows";
import type { AiGuideAnswer, AiGuideQuestion, AiLegalCategory } from "@/types/ai-guide";

export function getAnswerMap(answers: AiGuideAnswer[]) {
  return new Map(answers.map((answer) => [answer.field, answer.value]));
}

function shouldShowQuestion(question: AiGuideQuestion, answers: AiGuideAnswer[]) {
  if (!question.showWhen) return true;
  const answerMap = getAnswerMap(answers);
  const value = answerMap.get(question.showWhen.field);

  if (question.showWhen.operator === "equals") return value === question.showWhen.value;
  if (question.showWhen.operator === "not_equals") return value !== question.showWhen.value;
  if (question.showWhen.operator === "includes") {
    return Array.isArray(value) ? value.includes(String(question.showWhen.value)) : value === question.showWhen.value;
  }

  return true;
}

const booleanQuestionEnding = /(?:있나요|없나요|인가요|하나요|했나요|받았나요|되었나요|중인가요|맞나요)\?$/;

function isBooleanQuestion(question: string, type?: AiGuideQuestion["type"]) {
  return type === "boolean" || (["short_text", "long_text"].includes(type ?? "") && booleanQuestionEnding.test(question.trim()));
}

const yesNoOptions = [
  { value: "yes", label: "예" },
  { value: "no", label: "아니오" },
];

export function getQuestionsForCategory(category: AiLegalCategory, answers: AiGuideAnswer[] = []) {
  if (category === "unclear") return [];
  return aiQuestionFlows[category]
    .filter((question) => shouldShowQuestion(question, answers))
    .sort((a, b) => a.order - b.order);
}

export function getNextQuestion(category: AiLegalCategory, answers: AiGuideAnswer[]) {
  const answeredIds = new Set(answers.map((answer) => answer.questionId));
  return getQuestionsForCategory(category, answers).find((question) => !answeredIds.has(question.id));
}

export function sanitizeQuestionFlow(value: unknown, category: AiLegalCategory) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 6 || category === "unclear") return undefined;
  const allowedTypes = new Set(["single_choice", "date", "short_text", "long_text", "boolean"]);
  const questions = value.flatMap((item, index): AiGuideQuestion[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const candidate = item as Partial<AiGuideQuestion>;
    const expectedField = category === "criminal" && index === 0 ? "partyRole" : `aiFollowup${index + 1}`;
    if (
      candidate.id !== `ai-followup-${index + 1}` ||
      candidate.field !== expectedField ||
      typeof candidate.question !== "string" ||
      !candidate.question.trim() ||
      !allowedTypes.has(candidate.type ?? "")
    ) return [];
    const options = Array.isArray(candidate.options)
      ? candidate.options.slice(0, 5).flatMap((option) =>
          option && typeof option.value === "string" && typeof option.label === "string"
            ? [{ value: option.value.slice(0, 40), label: option.label.slice(0, 60) }]
            : [],
        )
      : undefined;
    const booleanQuestion = isBooleanQuestion(candidate.question, candidate.type);
    return [{
      id: candidate.id,
      category,
      order: index + 1,
      field: candidate.field,
      type: booleanQuestion ? "boolean" : candidate.type!,
      question: candidate.question.slice(0, 180),
      helpText: typeof candidate.helpText === "string" ? candidate.helpText.slice(0, 220) : undefined,
      required: candidate.required !== false,
      options: booleanQuestion
        ? yesNoOptions
        : candidate.type === "single_choice" && (options?.length ?? 0) >= 2
          ? options
          : undefined,
    }];
  });
  return questions.length === value.length ? questions : undefined;
}

export function getNextQuestionFromFlow(questions: AiGuideQuestion[], answers: AiGuideAnswer[]) {
  const answeredIds = new Set(answers.map((answer) => answer.questionId));
  return questions.find((question) => !answeredIds.has(question.id));
}

export function upsertAnswer(answers: AiGuideAnswer[], nextAnswer: AiGuideAnswer) {
  return [
    ...answers.filter((answer) => answer.questionId !== nextAnswer.questionId),
    nextAnswer,
  ].sort((a, b) => a.answeredAt.localeCompare(b.answeredAt));
}
