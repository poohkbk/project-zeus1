import Link from "next/link";
import { siteConfig } from "@/config/site";
import { SimpleIcon } from "@/components/icons/SimpleIcon";

export function ConsultationHero() {
  return (
    <section className="consultation-hero" aria-labelledby="consultation-title">
      <div className="site-shell consultation-hero-grid">
        <div>
          <nav className="page-breadcrumb" aria-label="현재 위치">
            <Link href="/">홈</Link>
            <span aria-hidden="true">/</span>
            <span>상담신청</span>
          </nav>
          <p className="eyebrow">CONSULTATION</p>
          <h1 id="consultation-title">상담신청</h1>
          <p>
            상담 내용을 남겨주시면 확인 후 연락드리겠습니다. 긴급한 사건은
            대표전화로 바로 문의해 주세요.
          </p>
          <div className="consultation-hero-actions">
            <a className="btn btn-accent" href={siteConfig.phoneHref}>
              <SimpleIcon name="phone" />
              지금 전화하기
            </a>
            <span>{siteConfig.phone}</span>
          </div>
        </div>
        <aside aria-label="상담 안내">
          <strong>빠른 확인을 위해</strong>
          <ul>
            <li>사건 분야를 먼저 선택해 주세요.</li>
            <li>상대방의 주민등록번호 등 민감정보는 입력하지 마세요.</li>
            <li>제출 후 접수번호만 화면에 표시됩니다.</li>
          </ul>
        </aside>
      </div>
    </section>
  );
}
