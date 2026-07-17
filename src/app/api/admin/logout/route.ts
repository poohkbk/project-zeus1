import { NextRequest, NextResponse } from "next/server";
import { rejectCrossOriginRequest } from "@/lib/security/request-guard";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;

  const supabase = await createClient();
  await supabase?.auth.signOut();

  return NextResponse.json({ success: true });
}
