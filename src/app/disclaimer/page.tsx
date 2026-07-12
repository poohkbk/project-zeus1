import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "면책공고 | 법률사무소 제우",
  description: "법률사무소 제우 웹사이트 면책공고 안내입니다.",
};

export default function DisclaimerPage() {
  return (
    <main className="policy-page">
      <section className="privacy-hero">
        <div className="site-shell">
          <nav className="page-breadcrumb" aria-label="현재 위치">
            <Link href="/">홈</Link>
            <span aria-hidden="true">/</span>
            <span>면책공고</span>
          </nav>
          <p className="eyebrow">DISCLAIMER</p>
          <h1>면책공고</h1>
          <p>본 페이지는 일반 안내 초안이며, 실제 운영 전 최종 검토가 필요합니다.</p>
        </div>
      </section>
      <section className="privacy-content">
        <div className="site-shell privacy-card">
          <h2>일반 정보 제공</h2>
          <p>본 사이트의 콘텐츠는 일반 정보 제공 목적이며 개별 법률자문이 아닙니다.</p>
          <h2>결과 보장 없음</h2>
          <p>승소사례는 유사 사건의 동일한 결과를 보장하지 않습니다.</p>
          <h2>AI 안내</h2>
          <p>AI 결과는 참고용이며 변호사의 법률 판단을 대체하지 않습니다.</p>
          <h2>긴급 사건</h2>
          <p>법정 기한이나 수사기관 출석 등 긴급한 사건은 전화로 직접 확인해야 합니다.</p>
        </div>
      </section>
    </main>
  );
}
