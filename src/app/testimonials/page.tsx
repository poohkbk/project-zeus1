import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cmsCategoryLabels } from "@/data/cms-seed";
import { getPublishedTestimonials } from "@/lib/data/testimonials";
import { absoluteUrl } from "@/lib/seo/metadata";

export const revalidate = 60;

export const metadata: Metadata = {
  title: { absolute: "의뢰인 후기 | 법률사무소 제우" },
  description: "법률사무소 제우와 사건을 함께한 의뢰인들의 이야기를 소개합니다.",
  alternates: { canonical: absoluteUrl("/testimonials") },
};

export default async function TestimonialsPage() {
  const testimonials = await getPublishedTestimonials();

  return (
    <main className="list-page">
      <section className="practice-hero list-hero">
        <div className="site-shell">
          <nav className="breadcrumb invert" aria-label="현재 위치">
            <Link href="/">홈</Link><span>/</span><span>의뢰인 후기</span>
          </nav>
          <p className="eyebrow">CLIENT STORIES</p>
          <h1>의뢰인의 이야기</h1>
          <p>사건을 맡기며 느낀 점과 해결 과정에 대한 의뢰인의 진솔한 후기를 전합니다. 개인정보 보호를 위해 일부 내용은 익명 처리했습니다.</p>
        </div>
      </section>

      <section className="practice-section">
        <div className="site-shell testimonial-list">
          {testimonials.length ? testimonials.map((item) => (
            <article className="testimonial-card" key={item.id}>
              {item.imageUrl ? (
                <div className="testimonial-image">
                  <Image src={item.imageUrl} alt={item.imageAlt || "의뢰인 후기 이미지"} fill sizes="(max-width: 760px) 100vw, 360px" />
                </div>
              ) : null}
              <div className="testimonial-copy">
                <span>{cmsCategoryLabels[item.category as keyof typeof cmsCategoryLabels] ?? "법률상담"}</span>
                <h2>{item.title}</h2>
                {item.summary ? <strong>{item.summary}</strong> : null}
                <p>{item.body}</p>
              </div>
            </article>
          )) : (
            <div className="testimonial-empty">
              <h2>의뢰인 후기를 준비하고 있습니다.</h2>
              <p>관리자 페이지에서 공개한 후기가 이곳에 표시됩니다.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
