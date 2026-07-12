import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { AnalyticsBlockedIp } from "@/types/analytics";

const DATA_DIR = path.join(process.cwd(), "data");
const BLOCKED_IPS_FILE = path.join(DATA_DIR, "blocked-ips.json");

export function normalizeIp(ip: string) {
  return ip.trim();
}

export function loadBlockedIps(): AnalyticsBlockedIp[] {
  try {
    if (!existsSync(BLOCKED_IPS_FILE)) return [];
    const raw = readFileSync(BLOCKED_IPS_FILE, "utf8");
    const parsed = JSON.parse(raw) as AnalyticsBlockedIp[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveBlockedIps(blockedIps: AnalyticsBlockedIp[]) {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  writeFileSync(BLOCKED_IPS_FILE, JSON.stringify(blockedIps, null, 2));
}

export function isIpBlocked(ip: string) {
  const normalizedIp = normalizeIp(ip);
  return loadBlockedIps().some((item) => item.ip === normalizedIp);
}

export function blockIp(ip: string, reason?: string) {
  const normalizedIp = normalizeIp(ip);
  if (!normalizedIp) return loadBlockedIps();

  const blockedIps = loadBlockedIps();
  if (blockedIps.some((item) => item.ip === normalizedIp)) return blockedIps;

  const nextBlockedIps = [
    {
      ip: normalizedIp,
      blockedAt: new Date().toISOString(),
      reason: reason?.trim() || undefined,
    },
    ...blockedIps,
  ];
  saveBlockedIps(nextBlockedIps);
  return nextBlockedIps;
}

export function unblockIp(ip: string) {
  const normalizedIp = normalizeIp(ip);
  const nextBlockedIps = loadBlockedIps().filter((item) => item.ip !== normalizedIp);
  saveBlockedIps(nextBlockedIps);
  return nextBlockedIps;
}
