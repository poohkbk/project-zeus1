import Link from "next/link";
import { tagLabels } from "@/lib/case-taxonomy";
import type { PublicCaseContent } from "@/types/case";

export function CaseDetailHero({ caseItem }: { caseItem: PublicCaseContent }) {
  return (
    <section className={`case-detail-hero accent-${caseItem.accent}`} aria-labelledby="case-detail-title">
      <div className="site-shell case-detail-hero-grid">
        <div>
          <nav className="breadcrumb invert" aria-label="현재 위치">
            <Link href="/">홈</Link>
            <span aria-hidden="true">/</span>
            <Link href="/cases">승소사례</Link>
            <span aria-hidden="true">/</span>
            <span>{caseItem.categoryLabel}</span>
          </nav>
          <p className="eyebrow">{caseItem.categoryLabel} · {caseItem.subcategory}</p>
          <h1 id="case-detail-title">{caseItem.title}</h1>
          <p>{caseItem.excerpt}</p>
          <small>개인정보 보호를 위해 일부 사실관계는 삭제하거나 재구성하였습니다.</small>
          <ul aria-label="사례 태그">
            {caseItem.tags.slice(0, 4).map((tag) => (
              <li key={tag}>{tagLabels[tag] ?? tag}</li>
            ))}
          </ul>
        </div>
        {caseItem.heroImage ? (
          <figure className="case-detail-visual has-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={caseItem.heroImage} alt={`${caseItem.title} 대표 이미지`} />
          </figure>
        ) : (
          <div className="case-detail-visual" aria-hidden="true">
            <span>{caseItem.categoryLabel}</span>
            <strong>{caseItem.subcategory}</strong>
          </div>
        )}
      </div>
    </section>
  );
}
