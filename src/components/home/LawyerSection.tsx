import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/animation/Reveal";
import { SimpleIcon } from "@/components/icons/SimpleIcon";
import { siteConfig } from "@/config/site";
import { lawyerHighlights } from "@/data/home";

export function LawyerSection() {
  return (
    <section className="lawyer-section" aria-labelledby="lawyer-title">
      <div className="site-shell lawyer-grid">
        <Reveal className="lawyer-photo">
          <div className="profile-image-card compact">
            <Image
              src="/images/lawyer/kang-byoungkwon-profile.png"
              alt="강병권 변호사 프로필"
              width={720}
              height={860}
              sizes="(max-width: 900px) 100vw, 40vw"
            />
          </div>
        </Reveal>
        <Reveal className="lawyer-copy" delay={120}>
          <span className="section-kicker">Lawyer</span>
          <h2 id="lawyer-title">강병권 변호사</h2>
          <p>
            의뢰인의 이야기를 충분히 듣고, 사건의 사실관계와 자료를 세밀하게
            검토하여 현실적인 대응 방향을 제시합니다.
          </p>
          <ul className="highlight-list">
            {lawyerHighlights.map((item) => (
              <li key={item.label}>
                <SimpleIcon name="check" />
                {item.label}
              </li>
            ))}
          </ul>
          <Link className="btn btn-secondary" href={siteConfig.links.lawyer}>
            변호사 소개 보기
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
