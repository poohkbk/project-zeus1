import { NextResponse } from "next/server";
import { getAnalyticsDashboard } from "@/lib/admin/analytics-store";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getAnalyticsDashboard());
}
