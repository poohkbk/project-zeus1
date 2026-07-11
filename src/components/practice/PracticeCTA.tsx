import Link from "next/link";
import { siteConfig } from "@/config/site";
import type { PracticeArea } from "@/types/practice";

export function PracticeCTA({ practice }: { practice: PracticeArea }) {
  return (
    <section className="practice-final-cta" aria-labelledby="practice-cta-title">
      <div className="site-shell cta-grid">
        <div>
          <span className="section-kicker invert">Consultation</span>
          <h2 id="practice-cta-title">{practice.ctaTitle}</h2>
          <p>{practice.ctaDescription}</p>
        </div>
        <div className="cta-actions">
          <a className="btn btn-accent" href={siteConfig.phoneHref}>
            043-296-3901 전화상담
          </a>
          <Link className="btn btn-light" href={siteConfig.links.consultation}>
            온라인 상담예약
          </Link>
        </div>
      </div>
    </section>
  );
}
