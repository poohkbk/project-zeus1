import { siteConfig } from "@/config/site";
import type { LocalSeoPage } from "@/types/seo";
import { absoluteUrl, siteUrl } from "./metadata";

export const lawyerPersonId = `${absoluteUrl("/about/lawyer")}#person`;

function officePostalAddressJsonLd() {
  return {
    "@type": "PostalAddress",
    addressCountry: "KR",
    addressRegion: "충청북도",
    addressLocality: "청주시",
    streetAddress: "서원구 산남로70번길 34, 201호",
  };
}

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
    address: officePostalAddressJsonLd(),
    areaServed: ["청주시", "충청북도"],
    employee: {
      "@type": "Person",
      "@id": lawyerPersonId,
      name: "강병권 변호사",
      url: absoluteUrl("/about/lawyer"),
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

export function lawyerPersonJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": lawyerPersonId,
    name: "강병권 변호사",
    url: absoluteUrl("/about/lawyer"),
    image: absoluteUrl("/images/lawyer/kang-byoungkwon-profile.png"),
    jobTitle: "변호사",
    worksFor: {
      "@type": "LegalService",
      "@id": `${siteUrl}/#legalservice`,
      name: siteConfig.name,
      url: siteUrl,
      address: officePostalAddressJsonLd(),
    },
    knowsAbout: ["이혼", "형사법"],
    hasCredential: [
      {
        "@type": "EducationalOccupationalCredential",
        name: "대한변호사협회 등록 이혼전문변호사",
        credentialCategory: "대한변호사협회 등록 전문분야",
      },
      {
        "@type": "EducationalOccupationalCredential",
        name: "대한변호사협회 등록 형사법 전문변호사",
        credentialCategory: "대한변호사협회 등록 전문분야",
      },
    ],
  };
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
        "@id": lawyerPersonId,
        name: page.authorName,
        url: absoluteUrl("/about/lawyer"),
      },
      reviewedBy: page.reviewerName
        ? {
            "@type": "Person",
            "@id": lawyerPersonId,
            name: page.reviewerName,
            url: absoluteUrl("/about/lawyer"),
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
