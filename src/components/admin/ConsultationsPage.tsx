"use client";

import { useEffect, useMemo, useState } from "react";
import {
  deleteConsultationSubmission,
  getConsultationStatusLabel,
  loadConsultationSubmissions,
  updateConsultationSubmission,
} from "@/lib/consultation-submissions";
import type { ConsultationSubmission, ConsultationSubmissionStatus } from "@/types/consultation";

const statusOptions: ConsultationSubmissionStatus[] = ["new", "reviewing", "contacted", "closed"];

function formatPhone(value: string) {
  if (value.length !== 11) return value;
  return `${value.slice(0, 3)}-${value.slice(3, 7)}-${value.slice(7)}`;
}

function formatPreferredSchedule(submission: ConsultationSubmission) {
  if (!submission.preferredDate || !submission.preferredTime) return "미지정";
  return `${submission.preferredDate} ${submission.preferredTime}`;
}

function getAiOriginalQuestion(submission: ConsultationSubmission) {
  const storedQuestion = submission.aiSummary?.userQuestion?.trim();
  if (storedQuestion) return storedQuestion;

  const messageQuestion = submission.message.match(/AI 상담 질문\s*\n([^\n]+)/)?.[1]?.trim();
  return messageQuestion || "기존 접수 건으로 최초 질문이 저장되어 있지 않습니다.";
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <strong>{title}</strong>
      {items.length > 0 ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>추가 확인이 필요합니다.</p>
      )}
    </div>
  );
}

export function ConsultationsPage() {
  const [submissions, setSubmissions] = useState<ConsultationSubmission[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ConsultationSubmissionStatus>("all");
  const [syncMessage, setSyncMessage] = useState("");
  const [deletePending, setDeletePending] = useState(false);

  useEffect(() => {
    const loaded = loadConsultationSubmissions();
    setSubmissions(loaded);
    setSelectedId(loaded[0]?.id ?? "");
    fetch("/api/admin/consultations", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("상담신청을 불러오지 못했습니다.");
        return (await response.json()) as { submissions?: ConsultationSubmission[] };
      })
      .then((data) => {
        const serverSubmissions = data.submissions ?? [];
        setSubmissions(serverSubmissions);
        setSelectedId(serverSubmissions[0]?.id ?? "");
        setSyncMessage("Supabase 상담신청 목록을 표시하고 있습니다.");
      })
      .catch(() => {
        setSyncMessage("Supabase 상담신청을 불러오지 못해 이 브라우저의 임시 목록을 표시합니다.");
      });
  }, []);

  const visibleSubmissions = useMemo(
    () =>
      submissions.filter((submission) =>
        statusFilter === "all" ? true : submission.status === statusFilter,
      ),
    [submissions, statusFilter],
  );

  const aiConsultationStats = useMemo(() => {
    const aiSubmissions = submissions.filter(
      (submission) => submission.source === "ai-guide" || Boolean(submission.aiSummary),
    );
    const counts = new Map<string, number>();

    aiSubmissions.forEach((submission) => {
      const label = submission.aiSummary?.categoryLabel || submission.categoryLabel || "미분류";
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });

    return {
      total: aiSubmissions.length,
      categories: [...counts.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [submissions]);

  const selected = submissions.find((submission) => submission.id === selectedId) ?? visibleSubmissions[0];

  function refresh(nextSubmissions: ConsultationSubmission[]) {
    const sorted = nextSubmissions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setSubmissions(sorted);
  }

  function updateSelected(updates: Partial<Pick<ConsultationSubmission, "memo" | "status">>) {
    if (!selected) return;
    const optimisticSubmissions = submissions.map((submission) =>
      submission.id === selected.id
        ? {
            ...submission,
            ...updates,
            updatedAt: new Date().toISOString(),
          }
        : submission,
    );
    refresh(optimisticSubmissions);
    updateConsultationSubmission(selected.id, updates);

    fetch("/api/admin/consultations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected.id, ...updates }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("상담 정보를 저장하지 못했습니다.");
        return (await response.json()) as { submission?: ConsultationSubmission };
      })
      .then((data) => {
        if (!data.submission) return;
        setSubmissions((current) =>
          current
            .map((submission) => (submission.id === data.submission?.id ? data.submission : submission))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
        setSyncMessage("상담 처리상태와 메모가 Supabase에 저장되었습니다.");
      })
      .catch(() => setSyncMessage("이 브라우저에는 반영됐지만 Supabase 저장은 실패했습니다."));
  }

  function selectNextAfterDelete(nextSubmissions: ConsultationSubmission[]) {
    const nextVisible = nextSubmissions.filter((submission) =>
      statusFilter === "all" ? true : submission.status === statusFilter,
    );
    setSelectedId(nextVisible[0]?.id ?? nextSubmissions[0]?.id ?? "");
  }

  async function deleteSelected() {
    if (!selected || deletePending) return;
    const confirmed = window.confirm(
      `${selected.name}님의 상담신청 글을 삭제할까요? 삭제 후에는 관리자 화면에서 복구할 수 없습니다.`,
    );
    if (!confirmed) return;

    setDeletePending(true);
    setSyncMessage("상담글을 삭제 중입니다.");

    try {
      const response = await fetch(`/api/admin/consultations?id=${encodeURIComponent(selected.id)}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("failed");

      deleteConsultationSubmission(selected.id);
      const nextSubmissions = submissions.filter((submission) => submission.id !== selected.id);
      refresh(nextSubmissions);
      selectNextAfterDelete(nextSubmissions);
      setSyncMessage("상담글이 삭제되었습니다.");
    } catch {
      setSyncMessage("상담글 삭제에 실패했습니다. Supabase 연결과 관리자 권한을 확인해 주세요.");
    } finally {
      setDeletePending(false);
    }
  }

  return (
    <div className="admin-screen">
      <header className="admin-page-title">
        <div>
          <span>상담 관리</span>
          <h1>상담신청</h1>
          <p>홈페이지 상담 폼으로 접수된 내용을 확인하고 종이로 출력할 수 있습니다.</p>
        </div>
      </header>

      <section className="admin-ai-consultation-overview" aria-label="AI 상담 분야 현황">
        <div>
          <span>AI 상담 접수</span>
          <strong>{aiConsultationStats.total}건</strong>
        </div>
        <div className="admin-ai-category-stats">
          <span>분야별 상담 현황</span>
          {aiConsultationStats.categories.length > 0 ? (
            <ul>
              {aiConsultationStats.categories.map(([label, count]) => (
                <li key={label}>
                  <strong>{label}</strong>
                  <em>{count}건</em>
                </li>
              ))}
            </ul>
          ) : (
            <p>아직 접수된 AI 상담이 없습니다.</p>
          )}
        </div>
      </section>

      <section className="admin-consultation-layout">
        <div className="admin-panel">
          {syncMessage ? <p className="admin-sync-message">{syncMessage}</p> : null}
          <div className="admin-toolbar">
            <label>
              처리상태
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as "all" | ConsultationSubmissionStatus)
                }
              >
                <option value="all">전체</option>
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {getConsultationStatusLabel(status)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="admin-consultation-list">
            {visibleSubmissions.length > 0 ? (
              visibleSubmissions.map((submission) => (
                <button
                  key={submission.id}
                  type="button"
                  data-selected={submission.id === selected?.id}
                  onClick={() => setSelectedId(submission.id)}
                >
                  <span>{getConsultationStatusLabel(submission.status)}</span>
                  <strong>{submission.name}</strong>
                  <small>
                    {submission.aiSummary
                      ? `AI 상담 · ${submission.aiSummary.categoryLabel}${submission.aiSummary.subcategoryLabel ? ` / ${submission.aiSummary.subcategoryLabel}` : ""}`
                      : submission.categoryLabel}
                    {` · ${new Date(submission.createdAt).toLocaleString("ko-KR")}`}
                  </small>
                  {submission.source === "ai-guide" || submission.aiSummary ? (
                    <p className="admin-consultation-question-preview">
                      질문: {getAiOriginalQuestion(submission)}
                    </p>
                  ) : null}
                  <em>{submission.receptionNumber}</em>
                </button>
              ))
            ) : (
              <div className="admin-empty">
                <h3>아직 접수된 상담신청이 없습니다.</h3>
                <p>홈페이지 상담신청 폼에서 접수하면 이곳에 표시됩니다.</p>
              </div>
            )}
          </div>
        </div>

        <div className="admin-panel admin-consultation-detail">
          {selected ? (
            <>
              <div className="admin-consultation-actions">
                <label>
                  처리상태
                  <select
                    value={selected.status}
                    onChange={(event) =>
                      updateSelected({ status: event.target.value as ConsultationSubmissionStatus })
                    }
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {getConsultationStatusLabel(status)}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" onClick={() => window.print()}>
                  종이로 출력
                </button>
                <button className="danger" type="button" onClick={deleteSelected} disabled={deletePending}>
                  {deletePending ? "삭제 중..." : "삭제"}
                </button>
              </div>

              <article className="admin-consultation-print">
                <header>
                  <p>법률사무소 제우 상담신청서</p>
                  <h2>{selected.name} 님 상담신청</h2>
                  <span>접수번호: {selected.receptionNumber}</span>
                </header>

                <dl>
                  <div>
                    <dt>접수일시</dt>
                    <dd>{new Date(selected.createdAt).toLocaleString("ko-KR")}</dd>
                  </div>
                  <div>
                    <dt>이름</dt>
                    <dd>{selected.name}</dd>
                  </div>
                  <div>
                    <dt>연락처</dt>
                    <dd>{formatPhone(selected.phone)}</dd>
                  </div>
                  <div>
                    <dt>상담 희망시간</dt>
                    <dd>{formatPreferredSchedule(selected)}</dd>
                  </div>
                  <div>
                    <dt>사건 분야</dt>
                    <dd>{selected.categoryLabel}</dd>
                  </div>
                  <div>
                    <dt>처리상태</dt>
                    <dd>{getConsultationStatusLabel(selected.status)}</dd>
                  </div>
                  <div>
                    <dt>개인정보 동의</dt>
                    <dd>동의함</dd>
                  </div>
                </dl>

                <section>
                  <h3>상담 내용</h3>
                  <p>{selected.message}</p>
                </section>

                {selected.aiSummary ? (
                  <section className="admin-ai-summary-panel">
                    <h3>AI 법률안내 요약</h3>
                    <dl>
                      <div>
                        <dt>분야</dt>
                        <dd>
                          {selected.aiSummary.categoryLabel}
                          {selected.aiSummary.subcategoryLabel
                            ? ` / ${selected.aiSummary.subcategoryLabel}`
                            : ""}
                        </dd>
                      </div>
                      <div>
                        <dt>긴급도</dt>
                        <dd>{selected.aiSummary.urgencyLevel}</dd>
                      </div>
                    </dl>
                    <div className="admin-ai-original-question">
                      <h4>상담자가 처음 입력한 질문</h4>
                      <p>{getAiOriginalQuestion(selected)}</p>
                    </div>
                    <p>{selected.aiSummary.situationSummary}</p>
                    <SummaryList title="확인된 내용" items={selected.aiSummary.confirmedFacts} />
                    <SummaryList title="보유 증거" items={selected.aiSummary.availableEvidence} />
                    <SummaryList title="추가 확인 필요" items={selected.aiSummary.missingInformation} />
                    <SummaryList title="주요 쟁점" items={selected.aiSummary.keyIssues} />
                    {selected.aiSummary.urgencyReasons.length > 0 ? (
                      <SummaryList title="긴급 사유" items={selected.aiSummary.urgencyReasons} />
                    ) : null}
                  </section>
                ) : null}

                <section className="admin-print-memo">
                  <h3>관리 메모</h3>
                  <p>{selected.memo || "작성된 관리 메모가 없습니다."}</p>
                </section>
              </article>

              <label className="admin-consultation-memo">
                관리 메모
                <textarea
                  value={selected.memo}
                  onChange={(event) => updateSelected({ memo: event.target.value })}
                  placeholder="예: 1차 전화 완료, 방문상담 일정 조율 필요"
                />
              </label>
            </>
          ) : (
            <div className="admin-empty">
              <h3>선택된 상담신청이 없습니다.</h3>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
