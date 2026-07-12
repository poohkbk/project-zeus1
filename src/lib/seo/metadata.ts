import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import type { LocalSeoPage } from "@/types/seo";

export const siteUrl = "https://www.jwlaw.co.kr";
export const defaultOgImage = "/images/lawyer/kang-byoungkwon-hero.png";

export function absoluteUrl(path: string) {
  if (path.startsWith("http")) return path;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export function localSeoMetadata(page: LocalSeoPage): Metadata {
  return {
    title: {
      absolute: page.title,
    },
    description: page.description,
    keywords: [page.primaryKeyword, ...page.secondaryKeywords],
    alternates: {
      canonical: absoluteUrl(page.canonicalPath),
    },
    robots: page.index
      ? {
          index: true,
          follow: true,
        }
      : {
          index: false,
          follow: true,
        },
    openGraph: {
      title: page.title,
      description: page.description,
      url: absoluteUrl(page.canonicalPath),
      siteName: siteConfig.name,
      locale: "ko_KR",
      type: "website",
      images: [
        {
          url: absoluteUrl(defaultOgImage),
          width: 1200,
          height: 630,
          alt: "법률사무소 제우 청주 법률상담 안내",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: page.title,
      description: page.description,
      images: [absoluteUrl(defaultOgImage)],
    },
  };
}
