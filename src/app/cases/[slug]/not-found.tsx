import Link from "next/link";

export default function CaseNotFound() {
  return (
    <main className="practice-not-found">
      <div className="site-shell">
        <span className="section-kicker">Not Found</span>
        <h1>승소사례를 찾을 수 없습니다.</h1>
        <p>비공개이거나 존재하지 않는 사례입니다. 전체 승소사례에서 다시 확인해주세요.</p>
        <Link className="btn btn-primary" href="/cases">
          승소사례 전체보기
        </Link>
      </div>
    </main>
  );
}
