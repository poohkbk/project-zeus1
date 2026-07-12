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

  useEffect(() => {
    const loaded = loadConsultationSubmissions();
    setSubmissions(loaded);
    setSelectedId(loaded[0]?.id ?? "");
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
    refresh(updateConsultationSubmission(selected.id, updates));
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

      <section className="admin-panel admin-consultation-notice">
        <strong>운영 연결 전 안내</strong>
        <p>
          현재는 Supabase 연결 전이라 같은 브라우저 안의 임시 저장소에 상담글을 보관합니다.
          실제 운영에서는 서버 DB에 저장되도록 연결해야 합니다.
        </p>
      </section>

      <section className="admin-consultation-layout">
        <div className="admin-panel">
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
