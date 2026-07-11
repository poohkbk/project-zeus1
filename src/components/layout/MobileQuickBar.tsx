import Link from "next/link";
import { SimpleIcon } from "@/components/icons/SimpleIcon";
import { siteConfig } from "@/config/site";

export function MobileQuickBar() {
  return (
    <nav className="mobile-quick-bar" aria-label="빠른 상담 메뉴">
      <a href={siteConfig.phoneHref} aria-label="전화상담">
        <SimpleIcon name="phone" />
        전화상담
      </a>
      <Link href={siteConfig.links.consultation} aria-label="상담예약">
        <SimpleIcon name="calendar" />
        상담예약
      </Link>
    </nav>
  );
}
