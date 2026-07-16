import { NextRequest, NextResponse } from "next/server";
import { recordAnalyticsVisit } from "@/lib/admin/analytics-store";

export const dynamic = "force-dynamic";

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwardedFor || realIp || "local-preview";
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { path?: string };
  const visitPath = body.path?.startsWith("/") ? body.path : "/";

  if (visitPath.startsWith("/admin") || visitPath.startsWith("/api")) {
    return NextResponse.json({ recorded: false });
  }

  const result = await (async () => {
    try {
      return await recordAnalyticsVisit({
        ip: getClientIp(request),
        path: visitPath,
        userAgent: request.headers.get("user-agent") ?? "unknown",
      });
    } catch {
      return { storage: "none" as const, reason: "local_fallback_failed" as const };
    }
  })();

  return NextResponse.json({
    recorded: Boolean(result.visit),
    visitId: result.visit?.id,
    storage: result.storage,
    reason: result.reason,
  });
}
