"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { AnalyticsDashboardData } from "@/types/analytics";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function MetricCard({ label, visits, uniqueIps }: { label: string; visits: number; uniqueIps: number }) {
  return (
    <article>
      <strong>{visits}</strong>
      <span>{label} 접속수</span>
      <small>IP {uniqueIps}개</small>
    </article>
  );
}

export function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsDashboardData | null>(null);
  const [manualIp, setManualIp] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function refreshAnalytics() {
    return fetch("/api/admin/analytics", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("통계를 불러오지 못했습니다.");
        return response.json() as Promise<AnalyticsDashboardData>;
      })
      .then(setData);
  }

  useEffect(() => {
    refreshAnalytics().catch(() =>
      setError("접속통계를 불러오지 못했습니다. 잠시 후 다시 확인해주세요."),
    );
  }, []);

  const blockedIpSet = useMemo(
    () => new Set(data?.blockedIps.map((item) => item.ip) ?? []),
    [data],
  );

  const maxDailyVisits = useMemo(
    () => Math.max(1, ...(data?.daily.map((item) => item.visits) ?? [1])),
    [data],
  );

  async function updateBlocklist(method: "POST" | "DELETE", ip: string, reason?: string) {
    const response = await fetch("/api/admin/analytics/blocklist", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip, reason }),
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      throw new Error(body.message ?? "IP 차단 정보를 저장하지 못했습니다.");
    }

    await refreshAnalytics();
  }

  async function blockSelectedIp(ip: string, reason?: string) {
    try {
      await updateBlocklist("POST", ip, reason);
      setMessage(`${ip} 접속을 차단했습니다.`);
    } catch (blockError) {
      setMessage(blockError instanceof Error ? blockError.message : "IP 차단에 실패했습니다.");
    }
  }

  async function unblockSelectedIp(ip: string) {
    try {
      await updateBlocklist("DELETE", ip);
      setMessage(`${ip} 차단을 해제했습니다.`);
    } catch (unblockError) {
      setMessage(unblockError instanceof Error ? unblockError.message : "IP 차단 해제에 실패했습니다.");
    }
  }

  async function submitManualBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const ip = manualIp.trim();
    if (!ip) {
      setMessage("차단할 IP를 입력해주세요.");
      return;
    }
    await blockSelectedIp(ip, blockReason);
    setManualIp("");
    setBlockReason("");
  }

  if (error) {
    return (
      <div className="admin-screen">
        <section className="admin-empty">
          <h3>{error}</h3>
        </section>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="admin-screen">
        <section className="admin-empty">
          <h3>접속통계를 불러오는 중입니다.</h3>
        </section>
      </div>
    );
  }

  return (
    <div className="admin-screen">
      <header className="admin-page-title">
        <div>
          <span>방문자 분석</span>
          <h1>접속통계</h1>
          <p>
            사이트 방문자의 일일, 주별, 월별 접속수와 접속 IP를 확인합니다. 문제가 있는 IP는
            공개 페이지 접속을 차단할 수 있습니다.
          </p>
        </div>
      </header>

      <section className="admin-stat-grid admin-analytics-stats" aria-label="접속통계 요약">
        <MetricCard label="전체" visits={data.totalVisits} uniqueIps={data.totalUniqueIps} />
        <MetricCard {...data.today} />
        <MetricCard {...data.week} />
        <MetricCard {...data.month} />
      </section>

      <section className="admin-panel admin-blocklist-panel">
        <div className="admin-panel-title">
          <h2>IP 차단 관리</h2>
          <p>
            차단된 IP는 일반 사이트 화면에 접근할 수 없고, 관리자 화면은 해제를 위해 계속
            접근할 수 있습니다.
          </p>
        </div>
        <form className="admin-blocklist-form" onSubmit={submitManualBlock}>
          <label>
            차단할 IP
            <input
              value={manualIp}
              onChange={(event) => setManualIp(event.target.value)}
              placeholder="예: 203.0.113.10"
            />
          </label>
          <label>
            메모
            <input
              value={blockReason}
              onChange={(event) => setBlockReason(event.target.value)}
              placeholder="예: 반복 스팸 접속"
            />
          </label>
          <button type="submit">IP 차단</button>
        </form>
        {message ? (
          <p className="admin-taxonomy-message" role="status" aria-live="polite">
            {message}
          </p>
        ) : null}
        <div className="admin-blocked-list">
          {data.blockedIps.length ? (
            data.blockedIps.map((item) => (
              <article key={item.ip}>
                <div>
                  <strong>{item.ip}</strong>
                  <span>차단일 {formatDateTime(item.blockedAt)}</span>
                  {item.reason ? <small>{item.reason}</small> : null}
                </div>
                <button type="button" onClick={() => unblockSelectedIp(item.ip)}>
                  차단 해제
                </button>
              </article>
            ))
          ) : (
            <p className="admin-muted">현재 차단된 IP가 없습니다.</p>
          )}
        </div>
      </section>

      <section className="admin-analytics-layout">
        <article className="admin-panel">
          <div className="admin-panel-title">
            <h2>최근 7일 일일 접속자수</h2>
            <p>막대가 길수록 해당 날짜의 접속수가 많습니다.</p>
          </div>
          <div className="admin-bar-list">
            {data.daily.map((item) => (
              <div key={item.label} className="admin-bar-row">
                <span>{item.label}</span>
                <div>
                  <i style={{ width: `${Math.max(6, (item.visits / maxDailyVisits) * 100)}%` }} />
                </div>
                <strong>{item.visits}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-title">
            <h2>여러 차례 접속한 IP</h2>
            <p>반복 방문, 내부 테스트, 집중 문의 흐름을 빠르게 확인합니다.</p>
          </div>
          <div className="admin-ip-list">
            {data.repeatedIps.length ? (
              data.repeatedIps.slice(0, 8).map((item) => (
                <div key={item.ip}>
                  <strong>{item.ip}</strong>
                  <span>{item.visits}회 접속</span>
                  <small>최근 {formatDateTime(item.lastVisitedAt)}</small>
                  {blockedIpSet.has(item.ip) ? (
                    <button type="button" onClick={() => unblockSelectedIp(item.ip)}>
                      차단 해제
                    </button>
                  ) : (
                    <button type="button" onClick={() => blockSelectedIp(item.ip, "반복 접속")}>
                      차단
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p className="admin-muted">아직 여러 번 접속한 IP가 없습니다.</p>
            )}
          </div>
        </article>
      </section>

      <section className="admin-analytics-layout">
        <article className="admin-panel">
          <div className="admin-panel-title">
            <h2>주별 접속자수</h2>
            <p>최근 6주 기준입니다.</p>
          </div>
          <AnalyticsTable
            headers={["기간", "접속수", "IP 수"]}
            rows={data.weekly.map((item) => [item.label, String(item.visits), String(item.uniqueIps)])}
          />
        </article>

        <article className="admin-panel">
          <div className="admin-panel-title">
            <h2>월별 접속자수</h2>
            <p>최근 6개월 기준입니다.</p>
          </div>
          <AnalyticsTable
            headers={["월", "접속수", "IP 수"]}
            rows={data.monthly.map((item) => [item.label, String(item.visits), String(item.uniqueIps)])}
          />
        </article>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-title">
          <h2>접속자 IP 목록</h2>
          <p>접속 횟수가 많은 IP 순서로 표시됩니다.</p>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-analytics-table">
            <thead>
              <tr>
                <th>IP</th>
                <th>접속수</th>
                <th>최근 접속</th>
                <th>방문 경로</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {data.ipSummaries.map((item) => (
                <tr key={item.ip}>
                  <td>{item.ip}</td>
                  <td>{item.visits}</td>
                  <td>{formatDateTime(item.lastVisitedAt)}</td>
                  <td>{item.paths.join(", ")}</td>
                  <td>
                    {blockedIpSet.has(item.ip) ? (
                      <button type="button" onClick={() => unblockSelectedIp(item.ip)}>
                        해제
                      </button>
                    ) : (
                      <button type="button" onClick={() => blockSelectedIp(item.ip)}>
                        차단
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!data.ipSummaries.length ? (
                <tr>
                  <td colSpan={5}>아직 기록된 접속자가 없습니다.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-panel">
        <div className="admin-panel-title">
          <h2>최근 접속 기록</h2>
          <p>최근 30건까지 표시됩니다.</p>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-analytics-table">
            <thead>
              <tr>
                <th>시간</th>
                <th>IP</th>
                <th>페이지</th>
              </tr>
            </thead>
            <tbody>
              {data.recentVisits.map((visit) => (
                <tr key={visit.id}>
                  <td>{formatDateTime(visit.visitedAt)}</td>
                  <td>{visit.ip}</td>
                  <td>{visit.path}</td>
                </tr>
              ))}
              {!data.recentVisits.length ? (
                <tr>
                  <td colSpan={3}>아직 최근 접속 기록이 없습니다.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function AnalyticsTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-analytics-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.join("-")}>
              {row.map((cell, index) => (
                <td key={`${cell}-${index}`}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
