"use client";

import { useEffect, useMemo, useState } from "react";
import { CaseCard } from "@/components/cases/CaseCard";
import { EmptyCasesState } from "@/components/cases/EmptyCasesState";
import { categoryLabels, tagLabels, tagsByCategory } from "@/lib/case-taxonomy";
import { filterAndSortCases, isCaseCategory } from "@/lib/case-filter";
import type { CaseCategory, CaseFilterState, CaseSortOption, PublicCaseContent } from "@/types/case";

type CasesExplorerProps = {
  cases: PublicCaseContent[];
  searchRecommendations: PublicCaseContent[];
  initialParams: {
    category?: string;
    tags?: string;
    q?: string;
    sort?: string;
  };
};

const initialVisibleCount = 12;
const stepCount = 12;

function parseSort(value: string | undefined): CaseSortOption {
  return value === "featured" || value === "relevance" ? value : "latest";
}

function parseCategory(value: string | undefined): CaseCategory | "all" {
  return value && isCaseCategory(value) ? value : "all";
}

export function CasesExplorer({ cases, searchRecommendations, initialParams }: CasesExplorerProps) {
  const [filter, setFilter] = useState<CaseFilterState>({
    category: parseCategory(initialParams.category),
    tags: initialParams.tags ? initialParams.tags.split(",").filter(Boolean) : [],
    q: initialParams.q ?? "",
    sort: parseSort(initialParams.sort),
  });
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount);
  const [draftQuery, setDraftQuery] = useState(filter.q);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setFilter((current) => ({ ...current, q: draftQuery }));
      setVisibleCount(initialVisibleCount);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [draftQuery]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter.category !== "all") params.set("category", filter.category);
    if (filter.tags.length > 0) params.set("tags", filter.tags.join(","));
    if (filter.q.trim()) params.set("q", filter.q.trim());
    if (filter.sort !== "latest") params.set("sort", filter.sort);
    const next = params.toString() ? `/cases?${params}` : "/cases";
    window.history.replaceState(null, "", next);
  }, [filter]);

  const availableTags = tagsByCategory[filter.category];
  const results = useMemo(() => filterAndSortCases(cases, filter), [cases, filter]);
  const visibleCases = results.slice(0, visibleCount);
  const recommendationIds = new Set(results.map((item) => item.id));
  const recommendations = searchRecommendations.filter((item) => !recommendationIds.has(item.id));

  const updateFilter = (partial: Partial<CaseFilterState>) => {
    setFilter((current) => ({ ...current, ...partial }));
    setVisibleCount(initialVisibleCount);
  };

  const toggleTag = (tag: string) => {
    updateFilter({
      tags: filter.tags.includes(tag)
        ? filter.tags.filter((item) => item !== tag)
        : [...filter.tags, tag],
    });
  };

  const reset = () => {
    setDraftQuery("");
    setFilter({ category: "all", tags: [], q: "", sort: "latest" });
    setVisibleCount(initialVisibleCount);
  };

  return (
    <section className="cases-section" aria-labelledby="cases-explorer-title">
      <div className="site-shell">
        <div className="cases-filter-panel">
          <div className="section-heading">
            <span className="section-kicker">Search</span>
            <h2 id="cases-explorer-title">전체 승소사례</h2>
          </div>
          <div className="cases-controls">
            <label>
              <span>키워드 검색</span>
              <input
                value={draftQuery}
                onChange={(event) => setDraftQuery(event.target.value)}
                placeholder="예: 재산분할, 차용증, 경찰조사"
              />
            </label>
            <label>
              <span>정렬</span>
              <select
                value={filter.sort}
                onChange={(event) => updateFilter({ sort: event.target.value as CaseSortOption })}
              >
                <option value="latest">최신순</option>
                <option value="featured">추천순</option>
                <option value="relevance">관련도순</option>
              </select>
            </label>
          </div>
          <div className="cases-chip-row" aria-label="카테고리 필터">
            <button type="button" aria-pressed={filter.category === "all"} onClick={() => updateFilter({ category: "all", tags: [] })}>
              전체
            </button>
            {(Object.keys(categoryLabels) as CaseCategory[]).map((category) => (
              <button
                type="button"
                key={category}
                aria-pressed={filter.category === category}
                onClick={() => updateFilter({ category, tags: [] })}
              >
                {categoryLabels[category]}
              </button>
            ))}
          </div>
          <div className="cases-chip-row tags" aria-label="세부 태그 필터">
            {availableTags.map((tag) => (
              <button type="button" key={tag} aria-pressed={filter.tags.includes(tag)} onClick={() => toggleTag(tag)}>
                {tagLabels[tag] ?? tag}
              </button>
            ))}
          </div>
          <div className="cases-result-meta">
            <p aria-live="polite">
              전체 {results.length}건 중 {Math.min(visibleCount, results.length)}건을 표시하고 있습니다.
            </p>
            <button type="button" onClick={reset}>
              필터 초기화
            </button>
          </div>
        </div>

        {recommendations.length > 0 && results.length <= 3 ? (
          <div className="search-recommendations">
            <h3>추천 사례</h3>
            <div className="case-results-grid compact">
              {recommendations.map((caseItem) => (
                <CaseCard key={caseItem.id} caseItem={caseItem} />
              ))}
            </div>
          </div>
        ) : null}

        {visibleCases.length > 0 ? (
          <div className="case-results-grid">
            {visibleCases.map((caseItem) => (
              <CaseCard key={caseItem.id} caseItem={caseItem} />
            ))}
          </div>
        ) : (
          <EmptyCasesState />
        )}

        {visibleCount < results.length ? (
          <div className="section-action">
            <button className="btn btn-secondary" type="button" onClick={() => setVisibleCount((count) => count + stepCount)}>
              더보기
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
