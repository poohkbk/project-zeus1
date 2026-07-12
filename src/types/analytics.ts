export interface AnalyticsVisit {
  id: string;
  ip: string;
  path: string;
  userAgent: string;
  visitedAt: string;
}

export interface AnalyticsSummaryMetric {
  label: string;
  visits: number;
  uniqueIps: number;
}

export interface AnalyticsIpSummary {
  ip: string;
  visits: number;
  lastVisitedAt: string;
  paths: string[];
}

export interface AnalyticsBlockedIp {
  ip: string;
  blockedAt: string;
  reason?: string;
}

export interface AnalyticsDashboardData {
  generatedAt: string;
  totalVisits: number;
  totalUniqueIps: number;
  today: AnalyticsSummaryMetric;
  week: AnalyticsSummaryMetric;
  month: AnalyticsSummaryMetric;
  daily: AnalyticsSummaryMetric[];
  weekly: AnalyticsSummaryMetric[];
  monthly: AnalyticsSummaryMetric[];
  ipSummaries: AnalyticsIpSummary[];
  repeatedIps: AnalyticsIpSummary[];
  recentVisits: AnalyticsVisit[];
  blockedIps: AnalyticsBlockedIp[];
}
