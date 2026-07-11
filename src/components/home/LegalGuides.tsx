import Link from "next/link";
import { Reveal } from "@/components/animation/Reveal";
import { SimpleIcon } from "@/components/icons/SimpleIcon";
import { siteConfig } from "@/config/site";
import { legalGuides } from "@/data/home";

export function LegalGuides() {
  return (
    <section className="section" aria-labelledby="guide-title">
      <div className="site-shell">
        <Reveal className="section-heading">
          <span className="section-kicker">Legal Guide</span>
          <h2 id="guide-title">최신 법률가이드</h2>
          <p>민사·형사·이혼·상속 사건에서 자주 묻는 문제를 쉽게 설명합니다.</p>
        </Reveal>
        <div className="guide-grid">
          {legalGuides.map((guide, index) => (
            <Reveal key={guide.title} delay={index * 60}>
              <Link className="guide-card" href={guide.href}>
                <span className="guide-thumb">{guide.category}</span>
                <strong>{guide.title}</strong>
                <p>{guide.summary}</p>
                <em>
                  {guide.meta}
                  <SimpleIcon name="arrow" />
                </em>
              </Link>
            </Reveal>
          ))}
        </div>
        <Reveal className="section-action">
          <Link className="btn btn-secondary" href={siteConfig.links.legalGuide}>
            법률가이드 전체보기
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
