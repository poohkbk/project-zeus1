import Link from "next/link";
import { Reveal } from "@/components/animation/Reveal";

export function PracticeListHero() {
  return (
    <section className="practice-hero list-hero" aria-labelledby="practice-list-title">
      <div className="site-shell">
        <Reveal>
          <nav className="breadcrumb" aria-label="현재 위치">
            <Link href="/">홈</Link>
            <span aria-hidden="true">/</span>
            <span>업무분야</span>
          </nav>
          <p className="eyebrow">PRACTICE AREAS</p>
          <h1 id="practice-list-title">업무분야</h1>
          <p>
            사건의 성격과 쟁점을 정확히 파악하여 분야별 대응 방향을
            제시합니다.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
