import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { CmsAdminUser } from "@/types/cms";

type ProfileRow = {
  id: string;
  email: string;
  name: string;
  role: CmsAdminUser["role"];
  active: boolean;
  last_login_at?: string | null;
  created_at?: string | null;
};

function toAdmin(row: ProfileRow): CmsAdminUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    active: row.active,
    lastLoginAt: row.last_login_at ?? "-",
    invitedAt: row.created_at ?? undefined,
  };
}

export async function listAdminUsers() {
  const supabase = createAdminClient();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,name,role,active,last_login_at,created_at")
    .order("role", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as ProfileRow[]).map(toAdmin);
}

export async function createAdminUser(values: { name: string; email: string }) {
  const supabase = createAdminClient();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      name: values.name,
      email: values.email,
      role: "admin",
      active: true,
    })
    .select("id,email,name,role,active,last_login_at,created_at")
    .maybeSingle();

  if (error) throw error;
  return data ? toAdmin(data as ProfileRow) : undefined;
}

export async function updateAdminUser(id: string, values: { name: string; email: string }) {
  const supabase = createAdminClient();
  if (!supabase) return undefined;

  const { data, error } = await supabase
    .from("profiles")
    .update({
      name: values.name,
      email: values.email,
    })
    .eq("id", id)
    .eq("role", "admin")
    .select("id,email,name,role,active,last_login_at,created_at")
    .maybeSingle();

  if (error) throw error;
  return data ? toAdmin(data as ProfileRow) : undefined;
}

export async function deleteAdminUser(id: string) {
  const supabase = createAdminClient();
  if (!supabase) return undefined;

  const { error } = await supabase.from("profiles").delete().eq("id", id).eq("role", "admin");
  if (error) throw error;
  return true;
}
