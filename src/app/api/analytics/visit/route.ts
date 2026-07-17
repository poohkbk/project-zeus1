import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { recordAnalyticsVisit } from "@/lib/admin/analytics-store";
import { getClientIp, rejectCrossOriginRequest } from "@/lib/security/request-guard";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;

  const ip = getClientIp(request);
  const limited = checkRateLimit(`analytics:${ip}`, 60, 60_000);
  if (!limited.allowed) return NextResponse.json({ recorded: false }, { status: 429 });

  const body = (await request.json().catch(() => ({}))) as { path?: string };
  const visitPath = body.path?.startsWith("/") ? body.path : "/";

  if (visitPath.startsWith("/admin") || visitPath.startsWith("/api")) {
    return NextResponse.json({ recorded: false });
  }

  const result = await (async () => {
    try {
      return await recordAnalyticsVisit({
        ip,
        path: visitPath,
        userAgent: request.headers.get("user-agent") ?? "unknown",
      });
    } catch {
      return { storage: "none" as const, reason: "local_fallback_failed" as const };
    }
  })();

  return NextResponse.json({
    recorded: Boolean(result.visit),
    storage: result.storage,
    reason: result.reason,
  });
}
