"use client";

import { useMemo, useState } from "react";
import { cmsCategoryLabels } from "@/data/cms-seed";
import type { PublicFaq } from "@/lib/data/faqs";
import type { CmsCategory } from "@/types/cms";

const categoryOptions: Array<{ value: "all" | CmsCategory; label: string }> = [
  { value: "all", label: "전체" },
  { value: "civil", label: cmsCategoryLabels.civil },
  { value: "criminal", label: cmsCategoryLabels.criminal },
  { value: "divorce", label: cmsCategoryLabels.divorce },
  { value: "inheritance", label: cmsCategoryLabels.inheritance },
  { value: "administrative", label: cmsCategoryLabels.administrative },
];

type SortMode = "latest" | "category";

function categoryLabel(category: string) {
  return cmsCategoryLabels[category as CmsCategory] ?? category;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function FaqExplorer({ faqs }: { faqs: PublicFaq[] }) {
  const [activeCategory, setActiveCategory] = useState<"all" | CmsCategory>("all");
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("latest");
  const [openQuestions, setOpenQuestions] = useState<Set<string>>(() => new Set(faqs.slice(0, 1).map((faq) => faq.id)));

  const visibleFaqs = useMemo(() => {
    const normalizedQuery = normalize(query);
    return faqs
      .filter((faq) => activeCategory === "all" || faq.category === activeCategory || faq.tags.includes(activeCategory))
      .filter((faq) => {
        if (!normalizedQuery) return true;
        const haystack = normalize([faq.question, faq.answer, faq.category, ...faq.tags].join(" "));
        return haystack.includes(normalizedQuery);
      })
      .sort((a, b) => {
        if (sortMode === "category") {
          const categoryCompare = categoryLabel(a.category).localeCompare(categoryLabel(b.category), "ko-KR");
          if (categoryCompare !== 0) return categoryCompare;
        }
        const dateCompare = (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
        if (dateCompare !== 0) return dateCompare;
        return (a.sortOrder ?? 9999) - (b.sortOrder ?? 9999);
      });
  }, [activeCategory, faqs, query, sortMode]);

  function toggle(id: string) {
    setOpenQuestions((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="faq-directory" aria-labelledby="faq-directory-title">
      <div className="faq-directory-toolbar">
        <div>
          <h2 id="faq-directory-title">자주 묻는 질문 모음</h2>
          <p>분야를 고르거나 검색어를 입력해 필요한 질문을 빠르게 확인할 수 있습니다.</p>
        </div>
        <label>
          정렬
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
            <option value="latest">최신순</option>
            <option value="category">분야별</option>
          </select>
        </label>
      </div>

      <div className="faq-filter-tabs" aria-label="FAQ 분야 필터">
        {categoryOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            data-active={activeCategory === option.value}
            onClick={() => setActiveCategory(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <label className="faq-search-box">
        질문 검색
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="예: 상담예약, 경찰조사, 재산분할"
        />
      </label>

      <div className="faq-result-count" aria-live="polite">
        {visibleFaqs.length}개의 FAQ가 표시됩니다.
      </div>

      <div className="faq-list">
        {visibleFaqs.map((faq) => {
          const isOpen = openQuestions.has(faq.id);
          return (
            <article key={faq.id} className="faq-item">
              <button type="button" aria-expanded={isOpen} onClick={() => toggle(faq.id)}>
                <span>질문</span>
                {faq.question}
                <strong>{isOpen ? "－" : "＋"}</strong>
              </button>
              {isOpen ? (
                <div>
                  <strong>답변</strong>
                  <p>{faq.answer}</p>
                  <small>{categoryLabel(faq.category)}</small>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      {!visibleFaqs.length ? (
        <p className="faq-empty">조건에 맞는 FAQ가 없습니다. 검색어를 줄이거나 전체 분야로 다시 확인해 주세요.</p>
      ) : null}
    </section>
  );
}
