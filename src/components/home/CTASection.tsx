import Link from "next/link";
import { Reveal } from "@/components/animation/Reveal";
import { SimpleIcon } from "@/components/icons/SimpleIcon";
import { siteConfig } from "@/config/site";

export function CTASection() {
  return (
    <section className="final-cta" aria-labelledby="final-cta-title">
      <div className="site-shell cta-grid">
        <Reveal>
          <span className="section-kicker invert">Consultation</span>
          <h2 id="final-cta-title">사건 해결의 첫걸음, 상담에서 시작합니다.</h2>
          <p>긴급한 사건은 전화로, 충분한 검토가 필요한 사건은 온라인으로 예약해 주세요.</p>
        </Reveal>
        <Reveal className="cta-actions" delay={100}>
          <a className="btn btn-accent" href={siteConfig.phoneHref}>
            <SimpleIcon name="phone" />
            043-296-3901 전화하기
          </a>
          <Link className="btn btn-light" href={siteConfig.links.consultation}>
            <SimpleIcon name="calendar" />
            온라인 상담예약
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
