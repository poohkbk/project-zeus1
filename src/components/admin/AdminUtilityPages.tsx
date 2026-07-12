"use client";

import { FormEvent, useEffect, useState } from "react";
import { cmsCategoryLabels } from "@/data/cms-seed";
import {
  loadCmsAdmins,
  loadCmsItems,
  loadCmsTaxonomy,
  saveCmsAdmins,
  saveCmsItems,
  saveCmsTaxonomy,
} from "@/lib/admin/cms-store";
import type { CmsAdminUser, CmsContentItem } from "@/types/cms";
import { statusLabel } from "./AdminDashboard";

export function TaxonomyPage() {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setTags(loadCmsTaxonomy().tags);
  }, []);

  function saveTags(nextTags: string[], nextMessage: string) {
    const normalized = Array.from(new Set(nextTags.map((tag) => tag.trim()).filter(Boolean)));
    setTags(normalized);
    saveCmsTaxonomy({ tags: normalized });
    setMessage(nextMessage);
  }

  function addTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = newTag.trim();
    if (!value) {
      setMessage("추가할 태그를 입력해 주세요.");
      return;
    }
    if (tags.includes(value)) {
      setMessage("이미 등록된 태그입니다.");
      return;
    }
    saveTags([...tags, value], `"${value}" 태그를 추가했습니다.`);
    setNewTag("");
  }

  function removeTag(tag: string) {
    saveTags(tags.filter((item) => item !== tag), `"${tag}" 태그를 삭제했습니다.`);
  }

  return (
    <div className="admin-screen">
      <header className="admin-page-title">
        <div>
          <span>분류 관리</span>
          <h1>분야·태그</h1>
          <p>사건 분야를 확인하고, 자주 쓰는 추천태그를 직접 추가하거나 삭제합니다.</p>
        </div>
      </header>

      <section className="admin-panel admin-chip-panel">
        <h2>사건 분야</h2>
        <p>새 글 작성 화면의 사건 분야 선택 목록에 표시됩니다.</p>
        <div>
          {Object.values(cmsCategoryLabels).map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </section>

      <section className="admin-panel admin-chip-panel">
        <div className="admin-panel-title">
          <h2>추천태그</h2>
          <p>필요한 태그가 생기면 아래에서 바로 추가하세요.</p>
        </div>

        <form className="admin-taxonomy-add" onSubmit={addTag}>
          <label>
            새 추천태그
            <input
              value={newTag}
              onChange={(event) => setNewTag(event.target.value)}
              placeholder="예: 행정심판, 영업정지, 학교폭력"
            />
          </label>
          <button type="submit">태그 추가</button>
        </form>

        {message ? (
          <p className="admin-taxonomy-message" role="status" aria-live="polite">
            {message}
          </p>
        ) : null}

        <div className="admin-editable-tags">
          {tags.map((tag) => (
            <span key={tag}>
              {tag}
              <button type="button" onClick={() => removeTag(tag)} aria-label={`${tag} 태그 삭제`}>
                삭제
              </button>
            </span>
          ))}
        </div>
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
                <button type="button" onClick={() => restore(item)}>
                  임시저장으로 복원
                </button>
                <button type="button" disabled>
                  영구 삭제
                </button>
              </div>
            </article>
          ))
        ) : (
          <div className="admin-empty">
            <h3>휴지통이 비어 있습니다.</h3>
          </div>
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
        <button className="admin-primary-link" type="button" onClick={invite}>
          관리자 초대
        </button>
      </header>
      <section className="admin-panel admin-admin-grid">
        {admins.map((admin) => (
          <article key={admin.id}>
            <h2>{admin.name}</h2>
            <p>{admin.email}</p>
            <span>{admin.role === "super_admin" ? "최고관리자" : "일반관리자"}</span>
            <small>마지막 로그인: {admin.lastLoginAt}</small>
            <button type="button" disabled={admin.role === "super_admin"}>
              비활성화
            </button>
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
        <label>
          공개 사이트 주소
          <input value="https://www.jwlaw.co.kr" readOnly />
        </label>
        <label>
          최고관리자 이메일
          <input value="tglaw-kbk@nate.com" readOnly />
        </label>
        <label>
          AI 작성 도우미
          <select value="off" disabled>
            <option value="off">연결되지 않음</option>
          </select>
        </label>
        <label>
          관리자 최대 인원
          <input value="4명" readOnly />
        </label>
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
        <label>
          이름
          <input value="최고관리자" readOnly />
        </label>
        <label>
          이메일
          <input value="tglaw-kbk@nate.com" readOnly />
        </label>
      </section>
    </div>
  );
}
