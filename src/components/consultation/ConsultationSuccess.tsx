import Link from "next/link";
import { siteConfig } from "@/config/site";
import { SimpleIcon } from "@/components/icons/SimpleIcon";

type ConsultationSuccessProps = {
  receptionNumber: string;
  onReset: () => void;
};

export function ConsultationSuccess({ receptionNumber, onReset }: ConsultationSuccessProps) {
  return (
    <section className="consultation-success" aria-live="polite" aria-labelledby="success-title">
      <span className="consultation-success-icon">
        <SimpleIcon name="check" />
      </span>
      <h2 id="success-title">상담신청이 접수되었습니다.</h2>
      <p>
        담당자가 내용을 확인한 뒤 입력하신 연락처로 연락드리겠습니다.
      </p>
      <strong>접수번호: {receptionNumber}</strong>
      <p className="consultation-success-note">
        긴급한 사건이거나 수사기관 출석, 법원 제출기한 등이 임박한 경우 대표전화로
        바로 연락해 주세요.
      </p>
      <div className="consultation-success-actions">
        <a className="btn btn-accent" href={siteConfig.phoneHref}>
          <SimpleIcon name="phone" />
          전화하기
        </a>
        <Link className="btn btn-light" href="/">
          홈으로 이동
        </Link>
        <button type="button" className="btn btn-outline" onClick={onReset}>
          다른 상담 작성
        </button>
      </div>
    </section>
  );
}
