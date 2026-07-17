import { NextRequest, NextResponse } from "next/server";
import { redactSensitiveData } from "@/lib/ai/redaction";
import { getNextQuestion, getQuestionsForCategory, upsertAnswer } from "@/lib/ai/question-engine";
import { isAiSessionOwner } from "@/lib/ai/session-auth";
import { getLocalAiGuideSession, saveAiGuideEvent, updateAiGuideSession } from "@/lib/ai/session-store";
import { rejectCrossOriginRequest } from "@/lib/security/request-guard";
import type { AiGuideAnswer } from "@/types/ai-guide";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;

  const body = (await request.json().catch(() => ({}))) as {
    sessionId?: string;
    answer?: Omit<AiGuideAnswer, "answeredAt">;
  };
  if (!body.sessionId || !body.answer) {
    return NextResponse.json({ message: "답변 정보가 부족합니다." }, { status: 400 });
  }
  const session = getLocalAiGuideSession(body.sessionId);
  if (!session) return NextResponse.json({ message: "세션을 찾을 수 없습니다." }, { status: 404 });
  if (!isAiSessionOwner(request, session)) {
    return NextResponse.json({ message: "세션에 접근할 수 없습니다." }, { status: 403 });
  }

  const value =
    typeof body.answer.value === "string"
      ? redactSensitiveData(body.answer.value).redacted
      : body.answer.value;
  const nextAnswers = upsertAnswer(session.answers, {
    ...body.answer,
    value,
    answeredAt: new Date().toISOString(),
  });
  const validQuestionIds = new Set(
    getQuestionsForCategory(session.classification.category, nextAnswers).map((question) => question.id),
  );
  const filteredAnswers = nextAnswers.filter((answer) => validQuestionIds.has(answer.questionId));
  const updated = await updateAiGuideSession({
    ...session,
    status: "questioning",
    answers: filteredAnswers,
  });
  await saveAiGuideEvent(updated.id, "answer_saved", {
    questionId: body.answer.questionId,
    field: body.answer.field,
  });

  const questions = getQuestionsForCategory(updated.classification.category, updated.answers);

  return NextResponse.json({
    answers: updated.answers,
    nextQuestion: getNextQuestion(updated.classification.category, updated.answers),
    questions,
    totalQuestions: questions.length,
  });
}
