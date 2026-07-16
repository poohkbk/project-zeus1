import Link from "next/link";
import { Reveal } from "@/components/animation/Reveal";
import { siteConfig } from "@/config/site";
import { getLegalGuideCategoryLabel } from "@/lib/legal-guide-taxonomy";
import type { LegalGuideContent } from "@/types/content";

export function RelatedGuides({ guides }: { guides: LegalGuideContent[] }) {
  if (guides.length === 0) return null;

  return (
    <section className="practice-section practice-section-muted" aria-labelledby="related-guides-title">
      <div className="site-shell">
        <Reveal className="section-heading">
          <span className="section-kicker">Legal Guides</span>
          <h2 id="related-guides-title">관련 법률가이드</h2>
          <p>같은 태그를 가진 법률가이드를 자동으로 연결합니다.</p>
        </Reveal>
        <div className="related-grid">
          {guides.map((guide) => (
            <Link className="related-card guide" key={guide.id} href={guide.href}>
              <span>{getLegalGuideCategoryLabel(guide.category)}</span>
              <h3>{guide.title}</h3>
              <p>{guide.excerpt}</p>
              {guide.readingTime ? <em>읽는 시간 {guide.readingTime}</em> : null}
            </Link>
          ))}
        </div>
        <div className="section-action">
          <Link className="btn btn-secondary" href={siteConfig.links.legalGuide}>
            법률가이드 전체보기
          </Link>
        </div>
      </div>
    </section>
  );
}
