import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PracticeCTA } from "@/components/practice/PracticeCTA";
import { PracticeDetailHero } from "@/components/practice/PracticeDetailHero";
import { PracticeDocuments } from "@/components/practice/PracticeDocuments";
import { PracticeFaq } from "@/components/practice/PracticeFaq";
import { PracticeIssueGrid } from "@/components/practice/PracticeIssueGrid";
import { PracticeProcess } from "@/components/practice/PracticeProcess";
import { RelatedCases } from "@/components/practice/RelatedCases";
import { RelatedGuides } from "@/components/practice/RelatedGuides";
import { getPracticeAreas, getPracticeBySlug } from "@/data/practice";
import { getRelatedCases, getRelatedGuides } from "@/lib/content-relations";

type PracticeDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getPracticeAreas().map((practice) => ({ slug: practice.slug }));
}

export async function generateMetadata({
  params,
}: PracticeDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const practice = getPracticeBySlug(slug);

  if (!practice) {
    return {
      title: "업무분야를 찾을 수 없습니다",
    };
  }

  return {
    title: practice.seoTitle,
    description: practice.seoDescription,
    alternates: {
      canonical: `/practice/${practice.slug}`,
    },
    openGraph: {
      title: practice.seoTitle,
      description: practice.seoDescription,
      url: `/practice/${practice.slug}`,
      type: "article",
    },
  };
}

export default async function PracticeDetailPage({ params }: PracticeDetailPageProps) {
  const { slug } = await params;
  const practice = getPracticeBySlug(slug);

  if (!practice) notFound();

  const relatedCases = getRelatedCases(practice.relatedTags, 3);
  const relatedGuides = getRelatedGuides(practice.relatedTags, 3);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: "/" },
      { "@type": "ListItem", position: 2, name: "업무분야", item: "/practice" },
      {
        "@type": "ListItem",
        position: 3,
        name: practice.title,
        item: `/practice/${practice.slug}`,
      },
    ],
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PracticeDetailHero practice={practice} />
      <section className="practice-summary-section" aria-labelledby="practice-summary-title">
        <div className="site-shell practice-summary-grid">
          <article>
            <span>주요 쟁점</span>
            <strong>{practice.issues.length}개 유형</strong>
            <p>사건 상황별 쟁점을 나누어 검토합니다.</p>
          </article>
          <article>
            <span>진행 절차</span>
            <strong>{practice.process.length}단계</strong>
            <p>상담부터 결과 이후 정리까지 안내합니다.</p>
          </article>
          <article>
            <span>준비서류</span>
            <strong>{practice.documents.length}개 항목</strong>
            <p>초기 상담에 필요한 자료를 확인합니다.</p>
          </article>
          <article>
            <span>관련 콘텐츠</span>
            <strong>{relatedCases.length + relatedGuides.length}개</strong>
            <p>태그 기반으로 관련 사례와 가이드를 연결합니다.</p>
          </article>
        </div>
      </section>
      <section className="practice-section practice-intro" aria-labelledby="practice-summary-title">
        <div className="site-shell">
          <span className="section-kicker">Overview</span>
          <h2 id="practice-summary-title">{practice.title} 상담 안내</h2>
          <p>{practice.summary}</p>
        </div>
      </section>
      <PracticeIssueGrid practice={practice} />
      <PracticeProcess practice={practice} />
      <PracticeDocuments practice={practice} />
      <RelatedCases cases={relatedCases} />
      <RelatedGuides guides={relatedGuides} />
      <PracticeFaq practice={practice} />
      <PracticeCTA practice={practice} />
    </main>
  );
}
