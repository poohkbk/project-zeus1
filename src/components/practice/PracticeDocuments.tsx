import { SimpleIcon } from "@/components/icons/SimpleIcon";
import type { PracticeArea } from "@/types/practice";

export function PracticeDocuments({ practice }: { practice: PracticeArea }) {
  return (
    <section className="practice-documents" aria-labelledby="practice-documents-title">
      <div className="site-shell docs-grid">
        <div>
          <span className="section-kicker">Documents</span>
          <h2 id="practice-documents-title">준비서류</h2>
          <p>처음 상담에서는 모든 자료가 완벽하지 않아도 됩니다. 가지고 있는 자료부터 확인해 방향을 정합니다.</p>
        </div>
        <ul>
          {practice.documents.map((document) => (
            <li key={document}>
              <SimpleIcon name="check" />
              {document}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
