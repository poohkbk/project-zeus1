import Link from "next/link";

type PrivacyConsentProps = {
  checked: boolean;
  error?: string;
  onChange: (checked: boolean) => void;
  onBlur: () => void;
};

export function PrivacyConsent({ checked, error, onChange, onBlur }: PrivacyConsentProps) {
  return (
    <section className="privacy-consent" aria-labelledby="privacy-consent-title">
      <div className="privacy-consent-check">
        <input
          id="privacyAgreed"
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          onBlur={onBlur}
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? "privacyAgreed-error" : "privacy-summary"}
        />
        <label id="privacy-consent-title" htmlFor="privacyAgreed">
          [필수] 개인정보 수집·이용에 동의합니다.
        </label>
      </div>

      <div id="privacy-summary" className="privacy-summary">
        <dl>
          <div>
            <dt>수집 항목</dt>
            <dd>이름, 연락처, 사건 분야, 상담 내용</dd>
          </div>
          <div>
            <dt>수집 목적</dt>
            <dd>상담 신청 확인, 상담 일정 안내, 상담 관련 연락</dd>
          </div>
          <div>
            <dt>보유 기간</dt>
            <dd>상담 목적 달성 후 관련 법령 및 내부 정책에 따라 파기</dd>
          </div>
        </dl>
        <Link href="/privacy">개인정보처리방침 확인</Link>
      </div>

      {error ? (
        <p id="privacyAgreed-error" className="consultation-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
