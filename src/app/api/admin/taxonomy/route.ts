import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { deleteContentTag, listContentTags, upsertContentTag } from "@/lib/admin/taxonomy-db";
import { rejectCrossOriginRequest } from "@/lib/security/request-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;

  try {
    const tags = await listContentTags();
    return NextResponse.json({ tags: tags ?? [] });
  } catch {
    return NextResponse.json({ message: "추천태그를 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;

  const { response } = await requireAdminApi();
  if (response) return response;

  const body = (await request.json().catch(() => ({}))) as { label?: string };
  const label = String(body.label ?? "").trim();

  if (!label) {
    return NextResponse.json({ message: "추가할 태그를 입력해 주세요." }, { status: 400 });
  }

  try {
    const tags = await upsertContentTag(label);
    return NextResponse.json({ tags: tags ?? [] });
  } catch {
    return NextResponse.json({ message: "추천태그를 저장하지 못했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;

  const { response } = await requireAdminApi();
  if (response) return response;

  const label = String(request.nextUrl.searchParams.get("label") ?? "").trim();
  if (!label) {
    return NextResponse.json({ message: "삭제할 태그를 선택해 주세요." }, { status: 400 });
  }

  try {
    const tags = await deleteContentTag(label);
    return NextResponse.json({ tags: tags ?? [] });
  } catch {
    return NextResponse.json({ message: "추천태그를 삭제하지 못했습니다." }, { status: 500 });
  }
}
