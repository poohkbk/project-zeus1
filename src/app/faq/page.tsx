import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedFaqs } from "@/lib/data/faqs";
import { absoluteUrl } from "@/lib/seo/metadata";

export const metadata: Metadata = {
  title: {
    absolute: "청주 법률상담 FAQ | 민사·형사·이혼·상속 질문 | 법률사무소 제우",
  },
  description: "청주 민사, 형사, 이혼, 상속 상담 전 자주 묻는 질문과 기본 답변을 정리했습니다.",
  alternates: {
    canonical: absoluteUrl("/faq"),
  },
};

export default async function FaqPage() {
  const faqs = await getPublishedFaqs();

  return (
    <main className="list-page">
      <section className="practice-hero list-hero">
        <div className="site-shell">
          <nav className="breadcrumb invert" aria-label="현재 위치">
            <Link href="/">홈</Link>
            <span>/</span>
            <span>FAQ</span>
          </nav>
          <p className="eyebrow">FAQ</p>
          <h1>청주 법률상담 자주 묻는 질문</h1>
          <p>상담 전 많이 묻는 질문을 분야별로 정리했습니다. 개별 사건은 자료와 사실관계에 따라 달라질 수 있습니다.</p>
        </div>
      </section>

      <section className="practice-section">
        <div className="site-shell faq-seo-list">
          <section>
            <h2>자주 묻는 질문</h2>
              <div className="faq-list">
                {faqs.map((faq) => (
                  <article key={faq.question} className="faq-item">
                    <button type="button" aria-expanded="true">
                      {faq.question}
                      <strong>Q</strong>
                    </button>
                    <div>
                      <p>{faq.answer}</p>
                    </div>
                  </article>
                ))}
              </div>
          </section>
        </div>
      </section>
    </main>
  );
}
