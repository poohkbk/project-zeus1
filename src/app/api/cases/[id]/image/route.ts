import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type CaseImageRow = {
  hero_image_url: string | null;
  content?: unknown;
};

function getInlineImage(row: CaseImageRow) {
  if (row.hero_image_url?.startsWith("data:image/")) return row.hero_image_url;

  if (typeof row.content !== "object" || row.content === null) return undefined;
  const heroImage = (row.content as { heroImage?: unknown }).heroImage;
  return typeof heroImage === "string" && heroImage.startsWith("data:image/")
    ? heroImage
    : undefined;
}

function decodeInlineImage(value: string) {
  const match = value.match(
    /^data:(image\/(?:png|jpeg|webp|gif));base64,([a-z0-9+/=\r\n]+)$/i,
  );
  if (!match || match[2].length > 8_000_000) return undefined;

  const bytes = Uint8Array.from(Buffer.from(match[2], "base64"));
  if (bytes.byteLength === 0) return undefined;
  return { contentType: match[1].toLowerCase(), bytes };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createAdminClient();
  if (!supabase) return new Response(null, { status: 404 });

  const { data, error } = await supabase
    .from("cases")
    .select("hero_image_url,content")
    .eq("id", id)
    .eq("status", "published")
    .limit(1)
    .maybeSingle();

  if (error || !data) return new Response(null, { status: 404 });

  const inlineImage = getInlineImage(data as CaseImageRow);
  const image = inlineImage ? decodeInlineImage(inlineImage) : undefined;
  if (!image) return new Response(null, { status: 404 });

  return new Response(image.bytes, {
    headers: {
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      "Content-Type": image.contentType,
      "Content-Length": String(image.bytes.byteLength),
      "X-Content-Type-Options": "nosniff",
    },
  });
}
