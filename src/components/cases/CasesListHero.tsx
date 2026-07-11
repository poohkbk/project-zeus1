import { Reveal } from "@/components/animation/Reveal";

export function CasesListHero() {
  return (
    <section className="cases-hero" aria-labelledby="cases-list-title">
      <div className="site-shell">
        <Reveal>
          <p className="eyebrow">CASE RESULTS</p>
          <h1 id="cases-list-title">승소사례</h1>
          <p>법률사무소 제우가 실제 수행한 사건을 바탕으로 주요 쟁점과 해결 과정을 소개합니다.</p>
          <small>개인정보 보호를 위해 일부 사실관계는 삭제하거나 재구성하였습니다.</small>
        </Reveal>
      </div>
    </section>
  );
}
