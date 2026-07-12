import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
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
