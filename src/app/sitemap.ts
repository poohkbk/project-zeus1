import type { MetadataRoute } from "next";
import { caseContents } from "@/data/cases";
import { localSeoPages } from "@/data/local-seo-pages";
import { practiceAreas } from "@/data/practice";
import { absoluteUrl } from "@/lib/seo/metadata";

function entry(path: string, lastModified = "2026-07-12"): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl(path),
    lastModified,
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const entries = [
    entry("/"),
    entry("/practice"),
    entry("/cases"),
    entry("/legal-guide"),
    entry("/faq"),
    entry("/about/lawyer"),
    entry("/about/location"),
    entry("/consultation"),
    entry("/privacy"),
    entry("/terms"),
    entry("/disclaimer"),
    ...localSeoPages.filter((page) => page.index).map((page) => entry(page.canonicalPath, page.updatedAt)),
    ...practiceAreas.map((area) => entry(`/practice/${area.slug}`)),
    ...caseContents
      .filter((item) => item.visibility.published && item.visibility.showOnSearch !== false)
      .map((item) => entry(item.href, item.visibility.updatedAt ?? item.visibility.publishedAt)),
  ];

  return Array.from(new Map(entries.map((item) => [item.url, item])).values());
}
