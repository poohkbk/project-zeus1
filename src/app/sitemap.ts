import type { MetadataRoute } from "next";
import { localSeoPages } from "@/data/local-seo-pages";
import { practiceAreas } from "@/data/practice";
import { getPublishedCases } from "@/lib/data/cases";
import { getPublishedFaqs } from "@/lib/data/faqs";
import { getPublishedLegalGuides } from "@/lib/data/legal-guides";
import { getPublishedTestimonials } from "@/lib/data/testimonials";
import { absoluteUrl } from "@/lib/seo/metadata";

function entry(path: string, lastModified?: string): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl(path),
    lastModified: lastModified ?? "2026-07-12",
  };
}

function latestContentDate(
  items: Array<{ updatedAt?: string; publishedAt?: string; createdAt?: string }>,
) {
  return items
    .map((item) => item.updatedAt ?? item.publishedAt ?? item.createdAt)
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [publishedCases, publishedLegalGuides, publishedFaqs, publishedTestimonials] = await Promise.all([
    getPublishedCases(),
    getPublishedLegalGuides(),
    getPublishedFaqs(),
    getPublishedTestimonials(),
  ]);

  const entries = [
    entry("/"),
    entry("/practice"),
    entry("/cases"),
    entry("/legal-guide"),
    entry("/faq", latestContentDate(publishedFaqs)),
    entry("/testimonials", latestContentDate(publishedTestimonials)),
    entry("/about/lawyer"),
    entry("/about/location"),
    entry("/consultation"),
    entry("/privacy"),
    entry("/terms"),
    entry("/disclaimer"),
    ...localSeoPages.filter((page) => page.index).map((page) => entry(page.canonicalPath, page.updatedAt)),
    ...practiceAreas.map((area) => entry(`/practice/${area.slug}`)),
    ...publishedCases
      .filter((item) => item.visibility.published && item.visibility.showOnSearch !== false)
      .map((item) =>
        entry(
          `/cases/${item.slug}`,
          item.visibility.updatedAt ?? item.visibility.publishedAt ?? item.visibility.createdAt,
        ),
      ),
    ...publishedLegalGuides
      .filter((guide) => guide.showOnSearch !== false)
      .map((guide) =>
        entry(
          `/legal-guide/${guide.slug}`,
          guide.updatedAt ?? guide.publishedAt ?? guide.createdAt,
        ),
      ),
  ];

  return Array.from(new Map(entries.map((item) => [item.url, item])).values());
}
