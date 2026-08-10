import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export type PublicTestimonial = {
  id: string;
  title: string;
  category: string;
  summary: string;
  body: string;
  imageUrl?: string;
  imageAlt?: string;
  publishedAt?: string;
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
};

export const getPublishedTestimonials = unstable_cache(
  async (): Promise<PublicTestimonial[]> => {
    const supabase = createAdminClient();
    if (!supabase) return [];

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("testimonials")
      .select("id,title,category,summary,body,hero_image_url,hero_image_alt,published_at")
      .eq("status", "published")
      .or(`published_at.is.null,published_at.lte.${now}`)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("published_at", { ascending: false, nullsFirst: false });

    if (error || !data) return [];
    return (data as TestimonialRow[]).map((row) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      summary: row.summary ?? "",
      body: row.body,
      imageUrl: row.hero_image_url ?? undefined,
      imageAlt: row.hero_image_alt ?? undefined,
      publishedAt: row.published_at ?? undefined,
    }));
  },
  ["published-testimonials"],
  { revalidate: 60, tags: ["published-testimonials"] },
);
