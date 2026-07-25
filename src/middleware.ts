import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { applySecurityHeaders } from "@/lib/security/request-guard";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-zeu-pathname", request.nextUrl.pathname);

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  // Public pages do not use a Supabase session. Avoid a remote auth request on
  // every page view and only refresh cookies for the protected admin surface.
  const isAdminRequest =
    request.nextUrl.pathname.startsWith("/admin") ||
    request.nextUrl.pathname.startsWith("/api/admin");
  if (!isAdminRequest) return applySecurityHeaders(response);

  const supabaseUrl = getSupabaseUrl();
  const supabaseKey = getSupabasePublishableKey();
  if (!supabaseUrl || !supabaseKey) return applySecurityHeaders(response);

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.getUser();

  return applySecurityHeaders(response);
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*"],
};
