import type { AiGuideAnswer, AiLegalCategory, AiUrgencyLevel } from "@/types/ai-guide";
import { getAnswerMap } from "./question-engine";

const dayMs = 24 * 60 * 60 * 1000;

function daysUntil(value: unknown, now = new Date()) {
  if (typeof value !== "string" || !value) return undefined;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return undefined;
  return Math.ceil((target.getTime() - now.getTime()) / dayMs);
}

function maxUrgency(a: AiUrgencyLevel, b: AiUrgencyLevel): AiUrgencyLevel {
  const order: AiUrgencyLevel[] = ["normal", "attention", "urgent", "emergency"];
  return order.indexOf(b) > order.indexOf(a) ? b : a;
}

export function evaluateUrgency(category: AiLegalCategory, answers: AiGuideAnswer[], initialQuestion = "", now = new Date()) {
  const answerMap = getAnswerMap(answers);
  const reasons: string[] = [];
  let level: AiUrgencyLevel = "normal";
  const lower = initialQuestion.toLowerCase();

  const emergencyWords = ["구속", "체포", "압수수색", "오늘 조사", "오늘 공판", "접근금지", "가정폭력", "아동학대"];
  if (emergencyWords.some((word) => lower.includes(word)) || answerMap.get("detained") === "yes") {
    level = "emergency";
    reasons.push("즉시 대응이 필요한 표현 또는 상황이 확인되었습니다.");
  }

  const attendanceDays = daysUntil(answerMap.get("attendanceDate"), now);
  if (attendanceDays !== undefined && attendanceDays <= 3) {
    level = maxUrgency(level, attendanceDays <= 0 ? "emergency" : "urgent");
    reasons.push("조사일 또는 출석일이 임박했습니다.");
  }

  const noticeDays = daysUntil(answerMap.get("noticeReceivedDate"), now);
  if (category === "administrative" && noticeDays !== undefined) {
    level = maxUrgency(level, "urgent");
    reasons.push("행정처분은 통지일과 제기기간 확인이 중요합니다.");
  }

  const enforcementDays = daysUntil(answerMap.get("enforcementDate"), now);
  if (category === "administrative" && enforcementDays !== undefined && enforcementDays <= 7) {
    level = maxUrgency(level, "urgent");
    reasons.push("행정처분 효력 발생일이 가까울 수 있습니다.");
  }

  const deceasedDays = daysUntil(answerMap.get("deceasedDate"), now);
  if (category === "inheritance" && deceasedDays !== undefined && Math.abs(deceasedDays) >= 60) {
    level = maxUrgency(level, "attention");
    reasons.push("상속포기·한정승인은 기간 확인이 필요합니다.");
  }

  if (answerMap.get("courtDocumentReceived") === "yes" || answerMap.get("noticeReceived") === "yes") {
    level = maxUrgency(level, "attention");
    reasons.push("받은 서류의 날짜와 기한을 확인해야 합니다.");
  }

  return {
    level,
    reasons: reasons.length > 0 ? reasons : ["일반적인 정보 확인 단계로 보입니다."],
    callFirst: level === "urgent" || level === "emergency",
  };
}
