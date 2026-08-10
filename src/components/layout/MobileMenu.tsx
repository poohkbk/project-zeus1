"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { siteConfig } from "@/config/site";

const mobileNavItems = [
  { label: "업무분야", href: "/practice" },
  { label: "승소사례", href: siteConfig.links.cases },
  { label: "법률가이드", href: siteConfig.links.legalGuide },
  { label: "FAQ", href: "/faq" },
  { label: "의뢰인 후기", href: "/testimonials" },
  { label: "변호사 소개", href: siteConfig.links.lawyer },
  { label: "오시는 길", href: siteConfig.links.location },
  { label: "상담예약", href: siteConfig.links.consultation },
];

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuId = useId();

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="mobile-menu">
      <button
        type="button"
        className="mobile-menu-toggle"
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        <span />
        <span />
        <span />
      </button>
      {open ? (
        <>
          <button className="mobile-menu-backdrop" type="button" aria-label="메뉴 닫기" onClick={() => setOpen(false)} />
          <nav id={menuId} className="mobile-menu-panel" aria-label="모바일 주요 메뉴">
            <div className="mobile-menu-heading">
              <span>전체 메뉴</span>
              <button type="button" aria-label="메뉴 닫기" onClick={() => setOpen(false)}>×</button>
            </div>
            <div className="mobile-menu-links">
              {mobileNavItems.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}>
                  {item.label}
                  <span aria-hidden="true">›</span>
                </Link>
              ))}
            </div>
            <a className="mobile-menu-call" href={siteConfig.phoneHref}>전화상담 {siteConfig.phone}</a>
          </nav>
        </>
      ) : null}
    </div>
  );
}
