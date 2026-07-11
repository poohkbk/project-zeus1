import Link from "next/link";
import { Reveal } from "@/components/animation/Reveal";
import { SimpleIcon } from "@/components/icons/SimpleIcon";
import { quickIssues } from "@/data/home";

export function QuickIssueFinder() {
  return (
    <section className="section" aria-labelledby="quick-issue-title">
      <div className="site-shell">
        <Reveal className="section-heading">
          <span className="section-kicker">빠른 사건 찾기</span>
          <h2 id="quick-issue-title">어떤 문제로 고민하고 계신가요?</h2>
          <p>
            현재 상황과 가장 가까운 항목을 선택하면 관련 업무분야와 사례를
            확인할 수 있습니다.
          </p>
        </Reveal>
        <div className="quick-grid">
          {quickIssues.map((issue, index) => (
            <Reveal key={issue.title} delay={index * 45}>
              <Link className="issue-card" href={issue.href}>
                <span className="icon-badge">
                  <SimpleIcon name={issue.icon} />
                </span>
                <strong>{issue.title}</strong>
                <span>{issue.description}</span>
                <em>
                  확인하기
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
