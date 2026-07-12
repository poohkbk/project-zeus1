import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "이용약관 | 법률사무소 제우",
  description: "법률사무소 제우 웹사이트 이용약관 안내입니다.",
};

export default function TermsPage() {
  return (
    <main className="policy-page">
      <section className="privacy-hero">
        <div className="site-shell">
          <nav className="page-breadcrumb" aria-label="현재 위치">
            <Link href="/">홈</Link>
            <span aria-hidden="true">/</span>
            <span>이용약관</span>
          </nav>
          <p className="eyebrow">TERMS</p>
          <h1>이용약관</h1>
          <p>본 페이지는 웹사이트 이용에 관한 기본 안내이며, 실제 운영 전 최종 검토가 필요합니다.</p>
        </div>
      </section>
      <section className="privacy-content">
        <div className="site-shell privacy-card">
          <h2>서비스 이용</h2>
          <p>본 웹사이트는 법률사무소 제우의 업무분야, 승소사례, 법률정보, 상담신청 안내를 제공합니다.</p>
          <h2>상담신청</h2>
          <p>웹페이지 상담신청만으로 위임계약이 성립하지 않으며, 실제 위임은 별도 계약으로 진행됩니다.</p>
          <h2>콘텐츠 이용</h2>
          <p>게시된 콘텐츠는 일반적인 법률정보 제공 목적이며 개별 사건의 법률자문을 대체하지 않습니다.</p>
        </div>
      </section>
    </main>
  );
}
