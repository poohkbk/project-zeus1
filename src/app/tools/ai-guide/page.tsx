import type { Metadata } from "next";
import { AiGuideShell } from "@/components/ai-guide/AiGuideShell";
import { MobileQuickBar } from "@/components/layout/MobileQuickBar";

export const metadata: Metadata = {
  title: "AI 법률안내 | 법률사무소 제우",
  description: "민사, 형사, 이혼·가사, 상속, 행정 사건의 상담 전 준비자료와 관련 콘텐츠를 안내합니다.",
  alternates: {
    canonical: "/tools/ai-guide",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function AiGuidePage() {
  return (
    <main className="ai-guide-page">
      <AiGuideShell />
      <MobileQuickBar />
    </main>
  );
}
