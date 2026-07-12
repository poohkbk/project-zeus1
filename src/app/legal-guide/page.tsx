import type { Metadata } from "next";
import Link from "next/link";
import { legalGuideContents } from "@/data/legal-guides";
import { absoluteUrl } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: {
    absolute: "청주 법률가이드 | 민사·형사·이혼·상속 상담자료 | 법률사무소 제우",
  },
  description: "청주 민사, 형사, 이혼, 상속 사건을 준비할 때 확인할 수 있는 법률가이드 목록입니다.",
  alternates: {
    canonical: absoluteUrl("/legal-guide"),
  },
};

export default function LegalGuidePage() {
  return (
    <main className="list-page">
      <section className="practice-hero list-hero">
        <div className="site-shell">
          <nav className="breadcrumb invert" aria-label="현재 위치">
            <Link href="/">홈</Link>
            <span>/</span>
            <span>법률가이드</span>
          </nav>
          <p className="eyebrow">Legal Guide</p>
          <h1>청주 법률상담을 준비하는 법률가이드</h1>
          <p>민사, 형사, 이혼·가사, 상속 사건에서 자주 묻는 쟁점과 준비자료를 정리했습니다.</p>
        </div>
      </section>

      <section className="practice-section">
        <div className="site-shell guide-grid">
          {legalGuideContents.map((guide) => (
            <Link key={guide.id} href={guide.href} className="guide-card">
              <span className="case-category">{guide.category}</span>
              <strong>{guide.title}</strong>
              <p>{guide.excerpt}</p>
              <em>{guide.readingTime ?? "5분"} 읽기</em>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
