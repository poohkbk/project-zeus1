export default function CasesLoading() {
  return (
    <main className="cases-loading" aria-busy="true" aria-label="승소사례를 불러오는 중">
      <section className="cases-loading-hero">
        <div className="site-shell">
          <span className="loading-line short" />
          <span className="loading-line title" />
          <span className="loading-line copy" />
        </div>
      </section>
      <section className="cases-section">
        <div className="site-shell">
          <div className="cases-loading-controls">
            <span className="loading-line input" />
            <span className="loading-line select" />
          </div>
          <div className="case-results-grid">
            {Array.from({ length: 6 }, (_, index) => (
              <div className="case-loading-card" key={index}>
                <span className="case-loading-media" />
                <div>
                  <span className="loading-line short" />
                  <span className="loading-line heading" />
                  <span className="loading-line copy" />
                  <span className="loading-line copy compact" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
