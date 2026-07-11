import { Reveal } from "@/components/animation/Reveal";
import type { PracticeArea } from "@/types/practice";

export function PracticeIssueGrid({ practice }: { practice: PracticeArea }) {
  return (
    <section className="practice-section" aria-labelledby="practice-issues-title">
      <div className="site-shell">
        <Reveal className="section-heading">
          <span className="section-kicker">Issues</span>
          <h2 id="practice-issues-title">주요 사건 유형</h2>
          <p>법률용어보다 실제 상황을 기준으로 쟁점을 나누어 확인합니다.</p>
        </Reveal>
        <div className="practice-issue-grid">
          {practice.issues.map((issue, index) => (
            <Reveal key={issue.title} delay={index * 35}>
              <article className="practice-info-card">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <h3>{issue.title}</h3>
                <p>{issue.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
