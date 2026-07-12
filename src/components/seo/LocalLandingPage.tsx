import Link from "next/link";
import { caseContents } from "@/data/cases";
import { legalGuideContents } from "@/data/legal-guides";
import { getPracticeBySlug } from "@/data/practice";
import { siteConfig } from "@/config/site";
import type { LocalSeoPage } from "@/types/seo";
import { StructuredData } from "./StructuredData";
import { localSeoPageJsonLd } from "@/lib/seo/structured-data";

function relatedCases(page: LocalSeoPage) {
  return caseContents
    .filter((item) => item.visibility.published && item.tags.some((tag) => page.relatedTags.includes(tag)))
    .slice(0, 3);
}

function relatedGuides(page: LocalSeoPage) {
  return legalGuideContents
    .filter((item) => item.tags.some((tag) => page.relatedTags.includes(tag)))
    .slice(0, 3);
}

export function LocalLandingPage({ page }: { page: LocalSeoPage }) {
  const practice = page.practiceSlug ? getPracticeBySlug(page.practiceSlug) : undefined;
  const cases = relatedCases(page);
  const guides = relatedGuides(page);

  return (
    <main className="local-seo-page">
      <StructuredData data={localSeoPageJsonLd(page)} />

      <section className="local-seo-hero">
        <div className="site-shell">
          <nav className="breadcrumb invert" aria-label="현재 위치">
            <Link href="/">홈</Link>
            <span>/</span>
            <span>{page.primaryKeyword}</span>
          </nav>
          <p className="eyebrow">{page.eyebrow}</p>
          <h1>{page.h1}</h1>
          <p>{page.description}</p>
          <div className="hero-actions">
            <a className="btn btn-primary" href={siteConfig.phoneHref}>
              {siteConfig.phone} 전화상담
            </a>
            <Link className="btn btn-secondary" href={siteConfig.links.consultation}>
              온라인 상담신청
            </Link>
          </div>
        </div>
      </section>

      <section className="local-answer-section">
        <div className="site-shell local-answer-box">
          <span>빠른 답변</span>
          <h2>{page.primaryKeyword} 상담은 무엇부터 확인해야 하나요?</h2>
          <p>{page.shortAnswer}</p>
        </div>
      </section>

      <section className="section">
        <div className="site-shell local-seo-layout">
          <article className="local-seo-main">
            <section>
              <h2>상담 전에 알아두면 좋은 점</h2>
              {page.introduction.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </section>

            <section>
              <h2>이런 상황에서 상담이 필요합니다</h2>
              <div className="local-card-grid">
                {page.userSituations.map((item) => (
                  <article key={item.title}>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <h2>주요 쟁점</h2>
              <div className="local-card-grid">
                {page.keyIssues.map((item) => (
                  <article key={item.title}>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section>
              <h2>상담 전 준비자료</h2>
              <ul className="local-check-list">
                {page.preparationDocuments.map((document) => (
                  <li key={document}>{document}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2>일반적인 진행 절차</h2>
              <ol className="local-process-list">
                {page.processSteps.map((step) => (
                  <li key={step.title}>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section>
              <h2>자주 묻는 질문</h2>
              <div className="local-faq-list">
                {page.faqs.map((faq) => (
                  <article key={faq.question}>
                    <h3>{faq.question}</h3>
                    <p>{faq.answer}</p>
                  </article>
                ))}
              </div>
            </section>
          </article>

          <aside className="local-seo-side">
            <section>
              <h2>관련 업무분야</h2>
              {practice ? (
                <Link href={`/practice/${practice.slug}`}>{practice.title} 상담 안내</Link>
              ) : (
                <div className="local-side-links">
                  <Link href="/practice/civil">청주 민사소송 상담</Link>
                  <Link href="/practice/criminal">청주 형사사건 상담</Link>
                  <Link href="/practice/divorce">청주 이혼·가사 상담</Link>
                  <Link href="/practice/inheritance">청주 상속 상담</Link>
                </div>
              )}
            </section>

            <section>
              <h2>관련 승소사례</h2>
              <div className="local-side-links">
                {cases.map((item) => (
                  <Link key={item.id} href={item.href}>
                    {item.title}
                  </Link>
                ))}
                {!cases.length ? <Link href="/cases">승소사례 전체 보기</Link> : null}
              </div>
            </section>

            <section>
              <h2>관련 법률가이드</h2>
              <div className="local-side-links">
                {guides.map((item) => (
                  <Link key={item.id} href={item.href}>
                    {item.title}
                  </Link>
                ))}
                {!guides.length ? <Link href={siteConfig.links.legalGuide}>법률가이드 전체 보기</Link> : null}
              </div>
            </section>

            <section className="local-author-box">
              <h2>작성·검토</h2>
              <p>
                작성 및 검토: <strong>{page.reviewerName ?? page.authorName}</strong>
              </p>
              <p>소속: 법률사무소 제우</p>
              <p>최초 작성: {page.publishedAt}</p>
              <p>최종 수정: {page.updatedAt}</p>
              <p className="local-notice">이 글은 일반적인 법률정보이며, 개별 사건의 결과를 보장하지 않습니다.</p>
            </section>
          </aside>
        </div>
      </section>

      <section className="final-cta">
        <div className="site-shell cta-grid">
          <div>
            <h2>{page.ctaTitle}</h2>
            <p>{page.ctaDescription}</p>
          </div>
          <div className="cta-actions">
            <a className="btn btn-accent" href={siteConfig.phoneHref}>
              전화상담
            </a>
            <Link className="btn btn-light" href={siteConfig.links.consultation}>
              상담신청
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
