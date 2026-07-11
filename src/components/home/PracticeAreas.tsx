import Link from "next/link";
import { Reveal } from "@/components/animation/Reveal";
import { SimpleIcon } from "@/components/icons/SimpleIcon";
import { practiceAreas } from "@/data/home";

export function PracticeAreas() {
  return (
    <section className="section section-muted section-lined" aria-labelledby="practice-title">
      <div className="site-shell">
        <Reveal className="section-heading">
          <span className="section-kicker">Practice Areas</span>
          <h2 id="practice-title">대표 업무분야</h2>
          <p>사건의 특성과 쟁점을 정확히 파악하여 분야별 대응 방향을 제시합니다.</p>
        </Reveal>
        <div className="practice-grid">
          {practiceAreas.map((area, index) => (
            <Reveal key={area.title} delay={index * 60}>
              <Link className={`practice-card tone-${area.tone}`} href={area.href}>
                <span className="card-line" />
                <span className="practice-number">{area.number}</span>
                <small>{area.subtitle}</small>
                <strong>{area.title}</strong>
                <p>{area.description}</p>
                <em>
                  자세히 보기
                  <SimpleIcon name="arrow" />
                </em>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
