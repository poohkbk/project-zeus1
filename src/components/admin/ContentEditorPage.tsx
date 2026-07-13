"use client";

import Link from "next/link";
import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { cmsCategoryLabels, cmsTypeLabels } from "@/data/cms-seed";
import { createLocalAiSuggestion } from "@/lib/admin/ai/draft-service";
import {
  createEmptyCmsItem,
  loadCmsItemsFromServer,
  loadCmsItems,
  normalizeTags,
  saveCmsItemToServer,
  saveCmsItems,
} from "@/lib/admin/cms-store";
import type { CmsContentItem, CmsContentType, CmsStatus } from "@/types/cms";
import { typePath } from "./AdminDashboard";

const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const maxImageSize = 5 * 1024 * 1024;

export function ContentEditorPage({ type, id }: { type: CmsContentType; id?: string }) {
  const [items, setItems] = useState<CmsContentItem[]>([]);
  const [item, setItem] = useState<CmsContentItem>(() => createEmptyCmsItem(type));
  const [step, setStep] = useState(1);
  const [saveState, setSaveState] = useState("저장 전");
  const [aiInput, setAiInput] = useState("");
  const [preview, setPreview] = useState<"pc" | "tablet" | "mobile">("pc");
  const [imageStatus, setImageStatus] = useState("");
  const [imageError, setImageError] = useState("");
  const itemsRef = useRef<CmsContentItem[]>([]);

  useEffect(() => {
    const loaded = loadCmsItems();
    itemsRef.current = loaded;
    setItems(loaded);
    const found = id ? loaded.find((entry) => entry.id === id) : undefined;
    setItem(found ?? createEmptyCmsItem(type));

    loadCmsItemsFromServer()
      .then((serverItems) => {
        if (serverItems.length === 0) return;
        itemsRef.current = serverItems;
        setItems(serverItems);
        saveCmsItems(serverItems);
        const serverFound = id ? serverItems.find((entry) => entry.id === id) : undefined;
        if (serverFound) setItem(serverFound);
        else if (!id) setItem(createEmptyCmsItem(type));
        setSaveState("Supabase 연결됨");
      })
      .catch(() => setSaveState("브라우저 임시저장 모드"));
  }, [type, id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!item.title && !item.body && !item.heroImage) return;
      const nextItem = { ...item, updatedAt: new Date().toISOString() };
      const exists = itemsRef.current.some((entry) => entry.id === nextItem.id);
      const nextItems = exists
        ? itemsRef.current.map((entry) => (entry.id === nextItem.id ? nextItem : entry))
        : [nextItem, ...itemsRef.current];
      itemsRef.current = nextItems;
      setItems(nextItems);
      saveCmsItems(nextItems);
      saveCmsItemToServer(nextItem)
        .then(() => setSaveState("Supabase 자동저장됨"))
        .catch(() => setSaveState("브라우저에만 임시저장됨"));
      setSaveState("자동저장됨");
    }, 900);

    return () => window.clearTimeout(timer);
  }, [item]);

  const suggestion = useMemo(
    () => (aiInput ? createLocalAiSuggestion(type, aiInput) : undefined),
    [type, aiInput],
  );

  function persist(message = "저장됨") {
    const nextItem = { ...item, updatedAt: new Date().toISOString() };
    const exists = items.some((entry) => entry.id === nextItem.id);
    const nextItems = exists
      ? items.map((entry) => (entry.id === nextItem.id ? nextItem : entry))
      : [nextItem, ...items];
    itemsRef.current = nextItems;
    setItems(nextItems);
    saveCmsItems(nextItems);
    setSaveState(message);
    saveCmsItemToServer(nextItem)
      .then(() => setSaveState(`${message} · Supabase 반영됨`))
      .catch(() => setSaveState(`${message} · 브라우저에만 임시저장됨`));
  }

  function update<K extends keyof CmsContentItem>(key: K, value: CmsContentItem[K]) {
    setItem((current) => ({ ...current, [key]: value }));
  }

  function setVisibility(key: keyof CmsContentItem["visibility"], checked: boolean) {
    setItem((current) => ({
      ...current,
      visibility: {
        ...current.visibility,
        [key]: checked,
        isFeatured: key === "isFeatured" ? checked : current.visibility.isFeatured,
      },
    }));
  }

  function updateSeo<K extends keyof NonNullable<CmsContentItem["seo"]>>(
    key: K,
    value: NonNullable<CmsContentItem["seo"]>[K],
  ) {
    setItem((current) => ({
      ...current,
      seo: {
        title: current.seo?.title ?? "",
        description: current.seo?.description ?? "",
        canonicalPath: current.seo?.canonicalPath ?? "",
        index: current.seo?.index ?? true,
        openGraphTitle: current.seo?.openGraphTitle,
        openGraphDescription: current.seo?.openGraphDescription,
        [key]: value,
      },
    }));
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setImageError("");
    setImageStatus("");

    if (!file) return;
    if (!acceptedImageTypes.includes(file.type)) {
      setImageError("JPG, PNG, WebP 이미지만 업로드할 수 있습니다. SVG 파일은 사용할 수 없습니다.");
      event.target.value = "";
      return;
    }
    if (file.size > maxImageSize) {
      setImageError("이미지는 5MB 이하로 올려 주세요.");
      event.target.value = "";
      return;
    }

    setImageStatus("이미지를 불러오는 중입니다.");
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setItem((current) => ({
        ...current,
        heroImage: result,
        heroImageAlt: current.heroImageAlt || `${current.title || "콘텐츠"} 대표 이미지`,
      }));
      setImageStatus("이미지가 추가되었습니다. 운영 연결 후에는 Supabase Storage에 저장됩니다.");
    };
    reader.onerror = () => {
      setImageError("이미지를 읽지 못했습니다. 다른 파일로 다시 시도해 주세요.");
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setItem((current) => ({ ...current, heroImage: "", heroImageAlt: "" }));
    setImageStatus("대표 이미지를 제거했습니다.");
    setImageError("");
  }

  function publish(nextStatus: CmsStatus) {
    update("status", nextStatus);
    window.setTimeout(() => persist(nextStatus === "published" ? "공개됨" : "임시저장됨"), 0);
  }

  return (
    <div className="admin-screen">
      <header className="admin-page-title">
        <div>
          <span>{cmsTypeLabels[type]} 작성</span>
          <h1>{item.title || "새 글 작성"}</h1>
          <p>기본 내용, 본문, 노출 위치, 공개 확인 순서로 작성합니다.</p>
        </div>
        <Link className="admin-primary-link" href={`/admin/${typePath(type)}`}>
          목록으로
        </Link>
      </header>

      <div className="admin-editor-layout">
        <section className="admin-editor">
          <ol className="admin-steps" aria-label="작성 단계">
            {["기본 내용", "본문 작성", "표시 설정", "공개 확인"].map((label, index) => (
              <li key={label} data-active={step === index + 1}>
                <button type="button" onClick={() => setStep(index + 1)}>
                  {index + 1}. {label}
                </button>
              </li>
            ))}
          </ol>

          {step === 1 ? (
            <section className="admin-editor-panel">
              <h2>기본 내용</h2>
              <div className="admin-form-grid">
                <label>
                  제목 <span>*</span>
                  <input
                    value={item.title}
                    onChange={(event) => update("title", event.target.value)}
                    placeholder="예: 계약금 반환 승소사례"
                  />
                </label>
                <label>
                  사건 분야 <span>*</span>
                  <select
                    value={item.category}
                    onChange={(event) =>
                      update("category", event.target.value as CmsContentItem["category"])
                    }
                  >
                    {Object.entries(cmsCategoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label>
                목록에 보일 짧은 설명
                <textarea
                  value={item.summary}
                  onChange={(event) => update("summary", event.target.value)}
                  placeholder="제목 아래에 표시될 짧은 설명입니다."
                />
              </label>

              <div className="admin-image-uploader">
                <div>
                  <h3>대표 이미지</h3>
                  <p>새 글 작성 중 바로 이미지를 추가하고 미리볼 수 있습니다.</p>
                  <ul className="admin-upload-guide">
                    <li>권장 크기: 1200 x 800px</li>
                    <li>권장 비율: 가로형 3:2 또는 4:3</li>
                    <li>파일 형식: JPG, PNG, WebP</li>
                    <li>최대 용량: 5MB 이하</li>
                  </ul>
                </div>
                <label className="admin-upload-drop">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                  />
                  <strong>이미지 선택</strong>
                  <span>권장 1200 x 800px · JPG, PNG, WebP · 최대 5MB</span>
                </label>
                {item.heroImage ? (
                  <figure className="admin-upload-preview">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.heroImage} alt={item.heroImageAlt || "대표 이미지 미리보기"} />
                    <figcaption>
                      <label>
                        이미지 대체문구
                        <input
                          value={item.heroImageAlt ?? ""}
                          onChange={(event) => update("heroImageAlt", event.target.value)}
                          placeholder="예: 상담 자료를 검토하는 변호사"
                        />
                      </label>
                      <button type="button" onClick={removeImage}>
                        이미지 제거
                      </button>
                    </figcaption>
                  </figure>
                ) : null}
                {imageStatus ? <p className="admin-upload-status">{imageStatus}</p> : null}
                {imageError ? (
                  <p className="admin-upload-error" role="alert">
                    {imageError}
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="admin-editor-panel">
              <h2>{type === "faq" ? "답변 작성" : "본문 작성"}</h2>
              <textarea
                className="admin-body-editor"
                value={item.body}
                onChange={(event) => update("body", event.target.value)}
                placeholder={
                  type === "case"
                    ? "사건 개요, 쟁점, 제우의 대응, 사건 결과를 차례로 적어주세요."
                    : type === "guide"
                      ? "네이버 블로그처럼 편하게 문단을 나누어 작성해 주세요."
                      : "질문에 대한 짧은 답변과 상세 답변을 적어주세요."
                }
              />
              <label>
                추천 태그
                <input
                  value={item.tags.join(", ")}
                  onChange={(event) => update("tags", normalizeTags(event.target.value))}
                  placeholder="예: 계약금, 손해배상, 민사"
                />
              </label>
              <div className="admin-ai-box">
                <h3>AI 작성 도우미</h3>
                <p>
                  외부 AI가 연결되지 않은 상태라 로컬 추천만 보여줍니다. 결과는 자동 공개되지
                  않습니다.
                </p>
                <textarea
                  value={aiInput}
                  onChange={(event) => setAiInput(event.target.value)}
                  placeholder="주제나 사건 내용을 붙여 넣으면 제목, 요약, 태그를 추천합니다."
                />
                {suggestion ? (
                  <div className="admin-ai-result">
                    {suggestion.warning ? <strong>{suggestion.warning}</strong> : null}
                    <p>{suggestion.summary}</p>
                    <div>
                      {suggestion.titles.map((title) => (
                        <button key={title} type="button" onClick={() => update("title", title)}>
                          제목 적용: {title}
                        </button>
                      ))}
                    </div>
                    <button type="button" onClick={() => update("tags", suggestion.tags)}>
                      추천 태그 모두 적용
                    </button>
                  </div>
                ) : null}
              </div>
            </section>
          ) : null}

          {step === 3 ? (
            <section className="admin-editor-panel">
              <h2>페이지 표시 설정</h2>
              <div className="admin-check-grid">
                <label>
                  <input
                    type="checkbox"
                    checked={item.visibility.isFeatured}
                    onChange={(event) => setVisibility("isFeatured", event.target.checked)}
                  />{" "}
                  대표 콘텐츠로 지정
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={item.visibility.showOnHome}
                    onChange={(event) => setVisibility("showOnHome", event.target.checked)}
                  />{" "}
                  메인 페이지에 표시
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={item.visibility.showOnCategory}
                    onChange={(event) => setVisibility("showOnCategory", event.target.checked)}
                  />{" "}
                  목록 상단에 표시
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={item.visibility.showOnPractice}
                    onChange={(event) => setVisibility("showOnPractice", event.target.checked)}
                  />{" "}
                  관련 업무분야에 추천
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={item.visibility.showOnSearch}
                    onChange={(event) => setVisibility("showOnSearch", event.target.checked)}
                  />{" "}
                  검색 결과에 추천
                </label>
              </div>
              <div className="admin-seo-box">
                <h3>검색 노출 설정</h3>
                <p>비워두면 제목과 목록 설명을 기준으로 자동 생성됩니다.</p>
                <div className="admin-form-grid">
                  <label>
                    검색결과 제목
                    <input
                      value={item.seo?.title ?? ""}
                      onChange={(event) => updateSeo("title", event.target.value)}
                      placeholder={item.title || "검색결과에 보일 제목"}
                    />
                  </label>
                  <label>
                    canonical 경로
                    <input
                      value={item.seo?.canonicalPath ?? ""}
                      onChange={(event) => updateSeo("canonicalPath", event.target.value)}
                      placeholder={`/${typePath(type)}/${item.id}`}
                    />
                  </label>
                  <label>
                    검색엔진 노출
                    <select
                      value={item.seo?.index === false ? "noindex" : "index"}
                      onChange={(event) => updateSeo("index", event.target.value === "index")}
                    >
                      <option value="index">index, follow</option>
                      <option value="noindex">noindex, follow</option>
                    </select>
                  </label>
                </div>
                <label>
                  검색결과 설명
                  <textarea
                    value={item.seo?.description ?? ""}
                    onChange={(event) => updateSeo("description", event.target.value)}
                    placeholder={item.summary || "검색결과에 보일 1~2문장 설명"}
                  />
                </label>
              </div>
              {item.visibility.isFeatured ? (
                <div className="admin-form-grid">
                  <label>
                    대표 노출 순서
                    <input
                      type="number"
                      min="1"
                      max="6"
                      value={item.visibility.featuredOrder ?? 1}
                      onChange={(event) =>
                        setItem((current) => ({
                          ...current,
                          visibility: {
                            ...current.visibility,
                            featuredOrder: Number(event.target.value),
                          },
                        }))
                      }
                    />
                  </label>
                  <label>
                    공개 상태
                    <select
                      value={item.status}
                      onChange={(event) => update("status", event.target.value as CmsStatus)}
                    >
                      <option value="draft">임시저장</option>
                      <option value="published">공개</option>
                      <option value="private">비공개</option>
                      <option value="scheduled">예약 공개</option>
                    </select>
                  </label>
                </div>
              ) : null}
            </section>
          ) : null}

          {step === 4 ? (
            <section className="admin-editor-panel">
              <h2>공개 전 확인</h2>
              <div className="admin-review-grid">
                <article>
                  <span>제목</span>
                  <strong>{item.title || "비어 있음"}</strong>
                </article>
                <article>
                  <span>분야</span>
                  <strong>{cmsCategoryLabels[item.category]}</strong>
                </article>
                <article>
                  <span>목록 설명</span>
                  <strong>{item.summary || "비어 있음"}</strong>
                </article>
                <article>
                  <span>대표 이미지</span>
                  <strong>{item.heroImage ? "추가됨" : "없음"}</strong>
                </article>
                <article>
                  <span>노출 위치</span>
                  <strong>{item.visibility.isFeatured ? "대표 노출 포함" : "일반 노출"}</strong>
                </article>
              </div>
              <div className="admin-final-actions">
                <button type="button" onClick={() => setStep(3)}>
                  이전으로
                </button>
                <button type="button" onClick={() => persist("임시저장됨")}>
                  임시저장
                </button>
                <button type="button" onClick={() => publish("published")}>
                  지금 공개
                </button>
                <button type="button" onClick={() => publish("scheduled")}>
                  예약 공개
                </button>
              </div>
            </section>
          ) : null}
        </section>

        <aside className="admin-editor-side">
          <strong aria-live="polite">{saveState}</strong>
          <p>
            마지막 자동저장:{" "}
            {item.updatedAt ? new Date(item.updatedAt).toLocaleTimeString("ko-KR") : "아직 없음"}
          </p>
          <div className="admin-preview-tabs">
            {(["pc", "tablet", "mobile"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                data-active={preview === mode}
                onClick={() => setPreview(mode)}
              >
                {mode === "pc" ? "PC" : mode === "tablet" ? "태블릿" : "모바일"}
              </button>
            ))}
          </div>
          <div className="admin-preview" data-mode={preview}>
            <article>
              {item.heroImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  className="admin-preview-image"
                  src={item.heroImage}
                  alt={item.heroImageAlt || "대표 이미지 미리보기"}
                />
              ) : null}
              <span>{cmsCategoryLabels[item.category]}</span>
              <h3>{item.title || "제목이 여기에 표시됩니다"}</h3>
              <p>{item.summary || "목록 설명이 여기에 표시됩니다."}</p>
              <small>{item.tags.join(" · ") || "태그 없음"}</small>
            </article>
          </div>
          <button type="button" onClick={() => persist("수동 저장됨")}>
            지금 저장
          </button>
          <button type="button" onClick={() => setStep(4)}>
            공개 확인으로
          </button>
        </aside>
      </div>
    </div>
  );
}
