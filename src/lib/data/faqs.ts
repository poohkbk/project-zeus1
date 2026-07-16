import { unstable_cache } from "next/cache";
import { localSeoPages } from "@/data/local-seo-pages";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { FaqRow } from "@/types/database";

export type PublicFaq = {
  id: string;
  question: string;
  answer: string;
  category: string;
  tags: string[];
  sortOrder?: number;
  publishedAt?: string;
};

const fallbackFaqs: PublicFaq[] = localSeoPages.flatMap((page) =>
  page.faqs.map((faq, index) => ({
    id: `${page.slug}-${index}`,
    question: faq.question,
    answer: faq.answer,
    category: page.slug,
    tags: page.relatedTags ?? [],
    sortOrder: index,
    publishedAt: "2024-01-01T00:00:00.000Z",
  })),
);

function toFaq(row: FaqRow): PublicFaq {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer,
    category: row.category,
    tags: row.tags ?? [],
    sortOrder: row.sort_order ?? undefined,
    publishedAt: row.published_at ?? undefined,
  };
}

const fetchPublishedFaqRowsFromAdmin = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    if (!supabase) return undefined;

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("faqs")
      .select("*")
      .eq("status", "published")
      .or(`published_at.is.null,published_at.lte.${now}`)
      .order("sort_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error || !data || data.length === 0) return undefined;
    return data as FaqRow[];
  },
  ["published-faqs"],
  { revalidate: 60, tags: ["published-faqs"] },
);

export async function getPublishedFaqs(): Promise<PublicFaq[]> {
  const cachedRows = await fetchPublishedFaqRowsFromAdmin();
  if (cachedRows) return cachedRows.map(toFaq);

  const supabase = await createClient();
  if (!supabase) return fallbackFaqs;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("faqs")
    .select("*")
    .eq("status", "published")
    .or(`published_at.is.null,published_at.lte.${now}`)
    .order("sort_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error || !data || data.length === 0) return fallbackFaqs;
  return (data as FaqRow[]).map(toFaq);
}

export async function getFaqsByCategory(category: string): Promise<PublicFaq[]> {
  const faqs = await getPublishedFaqs();
  return faqs.filter((faq) => faq.category === category || faq.tags.includes(category));
}
