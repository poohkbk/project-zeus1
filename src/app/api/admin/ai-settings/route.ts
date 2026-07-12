import { NextRequest, NextResponse } from "next/server";
import { getAiProviderSettings, saveAiProviderSettings } from "@/lib/ai/provider-config";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getAiProviderSettings());
}

export async function PATCH(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { generativeEnabled?: boolean };
  return NextResponse.json(
    saveAiProviderSettings({
      generativeEnabled: Boolean(body.generativeEnabled),
    }),
  );
}
