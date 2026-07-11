import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/animation/Reveal";
import { SimpleIcon } from "@/components/icons/SimpleIcon";
import { siteConfig } from "@/config/site";

const trustItems = [
  "민사·형사·이혼·상속 사건 수행",
  "승소사례 중심의 사건 대응",
  "청주지방법원 인근 법률상담",
];

export function Hero() {
  return (
    <section className="hero-section" aria-labelledby="home-hero-title">
      <div className="site-shell hero-grid">
        <Reveal className="hero-copy">
          <p className="eyebrow">LAW OFFICE ZEU</p>
          <h1 id="home-hero-title">의뢰인의 시작부터 해결까지 함께합니다.</h1>
          <p className="hero-description">
            민사소송 · 형사소송 · 이혼소송 · 상속 분야의 풍부한 승소사례와
            전문성을 바탕으로, 의뢰인의 권리를 끝까지 지켜드립니다.
          </p>
          <div className="hero-actions" aria-label="대표 상담 링크">
            <a className="btn btn-primary" href={siteConfig.phoneHref}>
              <SimpleIcon name="phone" />
              지금 전화하기
            </a>
            <Link className="btn btn-secondary" href={siteConfig.links.consultation}>
              <SimpleIcon name="calendar" />
              온라인 상담예약
            </Link>
          </div>
          <ul className="trust-list">
            {trustItems.map((item) => (
              <li key={item}>
                <SimpleIcon name="check" />
                {item}
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="profile-panel" delay={120}>
          <div className="profile-image-card">
            <Image
              src="/images/lawyer/kang-byoungkwon-hero.png"
              alt="강병권 변호사"
              width={760}
              height={900}
              sizes="(max-width: 900px) 100vw, 45vw"
              priority
            />
            <div className="profile-caption">
              <strong>강병권 변호사</strong>
              <small>청주 민사·형사·이혼·상속 상담</small>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
