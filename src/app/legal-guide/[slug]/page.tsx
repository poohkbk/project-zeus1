import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { legalGuideContents } from "@/data/legal-guides";
import { getLegalGuideBySlug } from "@/lib/data/legal-guides";

type LegalGuideDetailPageProps = {
  params: Promise<{ slug: string }>;
};

const fallbackSectionLabels = {
  checkCases: "이런 경우라면 확인해 보세요",
  legalView: "법적으로 어떻게 판단될까요?",
  process: "해결 절차는 어떻게 진행될까요?",
  cautions: "꼭 알아야 할 주의사항",
};

function ParagraphBlock({ text }: { text?: string }) {
  const paragraphs = (text ?? "")
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  if (!paragraphs.length) return <p>작성된 내용이 없습니다.</p>;

  return (
    <>
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{paragraph}</p>
      ))}
    </>
  );
}

export const dynamicParams = true;
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateStaticParams() {
  return legalGuideContents.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({ params }: LegalGuideDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = await getLegalGuideBySlug(slug);
  if (!guide) return { title: "법률가이드를 찾을 수 없습니다" };

  return {
    title: guide.title,
    description: guide.excerpt,
    alternates: { canonical: `/legal-guide/${guide.slug}` },
    openGraph: {
      title: guide.title,
      description: guide.excerpt,
      url: `/legal-guide/${guide.slug}`,
      type: "article",
    },
  };
}

export default async function LegalGuideDetailPage({ params }: LegalGuideDetailPageProps) {
  const { slug } = await params;
  const guide = await getLegalGuideBySlug(slug);
  if (!guide) notFound();

  const sections = {
    checkCases: guide.sections?.checkCases || guide.excerpt,
    legalView: guide.sections?.legalView || guide.excerpt,
    process: guide.sections?.process || "사안의 내용을 정리한 뒤 필요한 자료를 확인하고, 상담을 통해 대응 방향을 정합니다.",
    cautions: guide.sections?.cautions || "구체적인 판단은 사실관계와 증거에 따라 달라질 수 있으므로, 관련 자료를 보관한 뒤 상담을 받는 것이 좋습니다.",
  };

  return (
    <main className="legal-guide-detail">
      <section className="practice-hero list-hero">
        <div className="site-shell">
          <nav className="breadcrumb invert" aria-label="현재 위치">
            <Link href="/">홈</Link>
            <span>/</span>
            <Link href="/legal-guide">법률가이드</Link>
            <span>/</span>
            <span>{guide.category}</span>
          </nav>
          <p className="eyebrow">Legal Guide</p>
          <h1>{guide.title}</h1>
          <p>{guide.excerpt}</p>
        </div>
      </section>

      <section className="case-detail-section">
        <div className="site-shell legal-guide-sections">
          <article>
            <span className="section-kicker">Check</span>
            <h2>{fallbackSectionLabels.checkCases}</h2>
            <ParagraphBlock text={sections.checkCases} />
          </article>
          <article>
            <span className="section-kicker">Legal View</span>
            <h2>{fallbackSectionLabels.legalView}</h2>
            <ParagraphBlock text={sections.legalView} />
          </article>
          <article>
            <span className="section-kicker">Process</span>
            <h2>{fallbackSectionLabels.process}</h2>
            <ParagraphBlock text={sections.process} />
          </article>
          <article>
            <span className="section-kicker">Caution</span>
            <h2>{fallbackSectionLabels.cautions}</h2>
            <ParagraphBlock text={sections.cautions} />
          </article>
        </div>
      </section>
    </main>
  );
}
