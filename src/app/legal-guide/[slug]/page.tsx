import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseCard } from "@/components/cases/CaseCard";
import { StructuredData } from "@/components/seo/StructuredData";
import { siteConfig } from "@/config/site";
import { legalGuideContents } from "@/data/legal-guides";
import { getCasesListing } from "@/lib/data/cases";
import { getLegalGuideBySlug, getPublishedLegalGuides } from "@/lib/data/legal-guides";
import {
  getLegalGuidePracticeSlug,
  getRelatedCasesForGuide,
  getRelatedLegalGuides,
} from "@/lib/legal-guide-relations";
import { getLegalGuideCategoryLabel } from "@/lib/legal-guide-taxonomy";
import { getPracticeBySlug } from "@/data/practice";
import { absoluteUrl, siteUrl } from "@/lib/seo/metadata";

type LegalGuideDetailPageProps = {
  params: Promise<{ slug: string }>;
};

const fallbackSectionLabels = {
  checkCases: "이런 경우라면 확인해 보세요",
  legalView: "법적으로 어떻게 판단될까요?",
  process: "해결 절차는 어떻게 진행될까요?",
  cautions: "꼭 알아야 할 주의사항",
};

function ParagraphBlock({ text }: { text?: string }) {
  const paragraphs = (text ?? "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (!paragraphs.length) return <p>작성된 내용이 없습니다.</p>;

  return (
    <>
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </>
  );
}

function formatDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).format(date);
}

function sameCalendarDate(a?: string, b?: string) {
  if (!a || !b) return false;
  return formatDate(a) === formatDate(b);
}

export const dynamicParams = true;
export const revalidate = 60;

export async function generateStaticParams() {
  return legalGuideContents.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: LegalGuideDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getLegalGuideBySlug(slug);
  if (!guide) return { title: "법률가이드를 찾을 수 없습니다" };

  return {
    title: guide.title,
    description: guide.excerpt,
    alternates: { canonical: `/legal-guide/${guide.slug}` },
    robots: { index: true, follow: true },
    openGraph: {
      title: guide.title,
      description: guide.excerpt,
      url: `/legal-guide/${guide.slug}`,
      type: "article",
    },
  };
}

export default async function LegalGuideDetailPage({ params }: LegalGuideDetailPageProps) {
  const { slug } = await params;
  const [guide, casesListing, publishedGuides] = await Promise.all([
    getLegalGuideBySlug(slug),
    getCasesListing(),
    getPublishedLegalGuides(),
  ]);
  if (!guide) notFound();

  const pageUrl = absoluteUrl(`/legal-guide/${guide.slug}`);
  const practiceSlug = getLegalGuidePracticeSlug(guide);
  const practice = practiceSlug ? getPracticeBySlug(practiceSlug) : undefined;
  const relatedCases = getRelatedCasesForGuide(guide, casesListing.cases, 3);
  const relatedGuides = getRelatedLegalGuides(guide, publishedGuides, 3);
  const publishedDate = guide.publishedAt ?? guide.createdAt;
  const modifiedDate = guide.updatedAt ?? publishedDate;
  const publishedLabel = formatDate(publishedDate);
  const modifiedLabel = formatDate(modifiedDate);
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: guide.title,
      description: guide.excerpt,
      datePublished: publishedDate,
      dateModified: modifiedDate,
      mainEntityOfPage: pageUrl,
      publisher: {
        "@type": "Organization",
        name: siteConfig.name,
        url: siteUrl,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "홈", item: siteUrl },
        { "@type": "ListItem", position: 2, name: "법률가이드", item: absoluteUrl("/legal-guide") },
        { "@type": "ListItem", position: 3, name: guide.title, item: pageUrl },
      ],
    },
  ];

  const sections = {
    checkCases: guide.sections?.checkCases || guide.excerpt,
    legalView: guide.sections?.legalView || guide.excerpt,
    process: guide.sections?.process || "사안의 내용을 정리한 뒤 필요한 자료를 확인하고, 상담을 통해 대응 방향을 정합니다.",
    cautions: guide.sections?.cautions || "구체적인 판단은 사실관계와 증거에 따라 달라질 수 있으므로, 관련 자료를 보관한 뒤 상담을 받는 것이 좋습니다.",
  };

  return (
    <main className="legal-guide-detail">
      <StructuredData data={structuredData} />
      <section className="practice-hero list-hero">
        <div className="site-shell">
          <nav className="breadcrumb invert" aria-label="현재 위치">
            <Link href="/">홈</Link>
            <span>/</span>
            <Link href="/legal-guide">법률가이드</Link>
            <span>/</span>
            <span>{guide.title}</span>
          </nav>
          <p className="eyebrow">Legal Guide</p>
          <h1>{guide.title}</h1>
          <p>{guide.excerpt}</p>
          <div className="legal-guide-meta">
            <span>발행: <Link href="/">{siteConfig.name}</Link></span>
            {publishedLabel ? <time dateTime={publishedDate}>작성 {publishedLabel}</time> : null}
            {modifiedLabel && !sameCalendarDate(publishedDate, modifiedDate) ? (
              <time dateTime={modifiedDate}>수정 {modifiedLabel}</time>
            ) : null}
            <Link href="/about/lawyer">변호사 소개</Link>
          </div>
        </div>
      </section>

      <section className="case-detail-section">
        <div className="site-shell legal-guide-sections">
          <article>
            <span className="section-kicker">Check</span>
            <h2>{fallbackSectionLabels.checkCases}</h2>
            <ParagraphBlock text={sections.checkCases} />
          </article>
          <article>
            <span className="section-kicker">Legal View</span>
            <h2>{fallbackSectionLabels.legalView}</h2>
            <ParagraphBlock text={sections.legalView} />
          </article>
          <article>
            <span className="section-kicker">Process</span>
            <h2>{fallbackSectionLabels.process}</h2>
            <ParagraphBlock text={sections.process} />
          </article>
          <article>
            <span className="section-kicker">Caution</span>
            <h2>{fallbackSectionLabels.cautions}</h2>
            <ParagraphBlock text={sections.cautions} />
          </article>
        </div>
      </section>

      {practice ? (
        <section className="case-detail-section case-section-muted">
          <div className="site-shell">
            <span className="section-kicker">Practice</span>
            <h2>관련 업무분야</h2>
            <div className="case-related-practices">
              <Link href={`/practice/${practice.slug}`}>
                <small>{practice.englishTitle}</small>
                <strong>{practice.title}</strong>
                <p>{practice.shortDescription}</p>
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {relatedCases.length ? (
        <section className="case-detail-section">
          <div className="site-shell">
            <span className="section-kicker">Related Cases</span>
            <h2>관련 승소사례</h2>
            <div className="case-results-grid">
              {relatedCases.map((item) => <CaseCard key={item.id} caseItem={item} />)}
            </div>
          </div>
        </section>
      ) : null}

      {relatedGuides.length ? (
        <section className="case-detail-section case-section-muted">
          <div className="site-shell">
            <span className="section-kicker">Related Guides</span>
            <h2>관련 법률가이드</h2>
            <div className="related-grid">
              {relatedGuides.map((item) => (
                <Link className="related-card guide" key={item.id} href={item.href}>
                  <span>{getLegalGuideCategoryLabel(item.category)}</span>
                  <h3>{item.title}</h3>
                  <p>{item.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="practice-final-cta">
        <div className="site-shell cta-grid">
          <div>
            <span className="section-kicker invert">Consultation</span>
            <h2>구체적인 사실관계에 따른 검토가 필요하신가요?</h2>
            <p>관련 자료와 현재 상황을 정리해 상담을 신청하실 수 있습니다.</p>
          </div>
          <div className="cta-actions">
            <Link className="btn btn-light" href={siteConfig.links.consultation}>상담 신청</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
