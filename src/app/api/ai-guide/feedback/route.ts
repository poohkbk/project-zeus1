import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { getClientIp, rejectCrossOriginRequest } from "@/lib/security/request-guard";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;

  const limited = checkRateLimit(`ai-feedback:${getClientIp(request)}`, 10, 60_000);
  if (!limited.allowed) {
    return NextResponse.json({ message: "잠시 후 다시 시도해 주세요." }, { status: 429 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    sessionId?: string;
    rating?: number;
    reason?: string;
  };
  if (!body.sessionId || !body.rating || body.rating < 1 || body.rating > 5) {
    return NextResponse.json({ message: "평가 정보가 올바르지 않습니다." }, { status: 400 });
  }

  return NextResponse.json({ saved: true });
}
