import { NextRequest, NextResponse } from "next/server";
import { buildAiGuideResult } from "@/lib/ai/answer-composer";
import { getLocalAiGuideSession, updateAiGuideSession } from "@/lib/ai/session-store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { sessionId?: string };
  if (!body.sessionId) return NextResponse.json({ message: "세션이 없습니다." }, { status: 400 });
  const session = getLocalAiGuideSession(body.sessionId);
  if (!session) return NextResponse.json({ message: "세션을 찾을 수 없습니다." }, { status: 404 });

  const result = buildAiGuideResult(
    session.id,
    session.initialQuestionRedacted,
    session.classification,
    session.answers,
  );
  const updated = await updateAiGuideSession({
    ...session,
    status: "completed",
    result,
  });

  return NextResponse.json({ result: updated.result });
}
