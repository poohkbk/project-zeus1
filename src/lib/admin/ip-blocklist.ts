import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { AnalyticsBlockedIp } from "@/types/analytics";
import { createAdminClient } from "@/lib/supabase/admin";

const DATA_DIR = path.join(process.cwd(), "data");
const BLOCKED_IPS_FILE = path.join(DATA_DIR, "blocked-ips.json");

export function normalizeIp(ip: string) {
  return ip.trim();
}

type BlockedIpRow = {
  ip: string;
  blocked_at: string;
  reason: string | null;
};

function toBlockedIp(row: BlockedIpRow): AnalyticsBlockedIp {
  return {
    ip: row.ip,
    blockedAt: row.blocked_at,
    reason: row.reason ?? undefined,
  };
}

function loadBlockedIpsFromFile(): AnalyticsBlockedIp[] {
  try {
    if (!existsSync(BLOCKED_IPS_FILE)) return [];
    const raw = readFileSync(BLOCKED_IPS_FILE, "utf8");
    const parsed = JSON.parse(raw) as AnalyticsBlockedIp[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveBlockedIpsToFile(blockedIps: AnalyticsBlockedIp[]) {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  writeFileSync(BLOCKED_IPS_FILE, JSON.stringify(blockedIps, null, 2));
}

export async function loadBlockedIps(): Promise<AnalyticsBlockedIp[]> {
  const supabase = createAdminClient();
  if (supabase) {
    const { data, error } = await supabase
      .from("analytics_blocked_ips")
      .select("ip, blocked_at, reason")
      .order("blocked_at", { ascending: false });

    if (!error) return ((data ?? []) as BlockedIpRow[]).map(toBlockedIp);
  }

  return loadBlockedIpsFromFile();
}

export async function isIpBlocked(ip: string) {
  const normalizedIp = normalizeIp(ip);
  const blockedIps = await loadBlockedIps();
  return blockedIps.some((item) => item.ip === normalizedIp);
}

export async function blockIp(ip: string, reason?: string) {
  const normalizedIp = normalizeIp(ip);
  if (!normalizedIp) return loadBlockedIps();

  const supabase = createAdminClient();
  if (supabase) {
    const { error } = await supabase.from("analytics_blocked_ips").upsert(
      {
        ip: normalizedIp,
        reason: reason?.trim() || null,
        blocked_at: new Date().toISOString(),
      },
      { onConflict: "ip" },
    );

    if (!error) return loadBlockedIps();
  }

  const blockedIps = loadBlockedIpsFromFile();
  if (blockedIps.some((item) => item.ip === normalizedIp)) return blockedIps;

  const nextBlockedIps = [
    {
      ip: normalizedIp,
      blockedAt: new Date().toISOString(),
      reason: reason?.trim() || undefined,
    },
    ...blockedIps,
  ];
  saveBlockedIpsToFile(nextBlockedIps);
  return nextBlockedIps;
}

export async function unblockIp(ip: string) {
  const normalizedIp = normalizeIp(ip);
  const supabase = createAdminClient();
  if (supabase) {
    const { error } = await supabase.from("analytics_blocked_ips").delete().eq("ip", normalizedIp);
    if (!error) return loadBlockedIps();
  }

  const nextBlockedIps = loadBlockedIpsFromFile().filter((item) => item.ip !== normalizedIp);
  saveBlockedIpsToFile(nextBlockedIps);
  return nextBlockedIps;
}
