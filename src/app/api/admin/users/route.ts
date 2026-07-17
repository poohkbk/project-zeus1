import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { createAdminUser, deleteAdminUser, listAdminUsers, updateAdminUser } from "@/lib/admin/users-db";
import { rejectCrossOriginRequest } from "@/lib/security/request-guard";

export const dynamic = "force-dynamic";

function normalizeEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeName(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function requireSuperAdmin() {
  const { admin, response } = await requireAdminApi();
  if (response) return { admin, response };
  if (admin?.role !== "super_admin") {
    return {
      admin,
      response: NextResponse.json({ message: "최고관리자만 처리할 수 있습니다." }, { status: 403 }),
    };
  }
  return { admin, response: undefined };
}

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;

  try {
    const admins = await listAdminUsers();
    return NextResponse.json({ admins: admins ?? [] });
  } catch {
    return NextResponse.json({ message: "관리자 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;

  const { response } = await requireSuperAdmin();
  if (response) return response;

  const body = (await request.json().catch(() => ({}))) as { name?: string; email?: string };
  const name = normalizeName(body.name || "초대 대기");
  const email = normalizeEmail(body.email);

  if (!isValidEmail(email)) {
    return NextResponse.json({ message: "올바른 이메일을 입력해 주세요." }, { status: 400 });
  }

  try {
    const admin = await createAdminUser({ name, email });
    return NextResponse.json({ admin });
  } catch {
    return NextResponse.json({ message: "관리자를 추가하지 못했습니다." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;

  const { response } = await requireSuperAdmin();
  if (response) return response;

  const body = (await request.json().catch(() => ({}))) as { id?: string; name?: string; email?: string };
  const id = String(body.id ?? "");
  const name = normalizeName(body.name);
  const email = normalizeEmail(body.email);

  if (!id || !name || !isValidEmail(email)) {
    return NextResponse.json({ message: "이름과 이메일을 확인해 주세요." }, { status: 400 });
  }

  try {
    const admin = await updateAdminUser(id, { name, email });
    if (!admin) return NextResponse.json({ message: "수정할 관리자를 찾지 못했습니다." }, { status: 404 });
    return NextResponse.json({ admin });
  } catch {
    return NextResponse.json({ message: "관리자 정보를 수정하지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;

  const { response } = await requireSuperAdmin();
  if (response) return response;

  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ message: "삭제할 관리자를 선택해 주세요." }, { status: 400 });

  try {
    await deleteAdminUser(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "관리자를 삭제하지 못했습니다." }, { status: 500 });
  }
}
