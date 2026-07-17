"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function clearBrowserAuthCache() {
  if (typeof window === "undefined") return;

  Object.keys(window.localStorage)
    .filter((key) => key.includes("supabase") || key.startsWith("sb-"))
    .forEach((key) => window.localStorage.removeItem(key));

  document.cookie
    .split(";")
    .map((cookie) => cookie.split("=")[0]?.trim())
    .filter((name) => name?.startsWith("sb-"))
    .forEach((name) => {
      document.cookie = `${name}=; Max-Age=0; path=/`;
    });
}

export function AdminLogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [offlineNotice, setOfflineNotice] = useState(false);

  const logout = useCallback(async (reason: "manual" | "offline" = "manual") => {
    if (pending) return;
    setPending(true);

    if (reason === "offline") {
      setOfflineNotice(true);
    }

    try {
      const supabase = createClient();
      await supabase.auth.signOut({ scope: reason === "offline" ? "local" : "global" });
    } catch {
      // If the browser is offline, local cache cleanup still protects the admin screen.
    }

    clearBrowserAuthCache();

    if (reason === "manual" && navigator.onLine) {
      await fetch("/api/admin/logout", { method: "POST" }).catch(() => undefined);
    }

    router.replace("/admin/login");
    router.refresh();
  }, [pending, router]);

  useEffect(() => {
    function handleOffline() {
      void logout("offline");
    }

    window.addEventListener("offline", handleOffline);
    return () => window.removeEventListener("offline", handleOffline);
  }, [logout]);

  return (
    <div className={compact ? "admin-logout-wrap compact" : "admin-logout-wrap"}>
      {offlineNotice ? <span role="status">연결이 끊겨 자동 로그아웃합니다.</span> : null}
      <button type="button" onClick={() => logout("manual")} disabled={pending}>
        {pending ? "로그아웃 중" : "로그아웃"}
      </button>
    </div>
  );
}
