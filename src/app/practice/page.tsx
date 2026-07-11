import type { Metadata } from "next";
import Link from "next/link";
import { Reveal } from "@/components/animation/Reveal";
import { PracticeCard } from "@/components/practice/PracticeCard";
import { PracticeListHero } from "@/components/practice/PracticeListHero";
import { siteConfig } from "@/config/site";
import { getPracticeAreas } from "@/data/practice";

export const metadata: Metadata = {
  title: "업무분야",
  description:
    "청주 민사, 형사, 이혼, 상속 사건의 주요 업무분야와 상담 방향을 안내합니다.",
};

export default function PracticePage() {
  const areas = getPracticeAreas();

  return (
    <main>
      <PracticeListHero />
      <section className="practice-section" aria-labelledby="practice-card-title">
        <div className="site-shell">
          <Reveal className="section-heading">
            <span className="section-kicker">Fields</span>
            <h2 id="practice-card-title">사건 유형별 업무분야</h2>
            <p>가장 가까운 분야를 선택하면 주요 쟁점, 준비서류, 관련 콘텐츠를 확인할 수 있습니다.</p>
          </Reveal>
          <div className="practice-list-grid">
            {areas.map((area, index) => (
              <Reveal key={area.slug} delay={index * 70}>
                <PracticeCard area={area} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
      <section className="practice-help" aria-labelledby="practice-help-title">
        <div className="site-shell practice-help-box">
          <div>
            <span className="section-kicker invert">Guide</span>
            <h2 id="practice-help-title">어떤 분야인지 잘 모르시겠나요?</h2>
            <p>
              사건의 경계가 명확하지 않더라도 상담 내용을 바탕으로 적절한
              분야를 안내해드립니다.
            </p>
          </div>
          <div className="cta-actions">
            <a className="btn btn-accent" href={siteConfig.phoneHref}>
              전화상담
            </a>
            <Link className="btn btn-light" href={siteConfig.links.consultation}>
              온라인 상담예약
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
