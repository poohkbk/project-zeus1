import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type {
  AnalyticsDashboardData,
  AnalyticsIpSummary,
  AnalyticsSummaryMetric,
  AnalyticsVisit,
} from "@/types/analytics";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBlockedIps } from "./ip-blocklist";

const ANALYTICS_DIR = path.join(process.cwd(), "data");
const ANALYTICS_FILE = path.join(ANALYTICS_DIR, "analytics-visits.json");
const MAX_VISITS = 5000;
const canUseFileStore = !process.env.VERCEL;
const memoryVisits: AnalyticsVisit[] = [];

function readVisits(): AnalyticsVisit[] {
  if (!canUseFileStore) return memoryVisits;

  try {
    if (!existsSync(ANALYTICS_FILE)) return [];
    const raw = readFileSync(ANALYTICS_FILE, "utf8");
    const parsed = JSON.parse(raw) as AnalyticsVisit[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeVisits(visits: AnalyticsVisit[]) {
  const recentVisits = visits.slice(-MAX_VISITS);

  if (!canUseFileStore) {
    memoryVisits.splice(0, memoryVisits.length, ...recentVisits);
    return;
  }

  try {
    if (!existsSync(ANALYTICS_DIR)) {
      mkdirSync(ANALYTICS_DIR, { recursive: true });
    }
    writeFileSync(ANALYTICS_FILE, JSON.stringify(recentVisits, null, 2));
  } catch {
    memoryVisits.splice(0, memoryVisits.length, ...recentVisits);
  }
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfWeek(date: Date) {
  const start = startOfDay(date);
  const day = start.getDay();
  start.setDate(start.getDate() - day);
  return start;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function countMetric(label: string, visits: AnalyticsVisit[]): AnalyticsSummaryMetric {
  return {
    label,
    visits: visits.length,
    uniqueIps: new Set(visits.map((visit) => visit.ip)).size,
  };
}

function buildRangeMetrics(
  visits: AnalyticsVisit[],
  count: number,
  getStart: (index: number) => Date,
  getEnd: (start: Date) => Date,
  getLabel: (start: Date) => string,
) {
  return Array.from({ length: count }, (_, index) => {
    const start = getStart(count - 1 - index);
    const end = getEnd(start);
    const rangeVisits = visits.filter((visit) => {
      const visitedAt = new Date(visit.visitedAt);
      return visitedAt >= start && visitedAt < end;
    });
    return countMetric(getLabel(start), rangeVisits);
  });
}

function summarizeIps(visits: AnalyticsVisit[]): AnalyticsIpSummary[] {
  const grouped = new Map<string, AnalyticsVisit[]>();
  visits.forEach((visit) => {
    grouped.set(visit.ip, [...(grouped.get(visit.ip) ?? []), visit]);
  });

  return Array.from(grouped.entries())
    .map(([ip, entries]) => ({
      ip,
      visits: entries.length,
      lastVisitedAt: entries
        .slice()
        .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt))[0].visitedAt,
      paths: Array.from(new Set(entries.map((entry) => entry.path))).slice(0, 5),
    }))
    .sort((a, b) => b.visits - a.visits || b.lastVisitedAt.localeCompare(a.lastVisitedAt));
}

type AnalyticsVisitRow = {
  id: string;
  ip: string;
  path: string;
  user_agent: string | null;
  visited_at: string;
};

export type AnalyticsRecordResult = {
  visit?: AnalyticsVisit;
  storage: "supabase" | "local" | "none";
  reason?: "missing_supabase_env" | "supabase_insert_failed" | "local_fallback_failed";
};

function toVisit(row: AnalyticsVisitRow): AnalyticsVisit {
  return {
    id: row.id,
    ip: row.ip,
    path: row.path,
    userAgent: row.user_agent ?? "unknown",
    visitedAt: row.visited_at,
  };
}

async function readVisitsFromSupabase() {
  const supabase = createAdminClient();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from("analytics_visits")
    .select("id, ip, path, user_agent, visited_at")
    .order("visited_at", { ascending: false })
    .limit(MAX_VISITS);

  if (error) return undefined;
  return ((data ?? []) as AnalyticsVisitRow[]).map(toVisit);
}

export async function recordAnalyticsVisit(visit: Omit<AnalyticsVisit, "id" | "visitedAt">) {
  const supabase = createAdminClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("analytics_visits")
      .insert({
        ip: visit.ip,
        path: visit.path,
        user_agent: visit.userAgent,
      })
      .select("id, ip, path, user_agent, visited_at")
      .maybeSingle();

    if (!error && data) {
      return {
        visit: toVisit(data as AnalyticsVisitRow),
        storage: "supabase",
      } satisfies AnalyticsRecordResult;
    }

    if (!canUseFileStore) {
      return {
        storage: "none",
        reason: "supabase_insert_failed",
      } satisfies AnalyticsRecordResult;
    }
  } else if (!canUseFileStore) {
    return {
      storage: "none",
      reason: "missing_supabase_env",
    } satisfies AnalyticsRecordResult;
  }

  try {
    const visits = readVisits();
    const nextVisit: AnalyticsVisit = {
      ...visit,
      id: `visit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      visitedAt: new Date().toISOString(),
    };
    writeVisits([...visits, nextVisit]);
    return {
      visit: nextVisit,
      storage: "local",
    } satisfies AnalyticsRecordResult;
  } catch {
    return {
      storage: "none",
      reason: "local_fallback_failed",
    } satisfies AnalyticsRecordResult;
  }
}

export async function getAnalyticsDashboard(): Promise<AnalyticsDashboardData> {
  const storedVisits = (await readVisitsFromSupabase()) ?? readVisits();
  const visits = storedVisits.sort((a, b) => b.visitedAt.localeCompare(a.visitedAt));
  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now);
  const monthStart = startOfMonth(now);
  const ipSummaries = summarizeIps(visits);

  return {
    generatedAt: now.toISOString(),
    totalVisits: visits.length,
    totalUniqueIps: new Set(visits.map((visit) => visit.ip)).size,
    today: countMetric("오늘", visits.filter((visit) => new Date(visit.visitedAt) >= todayStart)),
    week: countMetric("이번 주", visits.filter((visit) => new Date(visit.visitedAt) >= weekStart)),
    month: countMetric("이번 달", visits.filter((visit) => new Date(visit.visitedAt) >= monthStart)),
    daily: buildRangeMetrics(
      visits,
      7,
      (index) => addDays(todayStart, -index),
      (start) => addDays(start, 1),
      formatDateKey,
    ),
    weekly: buildRangeMetrics(
      visits,
      6,
      (index) => addDays(weekStart, -index * 7),
      (start) => addDays(start, 7),
      (start) => `${formatDateKey(start)} 주`,
    ),
    monthly: buildRangeMetrics(
      visits,
      6,
      (index) => new Date(now.getFullYear(), now.getMonth() - index, 1),
      (start) => new Date(start.getFullYear(), start.getMonth() + 1, 1),
      (start) => `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}`,
    ),
    ipSummaries,
    repeatedIps: ipSummaries.filter((summary) => summary.visits >= 2),
    recentVisits: visits.slice(0, 30),
    blockedIps: await loadBlockedIps(),
  };
}
