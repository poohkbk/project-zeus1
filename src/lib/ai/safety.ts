import type { AiGuideAnswer } from "@/types/ai-guide";

export interface AiSafetyGuidance {
  flags: string[];
  notices: string[];
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function evaluateSafetyGuidance(initialQuestion: string, answers: AiGuideAnswer[] = []): AiSafetyGuidance {
  const answerText = answers.map((answer) => String(answer.value ?? "")).join(" ");
  const text = `${initialQuestion} ${answerText}`.replace(/\s+/g, " ").toLowerCase();
  const flags: string[] = [];
  const notices: string[] = [];

  if (
    includesAny(text, ["증거인멸", "증거를 없애", "증거 없애", "증거를 삭제", "증거 삭제", "증거를 숨", "증거 숨"])
  ) {
    flags.push("evidence-preservation");
    notices.push(
      "증거를 삭제하거나 숨기는 방법은 안내할 수 없습니다. 관련 자료는 훼손하지 말고 원본 상태로 보존한 뒤 변호사와 상담하세요.",
    );
  }

  if (
    includesAny(text, ["거짓말", "허위진술", "허위 진술", "거짓 진술", "말을 맞추", "진술 조작"])
  ) {
    flags.push("truthful-statement");
    notices.push(
      "경찰 조사에서 거짓말이나 허위진술을 하는 방법은 안내할 수 없습니다. 사실관계를 정리하고, 진술 전 변호사와 상담받을 수 있습니다.",
    );
  }

  if (
    includesAny(text, ["무조건 무죄", "무죄죠", "무죄 맞", "무조건 승소", "무조건 이기", "확실히 무죄"])
  ) {
    flags.push("no-outcome-guarantee");
    notices.push(
      "무죄 여부나 사건 결과는 단정할 수 없습니다. 증거의 내용, 수사기록 전체, 상대방 진술과 절차 진행 상황을 함께 검토해야 합니다.",
    );
  }

  return {
    flags: Array.from(new Set(flags)),
    notices: Array.from(new Set(notices)),
  };
}
