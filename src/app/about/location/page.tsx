import type { Metadata } from "next";
import Link from "next/link";
import { OfficeInformation } from "@/components/location/OfficeInformation";
import { OfficeMap } from "@/components/location/OfficeMap";
import { ParkingGuide } from "@/components/location/ParkingGuide";
import { TransportationGuide } from "@/components/location/TransportationGuide";
import { StructuredData } from "@/components/seo/StructuredData";
import { siteConfig } from "@/config/site";
import { absoluteUrl, siteUrl } from "@/lib/seo/metadata";
import { organizationJsonLd } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: {
    absolute: "오시는 길 | 청주 법률사무소 제우",
  },
  description:
    "충북 청주시 서원구 산남동 청주지방법원 인근에 위치한 법률사무소 제우의 주소, 연락처, 운영시간과 방문 안내입니다.",
  alternates: {
    canonical: absoluteUrl("/about/location"),
  },
};

export default function LocationPage() {
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "홈",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "제우 소개",
        item: absoluteUrl("/about/lawyer"),
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "오시는 길",
        item: absoluteUrl("/about/location"),
      },
    ],
  };

  return (
    <main className="list-page">
      <StructuredData data={[organizationJsonLd(), breadcrumbJsonLd]} />
      <section className="practice-hero list-hero">
        <div className="site-shell">
          <nav className="breadcrumb invert" aria-label="현재 위치">
            <Link href="/">홈</Link>
            <span>/</span>
            <Link href={siteConfig.links.lawyer}>제우 소개</Link>
            <span>/</span>
            <span>오시는 길</span>
          </nav>
          <p className="eyebrow">Location</p>
          <h1>오시는 길</h1>
          <p>법률사무소 제우는 청주지방법원 인근 산남동에 위치하고 있습니다.</p>
          <p>방문 상담을 원하시면 전화 또는 온라인 상담신청을 통해 일정을 먼저 확인해주세요.</p>
        </div>
      </section>

      <section className="practice-section location-section">
        <div className="site-shell location-grid">
          <OfficeMap />
          <OfficeInformation />
        </div>
      </section>

      <section className="practice-section practice-section-muted">
        <div className="site-shell location-guide-grid">
          <TransportationGuide />
          <ParkingGuide />
        </div>
      </section>

      <section className="practice-final-cta">
        <div className="site-shell cta-grid">
          <div>
            <span className="section-kicker invert">Consultation</span>
            <h2>방문상담을 원하시나요?</h2>
            <p>방문 전 상담 일정을 확인해주시면 보다 원활한 상담이 가능합니다.</p>
          </div>
          <div className="cta-actions">
            <a className="btn btn-accent" href={siteConfig.phoneHref}>
              전화상담
            </a>
            <Link className="btn btn-light" href={siteConfig.links.consultation}>
              온라인 상담신청
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
