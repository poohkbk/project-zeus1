import Link from "next/link";

export default function PracticeNotFound() {
  return (
    <main className="practice-not-found">
      <div className="site-shell">
        <span className="section-kicker">Not Found</span>
        <h1>업무분야를 찾을 수 없습니다.</h1>
        <p>요청하신 업무분야가 존재하지 않습니다. 전체 업무분야에서 다시 선택해주세요.</p>
        <Link className="btn btn-primary" href="/practice">
          업무분야 전체보기
        </Link>
      </div>
    </main>
  );
}
