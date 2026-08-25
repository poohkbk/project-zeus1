import type { MetadataRoute } from "next";
import { localSeoPages } from "@/data/local-seo-pages";
import { practiceAreas } from "@/data/practice";
import { getPublishedCases } from "@/lib/data/cases";
import { getPublishedLegalGuides } from "@/lib/data/legal-guides";
import { absoluteUrl } from "@/lib/seo/metadata";

function entry(path: string, lastModified = "2026-07-12"): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl(path),
    lastModified,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [publishedCases, publishedLegalGuides] = await Promise.all([
    getPublishedCases(),
    getPublishedLegalGuides(),
  ]);

  const entries = [
    entry("/"),
    entry("/practice"),
    entry("/cases"),
    entry("/legal-guide"),
    entry("/faq"),
    entry("/testimonials"),
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
