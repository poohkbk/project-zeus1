import { siteConfig } from "@/config/site";
import type { LocalSeoPage } from "@/types/seo";
import { absoluteUrl, siteUrl } from "./metadata";

export function organizationJsonLd() {
  const legalService = {
    "@context": "https://schema.org",
    "@type": "LegalService",
    "@id": `${siteUrl}/#legalservice`,
    name: siteConfig.name,
    alternateName: siteConfig.englishName,
    url: siteUrl,
    telephone: siteConfig.phone,
    email: siteConfig.email,
    address: {
      "@type": "PostalAddress",
      addressCountry: "KR",
      addressRegion: "충청북도",
      addressLocality: "청주시",
      streetAddress: "서원구 산남로70번길 34, 201호",
    },
    areaServed: ["청주시", "충청북도"],
    employee: {
      "@type": "Person",
      name: "강병권 변호사",
      jobTitle: "변호사",
      worksFor: {
        "@id": `${siteUrl}/#legalservice`,
      },
    },
  };

  if (siteConfig.location.latitude && siteConfig.location.longitude) {
    return {
      ...legalService,
      geo: {
        "@type": "GeoCoordinates",
        latitude: siteConfig.location.latitude,
        longitude: siteConfig.location.longitude,
      },
    };
  }

  return legalService;
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: siteConfig.name,
    url: siteUrl,
    inLanguage: "ko-KR",
  };
}

export function localSeoPageJsonLd(page: LocalSeoPage) {
  const pageUrl = absoluteUrl(page.canonicalPath);

  return [
    organizationJsonLd(),
    websiteJsonLd(),
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: page.title,
      description: page.description,
      inLanguage: "ko-KR",
      isPartOf: {
        "@id": `${siteUrl}/#website`,
      },
      about: {
        "@id": `${siteUrl}/#legalservice`,
      },
      author: {
        "@type": "Person",
        name: page.authorName,
      },
      reviewedBy: page.reviewerName
        ? {
            "@type": "Person",
            name: page.reviewerName,
          }
        : undefined,
      datePublished: page.publishedAt,
      dateModified: page.updatedAt,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "홈",
          item: siteUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: page.primaryKeyword,
          item: pageUrl,
        },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    },
  ];
}
