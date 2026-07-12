"use client";

import { useEffect, useMemo, useState } from "react";
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
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/analytics", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("통계를 불러오지 못했습니다.");
        return response.json() as Promise<AnalyticsDashboardData>;
      })
      .then(setData)
      .catch(() => setError("접속통계를 불러오지 못했습니다. 잠시 후 다시 확인해주세요."));
  }, []);

  const maxDailyVisits = useMemo(
    () => Math.max(1, ...(data?.daily.map((item) => item.visits) ?? [1])),
    [data],
  );

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
            사이트 방문자의 일일, 주별, 월별 접속수와 접속 IP를 확인합니다. IP는 개인정보가 될 수
            있으니 운영 목적에 필요한 범위에서만 확인해주세요.
          </p>
        </div>
      </header>

      <section className="admin-stat-grid admin-analytics-stats" aria-label="접속통계 요약">
        <MetricCard label="전체" visits={data.totalVisits} uniqueIps={data.totalUniqueIps} />
        <MetricCard {...data.today} />
        <MetricCard {...data.week} />
        <MetricCard {...data.month} />
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
          <div className="admin-table-wrap">
            <table className="admin-analytics-table">
              <thead>
                <tr>
                  <th>기간</th>
                  <th>접속수</th>
                  <th>IP 수</th>
                </tr>
              </thead>
              <tbody>
                {data.weekly.map((item) => (
                  <tr key={item.label}>
                    <td>{item.label}</td>
                    <td>{item.visits}</td>
                    <td>{item.uniqueIps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="admin-panel">
          <div className="admin-panel-title">
            <h2>월별 접속자수</h2>
            <p>최근 6개월 기준입니다.</p>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-analytics-table">
              <thead>
                <tr>
                  <th>월</th>
                  <th>접속수</th>
                  <th>IP 수</th>
                </tr>
              </thead>
              <tbody>
                {data.monthly.map((item) => (
                  <tr key={item.label}>
                    <td>{item.label}</td>
                    <td>{item.visits}</td>
                    <td>{item.uniqueIps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
              </tr>
            </thead>
            <tbody>
              {data.ipSummaries.map((item) => (
                <tr key={item.ip}>
                  <td>{item.ip}</td>
                  <td>{item.visits}</td>
                  <td>{formatDateTime(item.lastVisitedAt)}</td>
                  <td>{item.paths.join(", ")}</td>
                </tr>
              ))}
              {!data.ipSummaries.length ? (
                <tr>
                  <td colSpan={4}>아직 기록된 접속자가 없습니다.</td>
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
