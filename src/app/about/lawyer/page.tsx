import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CaseCard } from "@/components/cases/CaseCard";
import { StructuredData } from "@/components/seo/StructuredData";
import { siteConfig } from "@/config/site";
import { lawyerHighlights } from "@/data/home";
import { practiceAreas } from "@/data/practice";
import { getCasesListing } from "@/lib/data/cases";
import { getPublishedLegalGuides } from "@/lib/data/legal-guides";
import { getLegalGuideCategoryLabel } from "@/lib/legal-guide-taxonomy";
import { absoluteUrl, siteUrl } from "@/lib/seo/metadata";
import { lawyerPersonJsonLd } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: {
    absolute: "강병권 변호사 소개 | 법률사무소 제우",
  },
  description: "법률사무소 제우 강병권 변호사의 주요 상담 분야와 사무소 정보를 안내합니다.",
  alternates: {
    canonical: absoluteUrl("/about/lawyer"),
  },
};

export const revalidate = 60;

export default async function LawyerProfilePage() {
  const [casesListing, legalGuides] = await Promise.all([
    getCasesListing(),
    getPublishedLegalGuides(),
  ]);
  const featuredCases = casesListing.cases.slice(0, 3);
  const featuredGuides = legalGuides.slice(0, 3);
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "홈", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "변호사 소개", item: absoluteUrl("/about/lawyer") },
    ],
  };

  return (
    <main className="lawyer-profile-page">
      <StructuredData data={[lawyerPersonJsonLd(), breadcrumbJsonLd]} />
      <section className="practice-hero list-hero">
        <div className="site-shell">
          <nav className="breadcrumb invert" aria-label="현재 위치">
            <Link href="/">홈</Link>
            <span>/</span>
            <span>변호사 소개</span>
          </nav>
          <p className="eyebrow">Attorney Profile</p>
          <h1>강병권 변호사</h1>
          <p>민사, 형사, 이혼·가사, 상속 사건에서 의뢰인의 자료와 사실관계를 차분히 검토합니다.</p>
        </div>
      </section>

      <section className="lawyer-section">
        <div className="site-shell lawyer-grid">
          <Image
            src="/images/lawyer/kang-byoungkwon-profile.png"
            alt="법률사무소 제우 강병권 변호사"
            width={420}
            height={520}
            sizes="(max-width: 900px) 100vw, 420px"
          />
          <div className="lawyer-copy">
            <p className="eyebrow">법률사무소 제우</p>
            <h2>사건의 출발점부터 필요한 자료를 함께 정리합니다.</h2>
            <p>
              법률상담은 결과를 단정하는 일이 아니라, 현재 확인 가능한 사실과 부족한 자료를 나누는
              일에서 시작됩니다. 법률사무소 제우는 청주 지역 의뢰인의 민사, 형사, 이혼·가사, 상속
              사건을 중심으로 상담합니다.
            </p>
            <ul className="highlight-list">
              {lawyerHighlights.map((item) => <li key={item.label}>{item.label}</li>)}
            </ul>
            <Link className="btn btn-secondary" href={siteConfig.links.consultation}>
              상담신청
            </Link>
          </div>
        </div>
      </section>

      <section className="case-detail-section case-section-muted">
        <div className="site-shell">
          <span className="section-kicker">Practice</span>
          <h2>주요 상담 업무분야</h2>
          <div className="case-related-practices">
            {practiceAreas.map((practice) => (
              <Link key={practice.slug} href={`/practice/${practice.slug}`}>
                <small>{practice.englishTitle}</small>
                <strong>{practice.title}</strong>
                <p>{practice.shortDescription}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {featuredCases.length ? (
        <section className="case-detail-section">
          <div className="site-shell">
            <span className="section-kicker">Cases</span>
            <h2>법률사무소 제우 승소사례</h2>
            <div className="case-results-grid">
              {featuredCases.map((item) => <CaseCard key={item.id} caseItem={item} />)}
            </div>
            <Link className="text-link" href={siteConfig.links.cases}>승소사례 전체 보기</Link>
          </div>
        </section>
      ) : null}

      {featuredGuides.length ? (
        <section className="case-detail-section case-section-muted">
          <div className="site-shell">
            <span className="section-kicker">Legal Guides</span>
            <h2>법률사무소 제우 법률가이드</h2>
            <div className="related-grid">
              {featuredGuides.map((guide) => (
                <Link className="related-card guide" key={guide.id} href={guide.href}>
                  <span>{getLegalGuideCategoryLabel(guide.category)}</span>
                  <h3>{guide.title}</h3>
                  <p>{guide.excerpt}</p>
                </Link>
              ))}
            </div>
            <Link className="text-link" href={siteConfig.links.legalGuide}>법률가이드 전체 보기</Link>
          </div>
        </section>
      ) : null}

      <section className="case-detail-section">
        <div className="site-shell">
          <span className="section-kicker">Office</span>
          <h2>법률사무소 제우 안내</h2>
          <p>{siteConfig.address}</p>
          <p><a href={siteConfig.phoneHref}>{siteConfig.phone}</a></p>
          <Link className="text-link" href={siteConfig.links.location}>오시는 길 확인</Link>
        </div>
      </section>
    </main>
  );
}
