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

async function findAuthUserByEmail(email: string) {
  const supabase = createAdminClient();
  if (!supabase) return undefined;

  const normalizedEmail = email.trim().toLowerCase();
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;

    const user = data.users.find((entry) => entry.email?.toLowerCase() === normalizedEmail);
    if (user) return user;
    if (data.users.length < 100) return undefined;
  }

  return undefined;
}

async function createOrUpdateAuthUser(values: { name: string; email: string; password: string }) {
  const supabase = createAdminClient();
  if (!supabase) return undefined;

  const email = values.email.trim().toLowerCase();
  const existingUser = await findAuthUserByEmail(email);
  if (existingUser) {
    const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, {
      email,
      password: values.password,
      email_confirm: true,
      user_metadata: { name: values.name },
    });
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: values.password,
    email_confirm: true,
    user_metadata: { name: values.name },
  });

  if (error) throw error;
  return data.user;
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

export async function createAdminUser(values: { name: string; email: string; password: string }) {
  const supabase = createAdminClient();
  if (!supabase) return undefined;

  const authUser = await createOrUpdateAuthUser(values);

  const { data, error } = await supabase
    .from("profiles")
    .insert({
      name: values.name,
      email: values.email.trim().toLowerCase(),
      role: "admin",
      active: true,
    })
    .select("id,email,name,role,active,last_login_at,created_at")
    .maybeSingle();

  if (error) {
    if (authUser?.id) {
      await supabase.auth.admin.deleteUser(authUser.id).catch(() => undefined);
    }
    throw error;
  }
  return data ? toAdmin(data as ProfileRow) : undefined;
}

export async function updateAdminUser(id: string, values: { name: string; email: string; password?: string }) {
  const supabase = createAdminClient();
  if (!supabase) return undefined;

  const { data: currentProfile, error: currentError } = await supabase
    .from("profiles")
    .select("id,email,name,role,active,last_login_at,created_at")
    .eq("id", id)
    .eq("role", "admin")
    .maybeSingle();

  if (currentError) throw currentError;
  if (!currentProfile) return undefined;

  const currentEmail = String((currentProfile as ProfileRow).email ?? "").trim().toLowerCase();
  const nextEmail = values.email.trim().toLowerCase();
  const authUser = (await findAuthUserByEmail(currentEmail)) ?? (await findAuthUserByEmail(nextEmail));

  if (authUser) {
    const { error: authError } = await supabase.auth.admin.updateUserById(authUser.id, {
      email: nextEmail,
      ...(values.password ? { password: values.password } : {}),
      email_confirm: true,
      user_metadata: { name: values.name },
    });
    if (authError) throw authError;
  } else if (values.password) {
    await createOrUpdateAuthUser({ name: values.name, email: nextEmail, password: values.password });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      name: values.name,
      email: nextEmail,
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

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", id)
    .eq("role", "admin")
    .maybeSingle();

  if (profileError) throw profileError;

  const email = String((profile as { email?: string } | null)?.email ?? "").trim().toLowerCase();
  if (email) {
    const authUser = await findAuthUserByEmail(email);
    if (authUser) {
      const { error: authError } = await supabase.auth.admin.deleteUser(authUser.id);
      if (authError) throw authError;
    }
  }

  const { error } = await supabase.from("profiles").delete().eq("id", id).eq("role", "admin");
  if (error) throw error;
  return true;
}
