import type { Metadata } from "next";
import { AiGuideSection } from "@/components/home/AiGuideSection";
import { CTASection } from "@/components/home/CTASection";
import { FeaturedCases } from "@/components/home/FeaturedCases";
import { Hero } from "@/components/home/Hero";
import { HomeLocationSection } from "@/components/location/HomeLocationSection";
import { LawyerSection } from "@/components/home/LawyerSection";
import { LegalGuides } from "@/components/home/LegalGuides";
import { PracticeAreas } from "@/components/home/PracticeAreas";
import { QuickIssueFinder } from "@/components/home/QuickIssueFinder";
import { MobileQuickBar } from "@/components/layout/MobileQuickBar";

export const metadata: Metadata = {
  title: {
    absolute: "법률사무소 제우",
  },
  description:
    "청주 민사소송, 형사소송, 이혼소송, 상속 사건 상담을 위한 법률사무소 제우 메인 페이지입니다.",
  openGraph: {
    title: "법률사무소 제우",
    description:
      "청주 민사소송, 형사소송, 이혼소송, 상속 사건 상담을 위한 법률사무소 제우입니다.",
    url: "https://www.jwlaw.co.kr",
    siteName: "법률사무소 제우",
    locale: "ko_KR",
    type: "website",
    images: [
      {
        url: "https://www.jwlaw.co.kr/images/lawyer/kang-byoungkwon-hero.png",
        width: 1200,
        height: 630,
        alt: "법률사무소 제우",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "법률사무소 제우",
    description:
      "청주 민사소송, 형사소송, 이혼소송, 상속 사건 상담을 위한 법률사무소 제우입니다.",
    images: ["https://www.jwlaw.co.kr/images/lawyer/kang-byoungkwon-hero.png"],
  },
};

export const revalidate = 60;

export default function Home() {
  return (
    <main>
      <Hero />
      <QuickIssueFinder />
      <PracticeAreas />
      <FeaturedCases />
      <AiGuideSection />
      <LegalGuides />
      <LawyerSection />
      <CTASection />
      <HomeLocationSection />
      <MobileQuickBar />
    </main>
  );
}
