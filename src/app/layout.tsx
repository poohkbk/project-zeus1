import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";
import { BlockedAccess } from "@/components/analytics/BlockedAccess";
import { VisitTracker } from "@/components/analytics/VisitTracker";
import { siteConfig } from "@/config/site";
import { isIpBlocked } from "@/lib/admin/ip-blocklist";

export const metadata: Metadata = {
  title: {
    default: "법률사무소 제우 | 청주 민사·형사·이혼·상속 상담",
    template: "%s | 법률사무소 제우",
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F2D52",
};

const navItems = [
  { label: "업무분야", href: "/practice" },
  { label: "승소사례", href: siteConfig.links.cases },
  { label: "법률가이드", href: siteConfig.links.legalGuide },
  { label: "변호사 소개", href: siteConfig.links.lawyer },
  { label: "상담예약", href: siteConfig.links.consultation },
];

function Header() {
  return (
    <header className="site-header">
      <div className="site-shell header-inner">
        <Link href="/" className="brand" aria-label="법률사무소 제우 홈">
          <span className="brand-logo">
            <Image
              src="/images/brand/zeu-logo.png"
              alt=""
              width={42}
              height={42}
              aria-hidden="true"
            />
          </span>
          <span>
            <strong>{siteConfig.name}</strong>
            <small>LAW OFFICE ZEU</small>
          </span>
        </Link>
        <nav className="desktop-nav" aria-label="주요 메뉴">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <a className="header-call" href={siteConfig.phoneHref}>
          {siteConfig.phone}
        </a>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-shell footer-grid">
        <div>
          <strong>{siteConfig.name}</strong>
          <p>
            의뢰인의 이야기를 충분히 듣고 사건의 쟁점을 세밀하게 검토합니다.
          </p>
        </div>
        <address>
          <span>{siteConfig.address}</span>
          <a href={siteConfig.phoneHref}>{siteConfig.phone}</a>
          <span>Mobile {siteConfig.mobile}</span>
        </address>
      </div>
    </footer>
  );
}

function getClientIp(headerList: Headers) {
  const forwardedFor = headerList.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = headerList.get("x-real-ip")?.trim();
  return forwardedFor || realIp || "local-preview";
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const headerList = await headers();
  const pathname = headerList.get("x-zeu-pathname") ?? "/";
  const ip = getClientIp(headerList);
  const isAdminArea = pathname.startsWith("/admin") || pathname.startsWith("/api");
  const blocked = !isAdminArea && isIpBlocked(ip);

  return (
    <html lang="ko">
      <body>
        {blocked ? (
          <BlockedAccess ip={ip} />
        ) : (
          <>
            <VisitTracker />
            <Header />
            {children}
            <Footer />
          </>
        )}
      </body>
    </html>
  );
}
