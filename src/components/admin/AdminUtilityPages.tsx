"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { cmsCategoryLabels } from "@/data/cms-seed";
import {
  deleteCmsItemFromServer,
  deleteCmsItemsFromServer,
  loadCmsAdmins,
  loadCmsItems,
  loadCmsItemsFromServer,
  loadCmsTaxonomy,
  addCmsTagToServer,
  loadCmsTaxonomyFromServer,
  removeCmsTagFromServer,
  saveCmsAdmins,
  saveCmsItems,
  saveCmsItemToServer,
  saveCmsTaxonomy,
} from "@/lib/admin/cms-store";
import { sortKoreanTags } from "@/lib/tag-utils";
import type { CmsAdminUser, CmsContentItem } from "@/types/cms";
import { statusLabel } from "./AdminDashboard";

export function TaxonomyPage() {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const localTags = loadCmsTaxonomy().tags;
    setTags(localTags);

    loadCmsTaxonomyFromServer()
      .then((taxonomy) => setTags(taxonomy.tags))
      .catch(() => {
        setTags(localTags);
        setMessage("Supabase 추천태그를 불러오지 못해 임시 저장 목록을 표시합니다.");
      });
  }, []);

  function saveTags(nextTags: string[], nextMessage: string) {
    const normalized = sortKoreanTags(nextTags);
    setTags(normalized);
    saveCmsTaxonomy({ tags: normalized });
    setMessage(nextMessage);
  }

  async function addTag(event: FormEvent<HTMLFormElement>) {
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

    const optimisticTags = sortKoreanTags([...tags, value]);
    saveTags(optimisticTags, `"${value}" 태그를 저장하는 중입니다.`);

    try {
      const taxonomy = await addCmsTagToServer(value);
      saveTags(taxonomy.tags, `"${value}" 태그를 추가했습니다.`);
      setNewTag("");
    } catch {
      saveTags(optimisticTags, `"${value}" 태그를 임시 저장했습니다. Supabase 연결을 확인해 주세요.`);
      setNewTag("");
    }
  }

  async function removeTag(tag: string) {
    const optimisticTags = sortKoreanTags(tags.filter((item) => item !== tag));
    saveTags(optimisticTags, `"${tag}" 태그를 삭제하는 중입니다.`);

    try {
      const taxonomy = await removeCmsTagFromServer(tag);
      saveTags(taxonomy.tags, `"${tag}" 태그를 삭제했습니다.`);
    } catch {
      saveTags(optimisticTags, `"${tag}" 태그를 임시 삭제했습니다. Supabase 연결을 확인해 주세요.`);
    }
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
  const [message, setMessage] = useState("");
  const [pendingId, setPendingId] = useState<string | undefined>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkPending, setBulkPending] = useState(false);

  useEffect(() => {
    const localItems = loadCmsItems();
    setItems(localItems);

    loadCmsItemsFromServer()
      .then((serverItems) => {
        if (serverItems.length === 0) return;
        setItems(serverItems);
        saveCmsItems(serverItems);
      })
      .catch(() => setMessage("브라우저 임시저장 목록을 표시하고 있습니다."));
  }, []);

  async function restore(item: CmsContentItem) {
    setPendingId(item.id);
    const nextItems = items.map((entry) =>
      entry.id === item.id ? { ...entry, status: "draft" as const } : entry,
    );
    setItems(nextItems);
    saveCmsItems(nextItems);

    const restoredItem = { ...item, status: "draft" as const, updatedAt: new Date().toISOString() };
    try {
      await saveCmsItemToServer(restoredItem);
      setSelectedIds((current) => current.filter((id) => id !== item.id));
      setMessage(`"${item.title || "제목 없는 글"}" 글을 임시저장으로 복원했습니다.`);
    } catch {
      setMessage("브라우저에는 복원됐지만 Supabase 저장은 실패했습니다.");
    } finally {
      setPendingId(undefined);
    }
  }

  async function permanentlyDelete(item: CmsContentItem) {
    const title = item.title || "제목 없는 글";
    const confirmed = window.confirm(`"${title}" 글을 영구 삭제할까요? 이 작업은 되돌릴 수 없습니다.`);
    if (!confirmed) return;

    setPendingId(item.id);
    const previousItems = items;
    const nextItems = items.filter((entry) => entry.id !== item.id);
    setItems(nextItems);
    saveCmsItems(nextItems);

    try {
      await deleteCmsItemFromServer(item);
      setSelectedIds((current) => current.filter((id) => id !== item.id));
      setMessage(`"${title}" 글을 영구 삭제했습니다.`);
    } catch (error) {
      setItems(previousItems);
      saveCmsItems(previousItems);
      setMessage(error instanceof Error ? error.message : "영구 삭제에 실패했습니다.");
    } finally {
      setPendingId(undefined);
    }
  }

  const trash = items.filter((item) => item.status === "trash");
  const trashIds = useMemo(() => trash.map((item) => item.id), [trash]);
  const selectedTrashItems = trash.filter((item) => selectedIds.includes(item.id));
  const allTrashSelected = trash.length > 0 && trash.every((item) => selectedIds.includes(item.id));

  function toggleSelection(itemId: string) {
    setSelectedIds((current) =>
      current.includes(itemId) ? current.filter((id) => id !== itemId) : [...current, itemId],
    );
  }

  function toggleAllTrash() {
    setSelectedIds((current) => {
      if (allTrashSelected) return current.filter((id) => !trashIds.includes(id));
      return Array.from(new Set([...current, ...trashIds]));
    });
  }

  async function permanentlyDeleteMany(targetItems: CmsContentItem[], modeLabel: string) {
    if (targetItems.length === 0) {
      setMessage("영구 삭제할 글을 선택해 주세요.");
      return;
    }

    const confirmed = window.confirm(
      `${modeLabel} ${targetItems.length.toLocaleString("ko-KR")}개 글을 영구 삭제할까요? 이 작업은 되돌릴 수 없습니다.`,
    );
    if (!confirmed) return;

    setBulkPending(true);
    const previousItems = items;
    const targetIds = new Set(targetItems.map((item) => item.id));
    const nextItems = items.filter((item) => !targetIds.has(item.id));
    setItems(nextItems);
    saveCmsItems(nextItems);

    try {
      await deleteCmsItemsFromServer(targetItems);
      setSelectedIds((current) => current.filter((id) => !targetIds.has(id)));
      setMessage(`${targetItems.length.toLocaleString("ko-KR")}개 글을 영구 삭제했습니다.`);
    } catch (error) {
      setItems(previousItems);
      saveCmsItems(previousItems);
      setMessage(error instanceof Error ? error.message : "선택한 글을 영구 삭제하지 못했습니다.");
    } finally {
      setBulkPending(false);
    }
  }

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
        {message ? <p className="admin-sync-message">{message}</p> : null}
        {trash.length ? (
          <div className="admin-trash-toolbar">
            <label>
              <input type="checkbox" checked={allTrashSelected} onChange={toggleAllTrash} disabled={bulkPending} />
              전체 선택
            </label>
            <span>
              선택 {selectedTrashItems.length.toLocaleString("ko-KR")}개 / 휴지통 {trash.length.toLocaleString("ko-KR")}개
            </span>
            <button
              type="button"
              className="danger"
              onClick={() => permanentlyDeleteMany(selectedTrashItems, "선택한")}
              disabled={bulkPending || selectedTrashItems.length === 0}
            >
              선택 영구삭제
            </button>
            <button
              type="button"
              className="danger"
              onClick={() => permanentlyDeleteMany(trash, "휴지통 전체")}
              disabled={bulkPending || trash.length === 0}
            >
              전체 영구삭제
            </button>
          </div>
        ) : null}
        {trash.length ? (
          trash.map((item) => (
            <article key={item.id} className="admin-list-card">
              <div>
                <label className="admin-trash-select">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(item.id)}
                    onChange={() => toggleSelection(item.id)}
                    disabled={bulkPending || pendingId === item.id}
                  />
                  선택
                </label>
                <span>{statusLabel(item.status)}</span>
                <h3>{item.title}</h3>
                <p>{item.summary}</p>
              </div>
              <div className="admin-card-actions">
                <button type="button" onClick={() => restore(item)} disabled={bulkPending || pendingId === item.id}>
                  {pendingId === item.id ? "처리 중..." : "임시저장으로 복원"}
                </button>
                <button
                  type="button"
                  className="danger"
                  onClick={() => permanentlyDelete(item)}
                  disabled={bulkPending || pendingId === item.id}
                >
                  {pendingId === item.id ? "삭제 중..." : "영구 삭제"}
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
  const [message, setMessage] = useState("");

  useEffect(() => {
    const localAdmins = loadCmsAdmins();
    setAdmins(localAdmins);

    fetch("/api/admin/users", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("failed");
        return response.json() as Promise<{ admins?: CmsAdminUser[] }>;
      })
      .then((data) => {
        if (!data.admins?.length) return;
        setAdmins(data.admins);
        saveCmsAdmins(data.admins);
        setMessage("Supabase 관리자 목록과 연결되었습니다.");
      })
      .catch(() => setMessage("브라우저 임시 관리자 목록을 표시하고 있습니다."));
  }, []);

  function persistAdmins(nextAdmins: CmsAdminUser[], nextMessage: string) {
    setAdmins(nextAdmins);
    saveCmsAdmins(nextAdmins);
    setMessage(nextMessage);
  }

  function validateEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  async function saveAdmin(admin: CmsAdminUser) {
    if (admin.role === "super_admin") return;
    if (!admin.name.trim() || !validateEmail(admin.email)) {
      setMessage("관리자 이름과 이메일을 확인해 주세요.");
      return;
    }

    persistAdmins(
      admins.map((entry) => (entry.id === admin.id ? { ...admin, email: admin.email.trim().toLowerCase() } : entry)),
      "관리자 정보를 저장했습니다.",
    );

    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: admin.id, name: admin.name, email: admin.email }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("failed");
        setMessage("관리자 정보가 Supabase에 저장되었습니다.");
      })
      .catch(() => setMessage("브라우저에는 저장됐지만 Supabase 저장은 실패했습니다."));
  }

  async function deleteAdmin(admin: CmsAdminUser) {
    if (admin.role === "super_admin") return;
    const nextAdmins = admins.filter((entry) => entry.id !== admin.id);
    persistAdmins(nextAdmins, "관리자를 삭제했습니다.");

    await fetch(`/api/admin/users?id=${encodeURIComponent(admin.id)}`, { method: "DELETE" })
      .then((response) => {
        if (!response.ok) throw new Error("failed");
        setMessage("관리자가 Supabase에서 삭제되었습니다.");
      })
      .catch(() => setMessage("브라우저에서는 삭제됐지만 Supabase 삭제는 실패했습니다."));
  }

  function updateAdmin(id: string, updates: Partial<Pick<CmsAdminUser, "name" | "email">>) {
    const nextAdmins = admins.map((admin) => (admin.id === id ? { ...admin, ...updates } : admin));
    persistAdmins(nextAdmins, "수정 중입니다. 저장 버튼을 눌러 반영해 주세요.");
  }

  async function invite() {
    if (admins.filter((admin) => admin.active).length >= 4) return;
    const draftAdmin: CmsAdminUser = {
      id: `admin-${Date.now()}`,
      name: "초대 대기",
      email: `admin-${Date.now()}@example.com`,
      role: "admin",
      active: true,
      lastLoginAt: "-",
      invitedAt: new Date().toISOString(),
    };
    const nextAdmins = [...admins, draftAdmin].slice(0, 4);
    persistAdmins(nextAdmins, "관리자를 추가했습니다. 이메일을 실제 주소로 바꾼 뒤 저장해 주세요.");

    await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: draftAdmin.name, email: draftAdmin.email }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("failed");
        return response.json() as Promise<{ admin?: CmsAdminUser }>;
      })
      .then((data) => {
        if (!data.admin) return;
        const syncedAdmins = nextAdmins.map((admin) => (admin.id === draftAdmin.id ? data.admin! : admin));
        persistAdmins(syncedAdmins, "관리자를 Supabase에 추가했습니다. 이메일을 수정한 뒤 저장해 주세요.");
      })
      .catch(() => setMessage("브라우저에는 추가됐지만 Supabase 추가는 실패했습니다."));
  }

  return (
    <div className="admin-screen">
      <header className="admin-page-title">
        <div>
          <span>관리자 설정</span>
          <h1>관리자 {admins.filter((admin) => admin.active).length} / 4</h1>
          <p>최고관리자는 보호되며, 일반관리자의 이메일 수정과 삭제는 최고관리자만 처리할 수 있습니다.</p>
        </div>
        <button className="admin-primary-link" type="button" onClick={invite}>
          관리자 초대
        </button>
      </header>
      {message ? (
        <p className="admin-taxonomy-message" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}
      <section className="admin-panel admin-admin-grid">
        {admins.map((admin) => (
          <article key={admin.id}>
            <label>
              이름
              <input
                value={admin.name}
                readOnly={admin.role === "super_admin"}
                onChange={(event) => updateAdmin(admin.id, { name: event.target.value })}
              />
            </label>
            <label>
              이메일
              <input
                type="email"
                value={admin.email}
                readOnly={admin.role === "super_admin"}
                onChange={(event) => updateAdmin(admin.id, { email: event.target.value })}
              />
            </label>
            <span>{admin.role === "super_admin" ? "최고관리자" : "일반관리자"}</span>
            <small>마지막 로그인: {admin.lastLoginAt}</small>
            {admin.role === "super_admin" ? (
              <button type="button" disabled>
                보호된 계정
              </button>
            ) : (
              <div className="admin-user-actions">
                <button type="button" onClick={() => saveAdmin(admin)}>
                  저장
                </button>
                <button type="button" className="danger" onClick={() => deleteAdmin(admin)}>
                  삭제
                </button>
              </div>
            )}
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
