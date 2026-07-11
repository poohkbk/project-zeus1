import Link from "next/link";
import { Reveal } from "@/components/animation/Reveal";
import { siteConfig } from "@/config/site";
import type { PublicCaseContent } from "@/types/case";

export function RelatedCases({ cases }: { cases: PublicCaseContent[] }) {
  if (cases.length === 0) return null;

  return (
    <section className="practice-section" aria-labelledby="related-cases-title">
      <div className="site-shell">
        <Reveal className="section-heading">
          <span className="section-kicker">Related Cases</span>
          <h2 id="related-cases-title">관련 승소사례</h2>
          <p>태그가 겹치는 사례를 자동으로 연결해 보여드립니다.</p>
        </Reveal>
        <div className="related-grid">
          {cases.map((item) => (
            <Link className="related-card" key={item.id} href={item.href}>
              <span>{item.category}</span>
              <h3>{item.title}</h3>
              <p>{item.excerpt}</p>
              <em>{item.subcategory}</em>
            </Link>
          ))}
        </div>
        <div className="section-action">
          <Link className="btn btn-secondary" href={siteConfig.links.cases}>
            승소사례 전체보기
          </Link>
        </div>
      </div>
    </section>
  );
}
