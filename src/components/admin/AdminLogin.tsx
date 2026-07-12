import Link from "next/link";

export function AdminLogin() {
  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <span>LAW OFFICE ZEU CMS</span>
        <h1>관리자 로그인</h1>
        <p>
          실제 운영에서는 Supabase Auth로 로그인합니다. 현재 화면은 관리 흐름 확인용
          미리보기입니다.
        </p>
        <label>
          이메일
          <input type="email" value="tglaw-kbk@nate.com" readOnly />
        </label>
        <label>
          비밀번호
          <input type="password" value="preview-only" readOnly />
        </label>
        <Link className="btn btn-primary" href="/admin">
          CMS 둘러보기
        </Link>
      </section>
    </main>
  );
}
