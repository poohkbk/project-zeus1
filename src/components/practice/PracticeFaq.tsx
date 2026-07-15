"use client";

import { useState } from "react";
import type { PracticeArea, PracticeFaqItem } from "@/types/practice";

export function PracticeFaq({ practice, faqs = practice.faq }: { practice: PracticeArea; faqs?: PracticeFaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section className="practice-section" aria-labelledby="practice-faq-title">
      <div className="site-shell faq-shell">
        <div className="section-heading">
          <span className="section-kicker">FAQ</span>
          <h2 id="practice-faq-title">자주 묻는 질문</h2>
          <p>{practice.title} 상담 전 자주 확인하는 내용을 정리했습니다.</p>
        </div>
        <div className="faq-list">
          {faqs.map((item, index) => {
            const open = openIndex === index;
            const panelId = `practice-faq-${practice.slug}-${index}`;
            return (
              <article className="faq-item" key={`${item.question}-${index}`}>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={panelId}
                  onClick={() => setOpenIndex(open ? null : index)}
                >
                  <span>{item.question}</span>
                  <strong aria-hidden="true">{open ? "－" : "+"}</strong>
                </button>
                <div id={panelId} hidden={!open}>
                  <p>{item.answer}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
