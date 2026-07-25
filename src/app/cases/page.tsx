import type { Metadata } from "next";
import { CasesExplorer } from "@/components/cases/CasesExplorer";
import { CasesListHero } from "@/components/cases/CasesListHero";
import { FeaturedCases } from "@/components/cases/FeaturedCases";
import { PracticeCTA } from "@/components/practice/PracticeCTA";
import { getPracticeAreas } from "@/data/practice";
import { getCasesListing } from "@/lib/data/cases";

export const metadata: Metadata = {
  title: "승소사례",
  description:
    "청주 법률사무소 제우가 수행한 민사·형사·이혼·상속 사건의 주요 쟁점과 해결 과정을 소개합니다.",
};

export const revalidate = 60;

export default async function CasesPage() {
  const { cases, featured, searchRecommendations } = await getCasesListing();
  const fallbackPractice = getPracticeAreas()[0];

  return (
    <main>
      <CasesListHero />
      <FeaturedCases cases={featured} />
      <CasesExplorer cases={cases} searchRecommendations={searchRecommendations} />
      <PracticeCTA practice={fallbackPractice} />
    </main>
  );
}
