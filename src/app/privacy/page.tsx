import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "개인정보처리방침 | 법률사무소 제우",
  description: "법률사무소 제우 상담 신청 페이지의 개인정보 수집 및 이용 안내입니다.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <main className="privacy-page">
      <section className="privacy-hero">
        <div className="site-shell">
          <nav className="page-breadcrumb" aria-label="현재 위치">
            <Link href="/">홈</Link>
            <span aria-hidden="true">/</span>
            <span>개인정보처리방침</span>
          </nav>
          <p className="eyebrow">PRIVACY</p>
          <h1>개인정보처리방침</h1>
          <p>
            본 페이지의 내용은 웹페이지 구축 단계의 기본 안내이며, 실제 운영 전
            최종 개인정보처리방침을 확정해야 합니다.
          </p>
        </div>
      </section>

      <section className="privacy-content">
        <div className="site-shell privacy-card">
          <h2>상담 신청 시 수집 항목</h2>
          <p>이름, 연락처, 사건 분야, 상담 내용을 수집합니다.</p>

          <h2>수집 목적</h2>
          <p>상담 신청 확인, 상담 일정 안내, 상담 관련 연락을 위해 이용합니다.</p>

          <h2>보유 기간</h2>
          <p>상담 목적 달성 후 관련 법령 및 내부 정책에 따라 지체 없이 파기합니다.</p>

          <h2>파기 절차</h2>
          <p>
            보유 기간이 지난 개인정보는 복구 또는 재생되지 않도록 안전한 방식으로
            파기합니다.
          </p>

          <h2>문의 연락처</h2>
          <p>
            개인정보 관련 문의는 대표전화{" "}
            <a href={siteConfig.phoneHref}>{siteConfig.phone}</a>로 연락해 주세요.
          </p>
        </div>
      </section>
    </main>
  );
}
