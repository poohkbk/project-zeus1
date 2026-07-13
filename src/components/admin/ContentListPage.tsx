"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { cmsCategoryLabels, cmsTypeLabels } from "@/data/cms-seed";
import { loadCmsItems, loadCmsItemsFromServer, saveCmsItems, saveCmsItemToServer } from "@/lib/admin/cms-store";
import type { CmsContentItem, CmsContentType } from "@/types/cms";
import { statusLabel, typePath } from "./AdminDashboard";

export function ContentListPage({ type }: { type: CmsContentType }) {
  const [items, setItems] = useState<CmsContentItem[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [syncMessage, setSyncMessage] = useState("");

  useEffect(() => {
    const localItems = loadCmsItems();
    setItems(localItems);

    loadCmsItemsFromServer()
      .then((serverItems) => {
        if (serverItems.length === 0) return;
        setItems(serverItems);
        saveCmsItems(serverItems);
        setSyncMessage("Supabase 저장소와 연결되었습니다.");
      })
      .catch(() => setSyncMessage("브라우저 임시저장 목록을 표시하고 있습니다."));
  }, []);

  const visibleItems = useMemo(
    () =>
      items.filter((item) => {
        const matchesType = item.type === type;
        const matchesQuery = `${item.title} ${item.summary} ${item.tags.join(" ")}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesStatus = status === "all" || item.status === status;
        const matchesCategory = category === "all" || item.category === category;
        return matchesType && matchesQuery && matchesStatus && matchesCategory;
      }),
    [items, type, query, status, category],
  );

  function updateStatus(item: CmsContentItem, nextStatus: CmsContentItem["status"]) {
    const updatedItem = { ...item, status: nextStatus, updatedAt: new Date().toISOString() };
    const nextItems = items.map((entry) =>
      entry.id === item.id ? updatedItem : entry,
    );
    setItems(nextItems);
    saveCmsItems(nextItems);
    saveCmsItemToServer(updatedItem)
      .then(() => setSyncMessage("변경사항이 Supabase에 저장되었습니다."))
      .catch(() => setSyncMessage("브라우저에는 저장됐지만 Supabase 저장은 실패했습니다."));
  }

  function duplicateItem(item: CmsContentItem) {
    const copy = {
      ...item,
      id: `${item.type}-${Date.now()}`,
      title: `${item.title} 복사본`,
      status: "draft" as const,
      updatedAt: new Date().toISOString(),
    };
    const nextItems = [copy, ...items];
    setItems(nextItems);
    saveCmsItems(nextItems);
    saveCmsItemToServer(copy)
      .then(() => setSyncMessage("복제한 글이 Supabase에 저장되었습니다."))
      .catch(() => setSyncMessage("복제한 글은 브라우저에만 임시저장되었습니다."));
  }

  return (
    <div className="admin-screen">
      <header className="admin-page-title">
        <div>
          <span>콘텐츠 관리</span>
          <h1>{cmsTypeLabels[type]}</h1>
          <p>검색하고, 공개 상태를 바꾸고, 대표 노출 여부를 빠르게 확인합니다.</p>
        </div>
        <Link className="admin-primary-link" href={`/admin/${typePath(type)}/new`}>
          새 글 작성
        </Link>
      </header>

      {type === "case" ? <FeaturedManager items={items} setItems={setItems} /> : null}

      <section className="admin-panel">
        {syncMessage ? <p className="admin-sync-message">{syncMessage}</p> : null}
        <div className="admin-toolbar">
          <label>
            검색
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="제목, 설명, 태그로 찾기"
            />
          </label>
          <label>
            공개 상태
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">전체</option>
              <option value="draft">임시저장</option>
              <option value="published">공개</option>
              <option value="private">비공개</option>
              <option value="scheduled">예약 공개</option>
              <option value="trash">휴지통</option>
            </select>
          </label>
          <label>
            분야
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="all">전체</option>
              {Object.entries(cmsCategoryLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="admin-list">
          {visibleItems.length > 0 ? (
            visibleItems.map((item) => (
              <article key={item.id} className="admin-list-card">
                <div>
                  <span>
                    {cmsCategoryLabels[item.category]} · {item.visibility.isFeatured ? "대표 노출" : "일반"}
                  </span>
                  <h3>{item.title || "제목 없는 글"}</h3>
                  <p>{item.summary || "목록에 보일 짧은 설명을 입력해 주세요."}</p>
                  <small>마지막 수정: {new Date(item.updatedAt).toLocaleString("ko-KR")}</small>
                </div>
                <div className="admin-card-actions">
                  <strong data-status={item.status}>{statusLabel(item.status)}</strong>
                  <Link href={`/admin/${typePath(type)}/${item.id}/edit`}>수정</Link>
                  <button type="button" onClick={() => updateStatus(item, item.status === "published" ? "private" : "published")}>
                    {item.status === "published" ? "비공개로" : "공개로"}
                  </button>
                  <button type="button" onClick={() => duplicateItem(item)}>복제</button>
                  <button type="button" onClick={() => updateStatus(item, "trash")}>휴지통</button>
                </div>
              </article>
            ))
          ) : (
            <div className="admin-empty">
              <h3>조건에 맞는 글이 없습니다.</h3>
              <Link href={`/admin/${typePath(type)}/new`}>새 글 작성하기</Link>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function FeaturedManager({
  items,
  setItems,
}: {
  items: CmsContentItem[];
  setItems: (items: CmsContentItem[]) => void;
}) {
  const featured = items
    .filter((item) => item.type === "case" && item.visibility.isFeatured && item.status !== "trash")
    .sort((a, b) => (a.visibility.featuredOrder ?? 99) - (b.visibility.featuredOrder ?? 99))
    .slice(0, 6);

  function move(item: CmsContentItem, direction: -1 | 1) {
    const ordered = featured.slice();
    const index = ordered.findIndex((entry) => entry.id === item.id);
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= ordered.length) return;
    const [picked] = ordered.splice(index, 1);
    ordered.splice(nextIndex, 0, picked);
    const orderMap = new Map(ordered.map((entry, order) => [entry.id, order + 1]));
    const nextItems = items.map((entry) =>
      orderMap.has(entry.id)
        ? { ...entry, visibility: { ...entry.visibility, featuredOrder: orderMap.get(entry.id) } }
        : entry,
    );
    setItems(nextItems);
    saveCmsItems(nextItems);
    void Promise.all(
      nextItems.filter((entry) => orderMap.has(entry.id)).map((entry) => saveCmsItemToServer(entry)),
    );
  }

  return (
    <section className="admin-panel admin-featured-manager">
      <div className="admin-panel-title">
        <h2>메인 대표 승소사례</h2>
        <p>현재 노출 중인 사례를 1~6번 순서로 관리합니다.</p>
      </div>
      <div className="admin-featured-row">
        {featured.map((item) => (
          <article key={item.id}>
            <span>{item.visibility.featuredOrder ?? "-"}</span>
            <strong>{item.title}</strong>
            <div>
              <button type="button" onClick={() => move(item, -1)}>위로</button>
              <button type="button" onClick={() => move(item, 1)}>아래로</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
