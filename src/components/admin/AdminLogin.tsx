"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AdminLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setPending(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setPending(false);

    if (error) {
      setMessage("이메일 또는 비밀번호를 확인해 주세요.");
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <span>LAW OFFICE ZEU CMS</span>
        <h1>관리자 로그인</h1>
        <p>등록된 관리자 계정으로 로그인해야 CMS를 사용할 수 있습니다.</p>
        <form onSubmit={submit}>
          <label>
            이메일
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>
          <label>
            비밀번호
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />
          </label>
          {message ? (
            <p className="admin-login-message" role="alert">
              {message}
            </p>
          ) : null}
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? "확인 중" : "로그인"}
          </button>
        </form>
      </section>
    </main>
  );
}
