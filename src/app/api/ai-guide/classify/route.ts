import { NextRequest, NextResponse } from "next/server";
import { classifyLegalQuestion } from "@/lib/ai/classifier";
import { getQuestionsForCategory } from "@/lib/ai/question-engine";
import { isAiSessionOwner } from "@/lib/ai/session-auth";
import { getLocalAiGuideSession, saveAiGuideEvent, updateAiGuideSession } from "@/lib/ai/session-store";
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
  if (!isAiSessionOwner(request, session)) {
    return NextResponse.json({ message: "세션에 접근할 수 없습니다." }, { status: 403 });
  }

  const classification = classifyLegalQuestion(session.initialQuestionRedacted, body.category);
  const updated = await updateAiGuideSession({
    ...session,
    status: "questioning",
    classification,
    answers: [],
  });
  await saveAiGuideEvent(updated.id, "category_confirmed", {
    category: updated.classification.category,
    subcategory: updated.classification.subcategory,
  });

  return NextResponse.json({
    classification: updated.classification,
    questions: getQuestionsForCategory(updated.classification.category),
  });
}
