import { NextRequest, NextResponse } from "next/server";
import { isAiSessionOwner } from "@/lib/ai/session-auth";
import {
  createTransferToken,
  getAiGuideSessionByTransferToken,
  getLocalAiGuideSession,
  saveAiGuideEvent,
  updateAiGuideSession,
} from "@/lib/ai/session-store";
import { rejectCrossOriginRequest } from "@/lib/security/request-guard";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;

  const body = (await request.json().catch(() => ({}))) as {
    sessionId?: string;
    consent?: boolean;
  };
  if (!body.sessionId || !body.consent) {
    return NextResponse.json({ message: "상담 전달 동의가 필요합니다." }, { status: 400 });
  }
  const session = getLocalAiGuideSession(body.sessionId);
  if (!session || !session.result) {
    return NextResponse.json({ message: "전달할 AI 요약이 없습니다." }, { status: 404 });
  }
  if (!isAiSessionOwner(request, session)) {
    return NextResponse.json({ message: "세션에 접근할 수 없습니다." }, { status: 403 });
  }

  const transferToken = createTransferToken();
  await updateAiGuideSession({
    ...session,
    status: "transferred",
    consentToTransfer: true,
    transferToken,
  });
  await saveAiGuideEvent(session.id, "transfer_token_created", { consent: true });

  return NextResponse.json({ transferToken });
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const session = token ? getAiGuideSessionByTransferToken(token) : undefined;
  if (!session?.result || !session.consentToTransfer) {
    return NextResponse.json({ message: "AI 요약을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({
    token,
    summary: session.result.consultationSummary,
  });
}
