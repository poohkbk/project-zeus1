import type { CmsAiSuggestion, CmsContentType } from "@/types/cms";
import { redactSensitiveData } from "./redact-sensitive-data";

export function createLocalAiSuggestion(type: CmsContentType, text: string): CmsAiSuggestion {
  const { redacted, warnings } = redactSensitiveData(text);
  const topic = redacted.split(/\s+/).filter(Boolean).slice(0, 8).join(" ") || "상담 주제";
  const label = type === "case" ? "승소사례" : type === "guide" ? "법률가이드" : "FAQ";

  return {
    titles: [`${topic} ${label}`, `${topic} 핵심 정리`, `${topic} 상담 전 확인사항`],
    summary: `${topic}에 관한 내용을 쉬운 말로 정리한 초안입니다. 관리자가 검토한 뒤 공개해야 합니다.`,
    outline: ["핵심 쟁점", "준비할 자료", "제우의 검토 방향", "상담 전 확인사항"],
    tags: ["상담", "자료준비", "분쟁해결"],
    warning:
      warnings.length > 0
        ? `AI 초안 전에 ${warnings.join(", ")} 항목을 가렸습니다. 원문을 다시 확인해 주세요.`
        : "AI 기능이 실제 외부 서비스에 연결되지 않아 로컬 추천만 표시합니다.",
  };
}
