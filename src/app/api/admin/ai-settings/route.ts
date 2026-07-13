import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { getAiProviderSettings, saveAiProviderSettings } from "@/lib/ai/provider-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;

  return NextResponse.json(getAiProviderSettings());
}

export async function PATCH(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const body = (await request.json().catch(() => ({}))) as { generativeEnabled?: boolean };
  return NextResponse.json(
    saveAiProviderSettings({
      generativeEnabled: Boolean(body.generativeEnabled),
    }),
  );
}
