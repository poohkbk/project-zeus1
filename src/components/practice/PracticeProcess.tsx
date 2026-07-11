import { Reveal } from "@/components/animation/Reveal";
import type { PracticeArea } from "@/types/practice";

export function PracticeProcess({ practice }: { practice: PracticeArea }) {
  return (
    <section className="practice-section practice-section-muted" aria-labelledby="practice-process-title">
      <div className="site-shell">
        <Reveal className="section-heading">
          <span className="section-kicker">Process</span>
          <h2 id="practice-process-title">진행 절차</h2>
          <p>상담부터 결과 이후 정리까지 필요한 단계를 순서대로 안내합니다.</p>
        </Reveal>
        <ol className="practice-process">
          {practice.process.map((step, index) => (
            <Reveal key={step.title} delay={index * 45}>
              <li>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
