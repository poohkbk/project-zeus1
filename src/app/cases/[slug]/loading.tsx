export default function CaseDetailLoading() {
  return (
    <main className="case-detail-loading" aria-label="승소사례를 불러오는 중">
      <section className="case-detail-hero">
        <div className="site-shell case-detail-hero-grid">
          <div>
            <div className="case-loading-line short" />
            <div className="case-loading-title" />
            <div className="case-loading-line" />
            <div className="case-loading-line medium" />
          </div>
          <div className="case-loading-visual" />
        </div>
      </section>
      <section className="case-detail-section">
        <div className="site-shell case-readable">
          <div className="case-loading-line short" />
          <div className="case-loading-heading" />
          <div className="case-loading-line" />
          <div className="case-loading-line" />
          <div className="case-loading-line medium" />
        </div>
      </section>
    </main>
  );
}
