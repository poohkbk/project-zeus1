import type { Metadata } from "next";
import { CasesExplorer } from "@/components/cases/CasesExplorer";
import { CasesListHero } from "@/components/cases/CasesListHero";
import { FeaturedCases } from "@/components/cases/FeaturedCases";
import { PracticeCTA } from "@/components/practice/PracticeCTA";
import { getPracticeAreas } from "@/data/practice";
import { getFeaturedCases, getPublishedCases } from "@/lib/case-selectors";

export const metadata: Metadata = {
  title: "승소사례",
  description:
    "청주 법률사무소 제우가 수행한 민사·형사·이혼·상속 사건의 주요 쟁점과 해결 과정을 소개합니다.",
};

type CasesPageProps = {
  searchParams: Promise<{
    category?: string;
    tags?: string;
    q?: string;
    sort?: string;
  }>;
};

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const params = await searchParams;
  const cases = getPublishedCases();
  const featured = getFeaturedCases({ placement: "category", limit: 6 });
  const searchRecommendations = getFeaturedCases({ placement: "search", limit: 3 });
  const fallbackPractice = getPracticeAreas()[0];

  return (
    <main>
      <CasesListHero />
      <FeaturedCases cases={featured} />
      <CasesExplorer cases={cases} searchRecommendations={searchRecommendations} initialParams={params} />
      <PracticeCTA practice={fallbackPractice} />
    </main>
  );
}
