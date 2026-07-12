import type { Metadata } from "next";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { absoluteUrl } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: {
    absolute: "오시는 길 | 법률사무소 제우",
  },
  description: "청주 법률사무소 제우 주소와 상담 연락처를 안내합니다.",
  alternates: {
    canonical: absoluteUrl("/about/location"),
  },
};

export default function LocationPage() {
  return (
    <main className="list-page">
      <section className="practice-hero list-hero">
        <div className="site-shell">
          <nav className="breadcrumb invert" aria-label="현재 위치">
            <Link href="/">홈</Link>
            <span>/</span>
            <span>오시는 길</span>
          </nav>
          <p className="eyebrow">Location</p>
          <h1>법률사무소 제우 오시는 길</h1>
          <p>방문 상담 전 전화 또는 온라인 상담신청으로 일정을 확인해주세요.</p>
        </div>
      </section>

      <section className="practice-section">
        <div className="site-shell admin-panel">
          <h2>사무소 정보</h2>
          <p>{siteConfig.address}</p>
          <p>
            전화: <a href={siteConfig.phoneHref}>{siteConfig.phone}</a>
          </p>
          <Link className="btn btn-secondary" href="/consultation">
            상담신청
          </Link>
        </div>
      </section>
    </main>
  );
}
