"use client";

import { useEffect, useMemo, useState } from "react";
import {
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

  const selected = submissions.find((submission) => submission.id === selectedId) ?? visibleSubmissions[0];

  function refresh(nextSubmissions: ConsultationSubmission[]) {
    const sorted = nextSubmissions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    setSubmissions(sorted);
  }

  function updateSelected(updates: Partial<Pick<ConsultationSubmission, "memo" | "status">>) {
    if (!selected) return;
    const localUpdated = updateConsultationSubmission(selected.id, updates);
    refresh(localUpdated);

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

  return (
    <div className="admin-screen">
      <header className="admin-page-title">
        <div>
          <span>상담 관리</span>
          <h1>상담신청</h1>
          <p>홈페이지 상담 폼으로 접수된 내용을 확인하고 종이로 출력할 수 있습니다.</p>
        </div>
      </header>

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
                    {submission.categoryLabel} · {new Date(submission.createdAt).toLocaleString("ko-KR")}
                  </small>
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
