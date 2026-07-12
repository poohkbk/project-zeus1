"use client";

import Link from "next/link";
import { siteConfig } from "@/config/site";

export default function AiGuideError() {
  return (
    <main className="ai-guide-page">
      <section className="site-shell ai-guide-error">
        <span className="section-kicker">Fallback</span>
        <h1>현재 AI 법률안내 연결이 원활하지 않습니다.</h1>
        <p>기본 안내와 상담신청은 계속 이용할 수 있습니다. 긴급한 사건은 대표전화로 문의해 주세요.</p>
        <div className="ai-guide-actions">
          <a className="btn btn-primary" href={siteConfig.phoneHref}>
            전화상담
          </a>
          <Link className="btn btn-secondary" href="/consultation">
            온라인 상담신청
          </Link>
        </div>
      </section>
    </main>
  );
}
