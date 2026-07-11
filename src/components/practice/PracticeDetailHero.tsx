import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/animation/Reveal";
import { PracticeIcon } from "@/components/practice/PracticeIcon";
import { siteConfig } from "@/config/site";
import type { PracticeArea } from "@/types/practice";

type PracticeDetailHeroProps = {
  practice: PracticeArea;
};

export function PracticeDetailHero({ practice }: PracticeDetailHeroProps) {
  return (
    <section className={`practice-hero detail-hero accent-${practice.accent}`} aria-labelledby="practice-detail-title">
      <div className="site-shell practice-detail-grid">
        <Reveal className="practice-detail-copy">
          <nav className="breadcrumb invert" aria-label="현재 위치">
            <Link href="/">홈</Link>
            <span aria-hidden="true">/</span>
            <Link href="/practice">업무분야</Link>
            <span aria-hidden="true">/</span>
            <span>{practice.title}</span>
          </nav>
          <p className="eyebrow">{practice.englishTitle}</p>
          <h1 id="practice-detail-title">{practice.title}</h1>
          <p>{practice.heroDescription}</p>
          <div className="hero-actions">
            <a className="btn btn-accent" href={siteConfig.phoneHref}>
              043-296-3901 전화상담
            </a>
            <Link className="btn btn-light" href={siteConfig.links.consultation}>
              온라인 상담예약
            </Link>
          </div>
        </Reveal>
        <Reveal className="practice-visual" delay={120}>
          <div className="practice-image-card">
            <Image
              src={practice.heroImage}
              alt={`${practice.title} 업무분야 이미지`}
              width={1200}
              height={800}
              sizes="(max-width: 900px) 100vw, 42vw"
              priority
            />
            <div className="practice-image-caption">
              <PracticeIcon name={practice.icon} />
              <strong>{practice.title}</strong>
              <span>{practice.englishTitle}</span>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
