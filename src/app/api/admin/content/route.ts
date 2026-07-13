import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/auth";
import { listCmsContentItems, upsertCmsContentItem } from "@/lib/admin/cms-content-db";
import type { CmsContentItem } from "@/types/cms";

export const dynamic = "force-dynamic";

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;

  try {
    const items = await listCmsContentItems();
    return NextResponse.json({ items: items ?? [] });
  } catch {
    return NextResponse.json({ message: "콘텐츠를 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const body = (await request.json().catch(() => ({}))) as { item?: CmsContentItem };
  if (!body.item?.id || !body.item.type) {
    return NextResponse.json({ message: "저장할 콘텐츠가 올바르지 않습니다." }, { status: 400 });
  }

  try {
    await upsertCmsContentItem(body.item);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ message: "콘텐츠를 저장하지 못했습니다." }, { status: 500 });
  }
}
