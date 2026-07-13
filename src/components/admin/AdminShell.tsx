"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";

const navItems = [
  { href: "/admin", label: "첫 화면" },
  { href: "/admin/analytics", label: "접속통계" },
  { href: "/admin/consultations", label: "상담신청" },
  { href: "/admin/cases", label: "승소사례" },
  { href: "/admin/guides", label: "법률가이드" },
  { href: "/admin/faqs", label: "FAQ" },
  { href: "/admin/taxonomy", label: "분야·태그" },
  { href: "/admin/trash", label: "휴지통" },
  { href: "/admin/settings/admins", label: "관리자" },
  { href: "/admin/settings/site", label: "사이트 설정" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  return (
    <main className="admin-app">
      <aside className="admin-sidebar" aria-label="관리자 메뉴">
        <Link href="/admin" className="admin-brand">
          <strong>제우 CMS</strong>
          <span>5분 안에 익히는 관리 화면</span>
        </Link>
        <nav>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <AdminLogoutButton />
        </div>
      </aside>
      <section className="admin-main">{children}</section>
    </main>
  );
}
