import type { AiLegalCategory } from "@/types/ai-guide";

export const aiDocumentChecklists: Record<Exclude<AiLegalCategory, "unclear">, string[]> = {
  civil: ["계약서 또는 차용증", "계좌이체 내역", "문자·카카오톡·이메일", "녹취 또는 사진", "내용증명", "상대방 인적사항"],
  criminal: ["출석요구 문자", "고소장 또는 진술서", "사건 경위 정리", "대화 기록", "사진·영상·CCTV", "진단서 또는 합의 관련 자료"],
  divorce: ["혼인관계증명서", "가족관계증명서", "재산 목록", "부동산·예금·보험 자료", "소득 자료", "자녀 양육 관련 자료"],
  inheritance: ["사망진단서 또는 기본증명서", "가족관계증명서", "상속재산 자료", "채무 자료", "유언장 또는 증여 자료", "독촉장·소송서류"],
  administrative: ["행정처분서", "통지서 또는 공문", "처분 사유 자료", "사진·영업자료", "민원 회신", "이의신청·심판 관련 서류"],
};
