import Link from "next/link";
import { CaseCard } from "@/components/cases/CaseCard";
import { siteConfig } from "@/config/site";
import type { LegalGuideContent } from "@/types/content";
import type { PublicCaseContent } from "@/types/case";
import type { PracticeArea } from "@/types/practice";

type CaseDetailSectionsProps = {
  caseItem: PublicCaseContent;
  practices: PracticeArea[];
  similarCases: PublicCaseContent[];
  guides: LegalGuideContent[];
};

export function CaseDetailSections({
  caseItem,
  practices,
  similarCases,
  guides,
}: CaseDetailSectionsProps) {
  return (
    <>
      <section className="case-detail-section">
        <div className="site-shell case-readable">
          <span className="section-kicker">Overview</span>
          <h2>사건 개요</h2>
          <p>{caseItem.summary}</p>
        </div>
      </section>
      <section className="case-detail-section case-section-muted">
        <div className="site-shell case-two-column">
          <article>
            <span className="section-kicker">Facts</span>
            <h2>사건의 배경</h2>
            <ul>
              {caseItem.reconstructedFacts.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
          </article>
          <article>
            <span className="section-kicker">Issues</span>
            <h2>핵심 쟁점</h2>
            <div className="case-mini-grid">
              {caseItem.issues.map((issue) => (
                <div key={issue.title}>
                  <h3>{issue.title}</h3>
                  <p>{issue.description}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>
      <section className="case-detail-section">
        <div className="site-shell case-two-column">
          <article>
            <span className="section-kicker">Response</span>
            <h2>제우의 대응</h2>
            <ol className="case-response-list">
              {caseItem.response.map((step, index) => (
                <li key={step.title}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <h3>{step.title}</h3>
                    <p>{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </article>
          <article className="case-result-panel">
            <span className="section-kicker invert">Result</span>
            <h2>{caseItem.resultTitle}</h2>
            <p>{caseItem.resultDescription}</p>
          </article>
        </div>
      </section>
      <section className="lawyer-comment">
        <div className="site-shell">
          <span className="section-kicker">Comment</span>
          <h2>강병권 변호사 코멘트</h2>
          <p>{caseItem.lawyerComment}</p>
        </div>
      </section>
      <section className="case-detail-section case-section-muted">
        <div className="site-shell">
          <span className="section-kicker">Practice</span>
          <h2>관련 업무분야</h2>
          <div className="case-related-practices">
            {practices.map((practice) => (
              <Link key={practice.slug} href={`/practice/${practice.slug}`}>
                <small>{practice.englishTitle}</small>
                <strong>{practice.title}</strong>
                <p>{practice.shortDescription}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="case-detail-section">
        <div className="site-shell">
          <span className="section-kicker">Similar Cases</span>
          <h2>유사 승소사례</h2>
          <div className="case-results-grid">
            {similarCases.map((item) => (
              <CaseCard key={item.id} caseItem={item} />
            ))}
          </div>
        </div>
      </section>
      <section className="case-detail-section case-section-muted">
        <div className="site-shell">
          <span className="section-kicker">Legal Guides</span>
          <h2>관련 법률가이드</h2>
          <div className="related-grid">
            {guides.map((guide) => (
              <Link className="related-card guide" key={guide.id} href={guide.href}>
                <span>{guide.category}</span>
                <h3>{guide.title}</h3>
                <p>{guide.excerpt}</p>
                {guide.readingTime ? <em>읽는 시간 {guide.readingTime}</em> : null}
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="practice-final-cta">
        <div className="site-shell cta-grid">
          <div>
            <span className="section-kicker invert">Consultation</span>
            <h2>비슷한 문제로 고민하고 계신가요?</h2>
            <p>사건의 결과는 구체적인 사실관계와 증거에 따라 달라집니다. 상담에서 현재 상황을 먼저 확인해보세요.</p>
          </div>
          <div className="cta-actions">
            <a className="btn btn-accent" href={siteConfig.phoneHref}>전화상담</a>
            <Link className="btn btn-light" href={siteConfig.links.consultation}>온라인 상담예약</Link>
          </div>
        </div>
      </section>
      <section className="case-disclosure">
        <div className="site-shell">
          <p>
            본 사례는 법률사무소 제우가 실제 수행한 사건을 바탕으로 개인정보를 삭제하거나 일부 사실관계를 재구성한 것입니다. 사건의 결과는 구체적인 사실관계와 증거, 법원의 판단에 따라 달라질 수 있습니다.
          </p>
        </div>
      </section>
    </>
  );
}
