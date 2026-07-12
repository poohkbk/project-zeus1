import type { Metadata } from "next";
import { ConsultationForm } from "@/components/consultation/ConsultationForm";
import { ConsultationHero } from "@/components/consultation/ConsultationHero";
import { ConsultationNotice } from "@/components/consultation/ConsultationNotice";
import { MobileQuickBar } from "@/components/layout/MobileQuickBar";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "상담신청 | 법률사무소 제우",
  description:
    "청주 법률사무소 제우의 민사·형사·이혼·상속 상담신청 페이지입니다. 상담 내용을 남겨주시면 확인 후 연락드립니다.",
  alternates: {
    canonical: "/consultation",
  },
  robots: {
    index: true,
    follow: true,
  },
};

interface ConsultationPageProps {
  searchParams?: Promise<{
    aiTransfer?: string;
  }>;
}

export default async function ConsultationPage({ searchParams }: ConsultationPageProps) {
  const resolvedSearchParams = await searchParams;
  const aiTransferToken =
    typeof resolvedSearchParams?.aiTransfer === "string" ? resolvedSearchParams.aiTransfer : undefined;

  return (
    <main className="consultation-page">
      <ConsultationHero />
      <div className="site-shell consultation-layout">
        <div>
          <ConsultationNotice />
          <ConsultationForm aiTransferToken={aiTransferToken} />
        </div>
        <aside className="consultation-side-panel" aria-labelledby="consultation-side-title">
          <span className="section-kicker">Urgent</span>
          <h2 id="consultation-side-title">긴급상담 안내</h2>
          <p>
            체포·구속, 수사기관 출석, 법원 제출기한처럼 시간이 촉박한 사건은
            온라인 접수보다 대표전화 상담이 더 빠릅니다.
          </p>
          <a className="btn btn-accent" href={siteConfig.phoneHref}>
            {siteConfig.phone} 전화하기
          </a>
        </aside>
      </div>
      <MobileQuickBar />
    </main>
  );
}
