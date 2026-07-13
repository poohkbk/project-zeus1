import { getSupabasePublishableKey, getSupabaseServiceRoleKey, getSupabaseUrl } from "@/lib/supabase/env";

export function hasSupabaseConfig() {
  return Boolean(getSupabaseUrl() && (getSupabaseServiceRoleKey() || getSupabasePublishableKey()));
}

export async function supabaseRequest(pathname: string, init: RequestInit) {
  const baseUrl = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey() || getSupabasePublishableKey();
  if (!baseUrl || !key) return undefined;

  const response = await fetch(`${baseUrl}/rest/v1/${pathname}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) return undefined;
  return response.json().catch(() => undefined) as Promise<unknown>;
}
