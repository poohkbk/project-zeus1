import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { absoluteUrl } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: {
    absolute: "강병권 변호사 소개 | 법률사무소 제우",
  },
  description: "법률사무소 제우 강병권 변호사의 주요 상담 분야와 사무소 정보를 안내합니다.",
  alternates: {
    canonical: absoluteUrl("/about/lawyer"),
  },
};

export default function LawyerProfilePage() {
  return (
    <main className="lawyer-profile-page">
      <section className="practice-hero list-hero">
        <div className="site-shell">
          <nav className="breadcrumb invert" aria-label="현재 위치">
            <Link href="/">홈</Link>
            <span>/</span>
            <span>변호사 소개</span>
          </nav>
          <p className="eyebrow">Attorney Profile</p>
          <h1>강병권 변호사</h1>
          <p>민사, 형사, 이혼·가사, 상속 사건에서 의뢰인의 자료와 사실관계를 차분히 검토합니다.</p>
        </div>
      </section>

      <section className="lawyer-section">
        <div className="site-shell lawyer-grid">
          <Image
            src="/images/lawyer/kang-byoungkwon-profile.png"
            alt="법률사무소 제우 강병권 변호사"
            width={420}
            height={520}
            sizes="(max-width: 900px) 100vw, 420px"
          />
          <div className="lawyer-copy">
            <p className="eyebrow">법률사무소 제우</p>
            <h2>사건의 출발점부터 필요한 자료를 함께 정리합니다.</h2>
            <p>
              법률상담은 결과를 단정하는 일이 아니라, 현재 확인 가능한 사실과 부족한 자료를 나누는
              일에서 시작됩니다. 법률사무소 제우는 청주 지역 의뢰인의 민사, 형사, 이혼·가사, 상속
              사건을 중심으로 상담합니다.
            </p>
            <ul className="highlight-list">
              <li>민사소송</li>
              <li>형사사건</li>
              <li>이혼·가사</li>
              <li>상속분쟁</li>
            </ul>
            <Link className="btn btn-secondary" href="/consultation">
              상담신청
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
