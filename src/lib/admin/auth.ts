import "server-only";

import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { CmsRole } from "@/types/cms";

export type AdminSession = {
  id: string;
  email: string;
  name: string;
  role: CmsRole;
};

type ProfileRow = {
  id: string;
  email: string;
  name: string;
  role: CmsRole;
  active: boolean;
};

export async function getCurrentAdmin(): Promise<AdminSession | undefined> {
  const supabase = await createClient();
  if (!supabase) return undefined;

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) return undefined;

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,name,role,active")
    .eq("email", user.email)
    .eq("active", true)
    .limit(1)
    .maybeSingle();

  if (error || !data) return undefined;

  const profile = data as ProfileRow;
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
  };
}

export async function requireAdminPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function requireAdminApi() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return {
      admin: undefined,
      response: NextResponse.json({ message: "관리자 로그인이 필요합니다." }, { status: 401 }),
    };
  }

  return { admin, response: undefined };
}
