import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdminApi } from "@/lib/admin/auth";
import { listCmsContentItems, upsertCmsContentItem } from "@/lib/admin/cms-content-db";
import type { CmsContentItem } from "@/types/cms";

export const dynamic = "force-dynamic";

function revalidatePublicContent(item: CmsContentItem) {
  if (item.type === "faq") {
    revalidateTag("published-faqs");
    revalidatePath("/faq");
    revalidatePath("/practice");
    return;
  }

  if (item.type === "case") {
    revalidateTag("published-cases");
    revalidatePath("/");
    revalidatePath("/cases");
    revalidatePath(`/cases/${item.seo?.canonicalPath?.split("/").filter(Boolean).pop() ?? item.id}`);
    return;
  }

  if (item.type === "guide") {
    revalidateTag("published-legal-guides");
    revalidatePath("/");
    revalidatePath("/legal-guide");
    revalidatePath(`/legal-guide/${item.seo?.canonicalPath?.split("/").filter(Boolean).pop() ?? item.id}`);
  }
}

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;

  try {
    const items = await listCmsContentItems();
    return NextResponse.json({ items: items ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "콘텐츠를 불러오지 못했습니다.";
    return NextResponse.json({ message }, { status: 500 });
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
    revalidatePublicContent(body.item);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "콘텐츠를 저장하지 못했습니다.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
