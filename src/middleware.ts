import { NextRequest, NextResponse } from "next/server";
import { applySecurityHeaders } from "@/lib/security/request-guard";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/web/support/support.asp") {
    const destination = request.nextUrl.clone();
    destination.pathname = "/consultation";
    destination.search = "";
    return applySecurityHeaders(NextResponse.redirect(destination, 301));
  }

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
  matcher: ["/admin/:path*", "/api/:path*", "/web/support/support.asp"],
};
