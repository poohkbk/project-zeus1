import type { AiRedactionResult } from "@/types/ai-guide";

const redactionPatterns = [
  { label: "주민등록번호", pattern: /\b\d{6}-?\d{7}\b/g },
  { label: "전화번호", pattern: /\b01[016789][-\s]?\d{3,4}[-\s]?\d{4}\b/g },
  { label: "이메일", pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
  { label: "카드번호", pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g },
  { label: "사건번호", pattern: /\b\d{4}[가-힣]{1,4}\d{1,8}\b/g },
  { label: "인증번호", pattern: /(인증번호|otp|OTP|비밀번호|패스워드)\s*[:：]?\s*\d{4,8}/g },
  { label: "상세주소", pattern: /([가-힣]+시|[가-힣]+군|[가-힣]+구)\s+[가-힣0-9\s.-]+(로|길)\s*\d+[^\s,]*/g },
];

export function redactSensitiveData(value: string): AiRedactionResult {
  let redacted = value;
  const findings: string[] = [];

  for (const item of redactionPatterns) {
    if (item.pattern.test(redacted)) findings.push(item.label);
    redacted = redacted.replace(item.pattern, `[${item.label} 삭제]`);
  }

  return {
    redacted: redacted.trim(),
    findings: Array.from(new Set(findings)),
  };
}

export function normalizeUserText(value: string) {
  return redactSensitiveData(value).redacted.replace(/\s+/g, " ").trim();
}
