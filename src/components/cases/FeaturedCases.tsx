import { Reveal } from "@/components/animation/Reveal";
import { CaseCard } from "@/components/cases/CaseCard";
import type { PublicCaseContent } from "@/types/case";

export function FeaturedCases({ cases }: { cases: PublicCaseContent[] }) {
  if (cases.length === 0) return null;

  return (
    <section className="cases-section cases-section-muted" aria-labelledby="featured-cases-title">
      <div className="site-shell">
        <Reveal className="section-heading">
          <span className="section-kicker">Featured</span>
          <h2 id="featured-cases-title">대표 추천 사례</h2>
          <p>노출 설정과 기간, 대표 순서에 따라 자동으로 선정된 사례입니다.</p>
        </Reveal>
        <div className="case-results-grid">
          {cases.map((caseItem) => (
            <CaseCard key={caseItem.id} caseItem={caseItem} />
          ))}
        </div>
      </div>
    </section>
  );
}
