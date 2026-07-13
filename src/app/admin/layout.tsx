import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdminPage } from "@/lib/admin/auth";

export const metadata: Metadata = {
  title: "관리자 CMS | 법률사무소 제우",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const headerList = await headers();
  const pathname = headerList.get("x-zeu-pathname") ?? "/admin";
  if (pathname !== "/admin/login") {
    await requireAdminPage();
  }

  return <AdminShell>{children}</AdminShell>;
}
