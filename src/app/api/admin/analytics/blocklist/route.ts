import { NextRequest, NextResponse } from "next/server";
import { blockIp, loadBlockedIps, unblockIp } from "@/lib/admin/ip-blocklist";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ blockedIps: loadBlockedIps() });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { ip?: string; reason?: string };
  if (!body.ip?.trim()) {
    return NextResponse.json({ message: "차단할 IP를 입력해주세요." }, { status: 400 });
  }

  return NextResponse.json({ blockedIps: blockIp(body.ip, body.reason) });
}

export async function DELETE(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { ip?: string };
  if (!body.ip?.trim()) {
    return NextResponse.json({ message: "해제할 IP를 입력해주세요." }, { status: 400 });
  }

  return NextResponse.json({ blockedIps: unblockIp(body.ip) });
}
