"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;

    const payload = JSON.stringify({ path: pathname });
    const sendVisit = () => {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/analytics/visit", new Blob([payload], { type: "application/json" }));
        return;
      }

      void fetch("/api/analytics/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => undefined);
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(sendVisit, { timeout: 3000 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = globalThis.setTimeout(sendVisit, 1200);
    return () => globalThis.clearTimeout(timeoutId);
  }, [pathname]);

  return null;
}
