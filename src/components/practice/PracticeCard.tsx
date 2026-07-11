import Link from "next/link";
import { PracticeIcon } from "@/components/practice/PracticeIcon";
import type { PracticeArea } from "@/types/practice";

type PracticeCardProps = {
  area: PracticeArea;
};

export function PracticeCard({ area }: PracticeCardProps) {
  return (
    <Link className={`practice-list-card accent-${area.accent}`} href={`/practice/${area.slug}`}>
      <span className="practice-card-number">{String(area.order).padStart(2, "0")}</span>
      <span className="practice-card-icon">
        <PracticeIcon name={area.icon} />
      </span>
      <small>{area.englishTitle}</small>
      <h2>{area.title}</h2>
      <p>{area.shortDescription}</p>
      <ul aria-label={`${area.title} 주요 키워드`}>
        {area.issues.slice(0, 4).map((issue) => (
          <li key={issue.title}>{issue.title}</li>
        ))}
      </ul>
      <strong>자세히 보기</strong>
    </Link>
  );
}
