import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { getAnalyticsDashboard } from "@/lib/admin/analytics-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;

  return NextResponse.json(await getAnalyticsDashboard());
}
