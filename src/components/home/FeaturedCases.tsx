import Link from "next/link";
import { Reveal } from "@/components/animation/Reveal";
import { SimpleIcon } from "@/components/icons/SimpleIcon";
import { siteConfig } from "@/config/site";
import { featuredCases } from "@/data/home";

export function FeaturedCases() {
  return (
    <section className="section" aria-labelledby="cases-title">
      <div className="site-shell">
        <Reveal className="section-heading">
          <span className="section-kicker">Cases</span>
          <h2 id="cases-title">대표 승소사례</h2>
          <p>
            법률사무소 제우가 실제로 수행한 주요 사건의 쟁점과 해결 과정을
            확인해보세요.
          </p>
        </Reveal>
        <div className="case-grid">
          {featuredCases.map((item, index) => (
            <Reveal key={item.title} delay={index * 45}>
              <Link className="case-card" href={item.href}>
                <span className="case-category">{item.category}</span>
                <strong>{item.title}</strong>
                <p>{item.summary}</p>
                <em>
                  자세히 보기
                  <SimpleIcon name="arrow" />
                </em>
              </Link>
            </Reveal>
          ))}
        </div>
        <Reveal className="section-action">
          <Link className="btn btn-secondary" href={siteConfig.links.cases}>
            승소사례 전체보기
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
