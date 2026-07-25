import { NextRequest, NextResponse } from "next/server";
import { applySecurityHeaders } from "@/lib/security/request-guard";

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-zeu-pathname", request.nextUrl.pathname);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  return applySecurityHeaders(response);
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
