export function BlockedAccess({ ip }: { ip: string }) {
  return (
    <main className="blocked-access-page">
      <section>
        <span>접근 제한</span>
        <h1>현재 접속은 제한되어 있습니다.</h1>
        <p>
          사이트 보안 또는 운영 정책에 따라 이 IP의 공개 페이지 접속이 차단되었습니다. 정상적인
          상담 문의라면 법률사무소 제우로 연락해주세요.
        </p>
        <dl>
          <div>
            <dt>차단된 IP</dt>
            <dd>{ip}</dd>
          </div>
        </dl>
        <a href="tel:043-296-3901">043-296-3901</a>
      </section>
    </main>
  );
}
