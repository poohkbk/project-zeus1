import Image from "next/image";
import Link from "next/link";
import { tagLabels } from "@/lib/case-taxonomy";
import type { CaseCardContent } from "@/types/case";

export function CaseCard({ caseItem }: { caseItem: CaseCardContent }) {
  return (
    <Link className={`case-result-card accent-${caseItem.accent}`} href={caseItem.href} prefetch>
      {caseItem.heroImage ? (
        <div className="case-card-media has-image">
          <Image
            src={caseItem.heroImage}
            alt={`${caseItem.title} 대표 이미지`}
            fill
            sizes="(max-width: 720px) 100vw, (max-width: 1100px) 50vw, 33vw"
          />
        </div>
      ) : (
        <div className="case-card-media" aria-hidden="true">
          <span>{caseItem.categoryLabel}</span>
        </div>
      )}
      <div className="case-card-body">
        <div className="case-card-badges">
          <span>{caseItem.categoryLabel}</span>
          {caseItem.visibility.isFeatured ? <strong>대표 사례</strong> : null}
        </div>
        <small>{caseItem.subcategory}</small>
        <h3>{caseItem.title}</h3>
        <p>{caseItem.excerpt}</p>
        <ul aria-label="관련 태그">
          {caseItem.tags.slice(0, 3).map((tag) => (
            <li key={tag}>{tagLabels[tag] ?? tag}</li>
          ))}
        </ul>
        <em>자세히 보기</em>
      </div>
    </Link>
  );
}
