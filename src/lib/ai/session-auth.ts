import type { NextRequest, NextResponse } from "next/server";
import type { AiGuideSessionRecord } from "@/types/ai-guide";

function sessionCookieName(sessionId: string) {
  return `zeu_ai_session_${sessionId}`;
}

export function attachAiSessionCookie(response: NextResponse, session: AiGuideSessionRecord) {
  response.cookies.set(sessionCookieName(session.id), session.publicToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(session.expiresAt),
  });
  return response;
}

export function isAiSessionOwner(request: NextRequest, session: AiGuideSessionRecord) {
  return request.cookies.get(sessionCookieName(session.id))?.value === session.publicToken;
}
