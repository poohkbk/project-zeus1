import { NextRequest, NextResponse } from "next/server";
import {
  createTransferToken,
  getAiGuideSessionByTransferToken,
  getLocalAiGuideSession,
  updateAiGuideSession,
} from "@/lib/ai/session-store";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
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
  const transferToken = createTransferToken();
  await updateAiGuideSession({
    ...session,
    status: "transferred",
    consentToTransfer: true,
    transferToken,
  });

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
