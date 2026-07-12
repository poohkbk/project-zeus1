const patterns = [
  { label: "주민등록번호", pattern: /\d{6}-\d{7}/g },
  { label: "휴대전화번호", pattern: /01[016789][-\s]?\d{3,4}[-\s]?\d{4}/g },
  { label: "이메일", pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
  { label: "계좌번호로 보이는 숫자", pattern: /\b\d{2,6}[-\s]\d{2,6}[-\s]\d{2,8}\b/g },
  { label: "사건번호", pattern: /\d{4}[가-힣]{1,4}\d{1,8}/g },
];

export function redactSensitiveData(value: string) {
  const warnings: string[] = [];
  let redacted = value;

  for (const item of patterns) {
    if (item.pattern.test(redacted)) warnings.push(item.label);
    redacted = redacted.replace(item.pattern, `[${item.label} 삭제]`);
  }

  return {
    redacted,
    warnings: Array.from(new Set(warnings)),
  };
}
