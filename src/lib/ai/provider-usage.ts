import type { AiProviderUsage } from "@/types/ai-provider";

interface UsageBucket {
  requestCount: number;
  fallbackCount: number;
  failureCount: number;
  estimatedCostUsd: number;
}

const dailyUsage = new Map<string, UsageBucket>();
const monthlyUsage = new Map<string, UsageBucket>();

function todayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function monthKey(now = new Date()) {
  return now.toISOString().slice(0, 7);
}

function bucket(map: Map<string, UsageBucket>, key: string) {
  const current = map.get(key) ?? {
    requestCount: 0,
    fallbackCount: 0,
    failureCount: 0,
    estimatedCostUsd: 0,
  };
  map.set(key, current);
  return current;
}

function limitNumber(name: string, fallback: number) {
  const parsed = Number(process.env[name] ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function estimateOpenAiCost(usage?: AiProviderUsage) {
  if (usage?.estimatedCostUsd !== undefined) return usage.estimatedCostUsd;
  const inputRate = limitNumber("AI_INPUT_COST_PER_1K_USD", 0.00015);
  const outputRate = limitNumber("AI_OUTPUT_COST_PER_1K_USD", 0.0006);
  const inputTokens = usage?.inputTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? 0;
  return (inputTokens / 1000) * inputRate + (outputTokens / 1000) * outputRate;
}

export function canUseGenerativeAi(now = new Date()) {
  const daily = bucket(dailyUsage, todayKey(now));
  const monthly = bucket(monthlyUsage, monthKey(now));
  const maxDailyRequests = limitNumber("AI_DAILY_REQUEST_LIMIT", 200);
  const maxDailyBudget = limitNumber("AI_DAILY_BUDGET_USD", 5);
  const maxMonthlyBudget = limitNumber("AI_MONTHLY_BUDGET_USD", 100);

  if (daily.requestCount >= maxDailyRequests) {
    return { allowed: false, reason: "rate_limit" as const };
  }
  if (daily.estimatedCostUsd >= maxDailyBudget) {
    return { allowed: false, reason: "daily_budget" as const };
  }
  if (monthly.estimatedCostUsd >= maxMonthlyBudget) {
    return { allowed: false, reason: "monthly_budget" as const };
  }
  return { allowed: true, reason: "ok" as const };
}

export function recordGenerativeUsage(usage?: AiProviderUsage, now = new Date()) {
  const estimatedCostUsd = estimateOpenAiCost(usage);
  const daily = bucket(dailyUsage, todayKey(now));
  const monthly = bucket(monthlyUsage, monthKey(now));
  daily.requestCount += 1;
  monthly.requestCount += 1;
  daily.estimatedCostUsd += estimatedCostUsd;
  monthly.estimatedCostUsd += estimatedCostUsd;
}

export function recordGenerativeFailure(now = new Date()) {
  const daily = bucket(dailyUsage, todayKey(now));
  const monthly = bucket(monthlyUsage, monthKey(now));
  daily.requestCount += 1;
  monthly.requestCount += 1;
  daily.failureCount += 1;
  monthly.failureCount += 1;
}

export function recordGenerativeFallback(now = new Date()) {
  bucket(dailyUsage, todayKey(now)).fallbackCount += 1;
  bucket(monthlyUsage, monthKey(now)).fallbackCount += 1;
}

export function clearGenerativeUsage() {
  dailyUsage.clear();
  monthlyUsage.clear();
}
