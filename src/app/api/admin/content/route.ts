import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdminApi } from "@/lib/admin/auth";
import { deleteCmsContentItem, listCmsContentItems, upsertCmsContentItem } from "@/lib/admin/cms-content-db";
import type { CmsContentItem, CmsContentType } from "@/types/cms";

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

export async function DELETE(request: NextRequest) {
  const { admin, response } = await requireAdminApi();
  if (response) return response;

  if (admin?.role !== "super_admin") {
    return NextResponse.json({ message: "영구 삭제는 최고관리자만 할 수 있습니다." }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as { item?: CmsContentItem };
  const id = String(body.item?.id ?? request.nextUrl.searchParams.get("id") ?? "").trim();
  const type = String(body.item?.type ?? request.nextUrl.searchParams.get("type") ?? "").trim() as CmsContentType;

  if (!id || !["case", "guide", "faq"].includes(type)) {
    return NextResponse.json({ message: "삭제할 콘텐츠 정보가 올바르지 않습니다." }, { status: 400 });
  }

  try {
    await deleteCmsContentItem(body.item ?? ({ id, type } as CmsContentItem));
    if (type === "faq") {
      revalidateTag("published-faqs");
      revalidatePath("/faq");
      revalidatePath("/practice");
    } else if (type === "case") {
      revalidateTag("published-cases");
      revalidatePath("/");
      revalidatePath("/cases");
    } else {
      revalidateTag("published-legal-guides");
      revalidatePath("/");
      revalidatePath("/legal-guide");
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "콘텐츠를 영구 삭제하지 못했습니다.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
