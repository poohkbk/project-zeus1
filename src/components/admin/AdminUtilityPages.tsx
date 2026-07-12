"use client";

import { useEffect, useState } from "react";
import { cmsCategoryLabels } from "@/data/cms-seed";
import { loadCmsAdmins, loadCmsItems, saveCmsAdmins, saveCmsItems } from "@/lib/admin/cms-store";
import type { CmsAdminUser, CmsContentItem } from "@/types/cms";
import { statusLabel } from "./AdminDashboard";

export function TaxonomyPage() {
  return (
    <div className="admin-screen">
      <header className="admin-page-title">
        <div>
          <span>분류 관리</span>
          <h1>분야·태그</h1>
          <p>관리자가 자주 쓰는 분야와 태그를 한눈에 확인합니다.</p>
        </div>
      </header>
      <section className="admin-panel admin-chip-panel">
        <h2>사건 분야</h2>
        <div>
          {Object.values(cmsCategoryLabels).map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <h2>추천 태그</h2>
        <div>
          {["대여금", "계약", "손해배상", "경찰조사", "재산분할", "상속재산분할", "유류분", "상간소송"].map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </section>
    </div>
  );
}

export function MediaPage() {
  return (
    <div className="admin-screen">
      <header className="admin-page-title">
        <div>
          <span>이미지 관리</span>
          <h1>콘텐츠 이미지</h1>
          <p>JPG, PNG, WebP 이미지를 5MB 이하로 올리는 흐름입니다.</p>
        </div>
      </header>
      <section className="admin-panel admin-upload-box">
        <h2>이미지 업로드</h2>
        <p>현재는 Supabase Storage 연결 전 미리보기입니다. 운영 연결 후 파일 선택, 진행률, 교체, 삭제가 활성화됩니다.</p>
        <label>
          파일 선택
          <input type="file" accept="image/jpeg,image/png,image/webp" />
        </label>
        <small>이미지가 크면 1200x800px 안팎으로 줄이면 페이지가 더 빠르게 표시됩니다.</small>
      </section>
    </div>
  );
}

export function TrashPage() {
  const [items, setItems] = useState<CmsContentItem[]>([]);

  useEffect(() => setItems(loadCmsItems()), []);

  function restore(item: CmsContentItem) {
    const nextItems = items.map((entry) =>
      entry.id === item.id ? { ...entry, status: "draft" as const } : entry,
    );
    setItems(nextItems);
    saveCmsItems(nextItems);
  }

  const trash = items.filter((item) => item.status === "trash");

  return (
    <div className="admin-screen">
      <header className="admin-page-title">
        <div>
          <span>삭제 관리</span>
          <h1>휴지통</h1>
          <p>삭제된 글은 먼저 휴지통으로 이동합니다. 영구 삭제는 최고관리자만 가능합니다.</p>
        </div>
      </header>
      <section className="admin-panel admin-list">
        {trash.length ? (
          trash.map((item) => (
            <article key={item.id} className="admin-list-card">
              <div>
                <span>{statusLabel(item.status)}</span>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
              </div>
              <div className="admin-card-actions">
                <button type="button" onClick={() => restore(item)}>임시저장으로 복원</button>
                <button type="button" disabled>영구 삭제</button>
              </div>
            </article>
          ))
        ) : (
          <div className="admin-empty"><h3>휴지통이 비어 있습니다.</h3></div>
        )}
      </section>
    </div>
  );
}

export function AdminUsersPage() {
  const [admins, setAdmins] = useState<CmsAdminUser[]>([]);

  useEffect(() => setAdmins(loadCmsAdmins()), []);

  function invite() {
    if (admins.filter((admin) => admin.active).length >= 4) return;
    const nextAdmins = [
      ...admins,
      {
        id: `admin-${Date.now()}`,
        name: "초대 대기",
        email: "new-admin@example.com",
        role: "admin" as const,
        active: true,
        lastLoginAt: "-",
        invitedAt: new Date().toISOString(),
      },
    ].slice(0, 4);
    setAdmins(nextAdmins);
    saveCmsAdmins(nextAdmins);
  }

  return (
    <div className="admin-screen">
      <header className="admin-page-title">
        <div>
          <span>관리자 설정</span>
          <h1>관리자 {admins.filter((admin) => admin.active).length} / 4</h1>
          <p>최고관리자는 비활성화하거나 삭제할 수 없습니다.</p>
        </div>
        <button className="admin-primary-link" type="button" onClick={invite}>관리자 초대</button>
      </header>
      <section className="admin-panel admin-admin-grid">
        {admins.map((admin) => (
          <article key={admin.id}>
            <h2>{admin.name}</h2>
            <p>{admin.email}</p>
            <span>{admin.role === "super_admin" ? "최고관리자" : "일반관리자"}</span>
            <small>마지막 로그인: {admin.lastLoginAt}</small>
            <button type="button" disabled={admin.role === "super_admin"}>비활성화</button>
          </article>
        ))}
      </section>
    </div>
  );
}

export function SiteSettingsPage() {
  return (
    <div className="admin-screen">
      <header className="admin-page-title">
        <div>
          <span>사이트 설정</span>
          <h1>기본 정보</h1>
          <p>전화번호, 사이트 주소, AI 연결 상태를 확인합니다.</p>
        </div>
      </header>
      <section className="admin-panel admin-settings-grid">
        <label>공개 사이트 주소<input value="https://www.jwlaw.co.kr" readOnly /></label>
        <label>최고관리자 이메일<input value="tglaw-kbk@nate.com" readOnly /></label>
        <label>AI 작성 도우미<select value="off" disabled><option value="off">연결되지 않음</option></select></label>
        <label>관리자 최대 인원<input value="4명" readOnly /></label>
      </section>
    </div>
  );
}

export function ProfilePage() {
  return (
    <div className="admin-screen">
      <header className="admin-page-title">
        <div>
          <span>내 계정</span>
          <h1>최고관리자</h1>
          <p>운영 연결 후 이름, 비밀번호, 2단계 인증을 관리합니다.</p>
        </div>
      </header>
      <section className="admin-panel admin-settings-grid">
        <label>이름<input value="최고관리자" readOnly /></label>
        <label>이메일<input value="tglaw-kbk@nate.com" readOnly /></label>
      </section>
    </div>
  );
}
