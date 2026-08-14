import type { Metadata } from "next";
import { AiGuideShell } from "@/components/ai-guide/AiGuideShell";
import { MobileQuickBar } from "@/components/layout/MobileQuickBar";

export const metadata: Metadata = {
  title: "AI 상담 | 법률사무소 제우",
  description: "민사, 형사, 이혼·가사, 상속, 행정 사건의 분야와 상담 전 준비자료를 24시간 AI 상담으로 확인합니다.",
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
