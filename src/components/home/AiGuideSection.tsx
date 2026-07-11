import Link from "next/link";
import { Reveal } from "@/components/animation/Reveal";
import { SimpleIcon } from "@/components/icons/SimpleIcon";
import { siteConfig } from "@/config/site";

export function AiGuideSection() {
  return (
    <section className="ai-section" aria-labelledby="ai-guide-title">
      <div className="site-shell ai-grid">
        <Reveal className="ai-copy">
          <span className="section-kicker invert">AI Legal Guide</span>
          <h2 id="ai-guide-title">내 사건은 어디서부터 확인해야 할까요?</h2>
          <p>
            몇 가지 질문에 답하면 관련 업무분야, 준비자료와 상담 방향을 간단히
            확인할 수 있습니다.
          </p>
          <Link className="btn btn-accent" href={siteConfig.links.aiGuide}>
            AI 법률안내 시작
          </Link>
          <small>
            AI 안내는 일반적인 정보 제공을 위한 것이며, 구체적인 법률판단을
            대신하지 않습니다.
          </small>
        </Reveal>
        <Reveal className="question-preview" delay={120}>
          <div className="preview-card active">
            <span>01</span>
            <strong>현재 가장 급한 문제는 무엇인가요?</strong>
          </div>
          <div className="preview-card">
            <SimpleIcon name="contract" />
            계약 또는 금전 문제
          </div>
          <div className="preview-card">
            <SimpleIcon name="shield" />
            경찰 조사 또는 형사사건
          </div>
        </Reveal>
      </div>
    </section>
  );
}
