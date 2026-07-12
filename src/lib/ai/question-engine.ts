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

export function upsertAnswer(answers: AiGuideAnswer[], nextAnswer: AiGuideAnswer) {
  return [
    ...answers.filter((answer) => answer.questionId !== nextAnswer.questionId),
    nextAnswer,
  ].sort((a, b) => a.answeredAt.localeCompare(b.answeredAt));
}
