"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cmsTypeLabels } from "@/data/cms-seed";
import { loadCmsAdmins, loadCmsItems } from "@/lib/admin/cms-store";
import type { CmsAdminUser, CmsContentItem, CmsContentType } from "@/types/cms";

const quickLinks: Array<{ href: string; label: string; type: CmsContentType }> = [
  { href: "/admin/cases/new", label: "+ 승소사례 작성", type: "case" },
  { href: "/admin/guides/new", label: "+ 법률가이드 작성", type: "guide" },
  { href: "/admin/faqs/new", label: "+ FAQ 작성", type: "faq" },
];

export function AdminDashboard() {
  const [items, setItems] = useState<CmsContentItem[]>([]);
  const [admins, setAdmins] = useState<CmsAdminUser[]>([]);

  useEffect(() => {
    setItems(loadCmsItems());
    setAdmins(loadCmsAdmins());
  }, []);

  const stats = useMemo(
    () => ({
      case: items.filter((item) => item.type === "case" && item.status === "published").length,
      guide: items.filter((item) => item.type === "guide" && item.status === "published").length,
      faq: items.filter((item) => item.type === "faq" && item.status === "published").length,
      draft: items.filter((item) => item.status === "draft").length,
      featured: items.filter((item) => item.visibility.isFeatured).length,
      admins: admins.filter((admin) => admin.active).length,
    }),
    [items, admins],
  );

  const recent = items
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 5);

  return (
    <div className="admin-screen">
      <header className="admin-hero">
        <span>관리자 첫 화면</span>
        <h1>안녕하세요. 오늘 어떤 콘텐츠를 작성하시겠어요?</h1>
        <div className="admin-quick-actions">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
              <small>{cmsTypeLabels[link.type]}를 바로 작성합니다</small>
            </Link>
          ))}
        </div>
      </header>

      <section className="admin-stat-grid" aria-label="콘텐츠 현황">
        <article>
          <strong>{stats.case}</strong>
          <span>공개 중인 승소사례</span>
        </article>
        <article>
          <strong>{stats.guide}</strong>
          <span>공개 중인 법률가이드</span>
        </article>
        <article>
          <strong>{stats.faq}</strong>
          <span>공개 중인 FAQ</span>
        </article>
        <article>
          <strong>{stats.draft}</strong>
          <span>임시저장 글</span>
        </article>
        <article>
          <strong>{stats.featured}</strong>
          <span>대표 노출 콘텐츠</span>
        </article>
        <article>
          <strong>{stats.admins} / 4</strong>
          <span>활성 관리자</span>
        </article>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-title">
          <h2>최근 작업</h2>
          <p>이어서 수정하거나 미리보기로 확인할 수 있습니다.</p>
        </div>
        <div className="admin-list">
          {recent.length > 0 ? (
            recent.map((item) => (
              <article key={item.id} className="admin-list-card">
                <div>
                  <span>{cmsTypeLabels[item.type]}</span>
                  <h3>{item.title || "제목 없는 글"}</h3>
                  <p>{item.summary || "목록에 보일 짧은 설명을 입력해 주세요."}</p>
                </div>
                <div className="admin-card-actions">
                  <strong data-status={item.status}>{statusLabel(item.status)}</strong>
                  <Link href={`/admin/${typePath(item.type)}/${item.id}/edit`}>수정</Link>
                  <Link href="/admin/preview">미리보기</Link>
                </div>
              </article>
            ))
          ) : (
            <div className="admin-empty">
              <h3>아직 작성된 글이 없습니다.</h3>
              <Link href="/admin/cases/new">첫 승소사례 작성하기</Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export function typePath(type: CmsContentType) {
  if (type === "case") return "cases";
  if (type === "guide") return "guides";
  return "faqs";
}

export function statusLabel(status: CmsContentItem["status"]) {
  return {
    draft: "임시저장",
    published: "공개",
    private: "비공개",
    scheduled: "예약 공개",
    trash: "휴지통",
  }[status];
}
