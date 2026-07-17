import { NextRequest, NextResponse } from "next/server";

export function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwardedFor || realIp || "local-preview";
}

export function rejectCrossOriginRequest(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin) return undefined;

  try {
    const originUrl = new URL(origin);
    if (originUrl.host === request.nextUrl.host) return undefined;
  } catch {
    return NextResponse.json({ message: "요청 출처를 확인할 수 없습니다." }, { status: 403 });
  }

  return NextResponse.json({ message: "허용되지 않은 요청 출처입니다." }, { status: 403 });
}

export function applySecurityHeaders(response: NextResponse) {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  response.headers.set("X-DNS-Prefetch-Control", "on");
  return response;
}
