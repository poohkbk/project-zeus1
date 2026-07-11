import { SimpleIcon } from "@/components/icons/SimpleIcon";

const steps = [
  {
    number: "01",
    title: "상담내용 작성",
    description: "현재 상황과 궁금한 점을 가능한 범위에서 적어주세요.",
  },
  {
    number: "02",
    title: "담당자 확인",
    description: "사건 분야와 긴급도를 확인한 뒤 연락 순서를 정합니다.",
  },
  {
    number: "03",
    title: "전화 또는 방문상담 안내",
    description: "입력하신 연락처로 상담 방법과 일정을 안내드립니다.",
  },
];

export function ConsultationNotice() {
  return (
    <section className="consultation-notice" aria-labelledby="consultation-notice-title">
      <div className="consultation-section-heading">
        <span className="section-kicker">Process</span>
        <h2 id="consultation-notice-title">상담 절차 안내</h2>
      </div>
      <div className="consultation-step-grid">
        {steps.map((step) => (
          <article key={step.number}>
            <span>{step.number}</span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
            <SimpleIcon name="arrow" />
          </article>
        ))}
      </div>
    </section>
  );
}
