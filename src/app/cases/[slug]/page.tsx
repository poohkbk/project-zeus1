import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CaseDetailHero } from "@/components/cases/CaseDetailHero";
import { CaseDetailSections } from "@/components/cases/CaseDetailSections";
import { caseContents } from "@/data/cases";
import { getCaseBySlug } from "@/lib/data/cases";
import { isPublishedCase } from "@/lib/case-selectors";
import { getRelatedLegalGuides, getRelatedPracticeAreas, getSimilarCases } from "@/lib/case-relations";

type CaseDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = true;
export const dynamic = "force-dynamic";
export const revalidate = 0;

export function generateStaticParams() {
  return caseContents.filter((item) => isPublishedCase(item)).map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: CaseDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const caseItem = await getCaseBySlug(slug);
  if (!caseItem) return { title: "승소사례를 찾을 수 없습니다" };

  return {
    title: caseItem.seoTitle,
    description: caseItem.seoDescription,
    alternates: { canonical: `/cases/${caseItem.slug}` },
    openGraph: {
      title: caseItem.seoTitle,
      description: caseItem.seoDescription,
      url: `/cases/${caseItem.slug}`,
      type: "article",
    },
  };
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const { slug } = await params;
  const caseItem = await getCaseBySlug(slug);
  if (!caseItem) notFound();

  const practices = getRelatedPracticeAreas(caseItem.tags, caseItem.category, 2);
  const similarCases = getSimilarCases(caseItem, 3);
  const guides = getRelatedLegalGuides(caseItem.tags, caseItem.category, 3);
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "홈", item: "/" },
        { "@type": "ListItem", position: 2, name: "승소사례", item: "/cases" },
        { "@type": "ListItem", position: 3, name: caseItem.title, item: `/cases/${caseItem.slug}` },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: caseItem.title,
      description: caseItem.seoDescription,
      author: { "@type": "Person", name: "강병권 변호사" },
      publisher: { "@type": "Organization", name: "법률사무소 제우" },
      datePublished: caseItem.visibility.publishedAt,
      dateModified: caseItem.visibility.updatedAt ?? caseItem.visibility.publishedAt,
      mainEntityOfPage: `/cases/${caseItem.slug}`,
    },
  ];

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <CaseDetailHero caseItem={caseItem} />
      <CaseDetailSections caseItem={caseItem} practices={practices} similarCases={similarCases} guides={guides} />
    </main>
  );
}
