import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export type PublicTestimonial = {
  id: string;
  title: string;
  category: string;
  body: string;
  imageUrl?: string;
  imageAlt?: string;
  publishedAt?: string;
  updatedAt?: string;
  createdAt?: string;
};

type TestimonialRow = {
  id: string;
  title: string;
  category: string;
  summary: string | null;
  body: string;
  hero_image_url: string | null;
  hero_image_alt: string | null;
  published_at: string | null;
  updated_at: string;
  created_at: string;
  content?: unknown;
};

function isStoredTestimonial(value: unknown): value is { type: "testimonial" } {
  return typeof value === "object" && value !== null && "type" in value && value.type === "testimonial";
}

function mapRows(rows: TestimonialRow[]): PublicTestimonial[] {
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    category: row.category,
    body: row.body,
    imageUrl: row.hero_image_url ?? undefined,
    imageAlt: row.hero_image_alt ?? undefined,
    publishedAt: row.published_at ?? row.created_at,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
  }));
}

export const getPublishedTestimonials = unstable_cache(
  async (): Promise<PublicTestimonial[]> => {
    const supabase = createAdminClient();
    if (!supabase) return [];

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("testimonials")
      .select("id,title,category,summary,body,hero_image_url,hero_image_alt,published_at,updated_at,created_at")
      .eq("status", "published")
      .or(`published_at.is.null,published_at.lte.${now}`)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("published_at", { ascending: false, nullsFirst: false });

    if (!error && data && data.length > 0) return mapRows(data as TestimonialRow[]);

    const { data: fallbackData, error: fallbackError } = await supabase
      .from("legal_guides")
      .select("id,title,category,summary,body,hero_image_url,hero_image_alt,published_at,updated_at,created_at,content")
      .eq("status", "published")
      .or(`published_at.is.null,published_at.lte.${now}`)
      .order("published_at", { ascending: false, nullsFirst: false });

    if (fallbackError || !fallbackData) return [];
    return mapRows(
      (fallbackData as TestimonialRow[]).filter((row) => isStoredTestimonial(row.content)),
    );
  },
  ["published-testimonials"],
  { revalidate: 60, tags: ["published-testimonials"] },
);
