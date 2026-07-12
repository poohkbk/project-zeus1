import { NextRequest, NextResponse } from "next/server";
import { classifyLegalQuestion } from "@/lib/ai/classifier";
import { getQuestionsForCategory } from "@/lib/ai/question-engine";
import { getLocalAiGuideSession, updateAiGuideSession } from "@/lib/ai/session-store";
import type { AiLegalCategory } from "@/types/ai-guide";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    sessionId?: string;
    category?: AiLegalCategory;
  };
  if (!body.sessionId) return NextResponse.json({ message: "세션이 없습니다." }, { status: 400 });
  const session = getLocalAiGuideSession(body.sessionId);
  if (!session) return NextResponse.json({ message: "세션을 찾을 수 없습니다." }, { status: 404 });

  const classification = classifyLegalQuestion(session.initialQuestionRedacted, body.category);
  const updated = await updateAiGuideSession({
    ...session,
    status: "questioning",
    classification,
    answers: [],
  });

  return NextResponse.json({
    classification: updated.classification,
    questions: getQuestionsForCategory(updated.classification.category),
  });
}
