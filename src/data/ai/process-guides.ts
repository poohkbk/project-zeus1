import type { AiLegalCategory } from "@/types/ai-guide";

export const aiProcessGuides: Record<
  Exclude<AiLegalCategory, "unclear">,
  Array<{ title: string; description: string }>
> = {
  civil: [
    { title: "상담", description: "계약, 돈의 흐름, 대화 기록을 기준으로 쟁점을 정리합니다." },
    { title: "자료검토", description: "청구 가능성과 방어 포인트, 소멸시효와 집행 가능성을 확인합니다." },
    { title: "내용증명·소송", description: "필요하면 내용증명, 지급명령, 소송 등 절차를 선택합니다." },
    { title: "판결·집행", description: "결과 이후 실제 회수 가능성까지 함께 검토합니다." },
  ],
  criminal: [
    { title: "상담", description: "혐의, 지위, 조사일, 받은 서류를 먼저 확인합니다." },
    { title: "조사 준비", description: "진술 방향과 제출할 자료를 정리합니다." },
    { title: "수사 대응", description: "경찰·검찰 단계에서 필요한 의견과 자료를 준비합니다." },
    { title: "재판 대응", description: "기소된 경우 양형자료와 사실관계 자료를 정리합니다." },
  ],
  divorce: [
    { title: "상담", description: "혼인기간, 자녀, 재산, 이혼 사유를 구분해 확인합니다." },
    { title: "자료정리", description: "재산과 소득, 양육 환경, 부정행위 자료를 분리합니다." },
    { title: "협의·조정", description: "합의 가능성과 조정 방향을 검토합니다." },
    { title: "소송", description: "합의가 어렵다면 재판상 이혼과 관련 청구를 준비합니다." },
  ],
  inheritance: [
    { title: "상속관계 확인", description: "상속인과 사망일, 법정 기간을 먼저 확인합니다." },
    { title: "재산·채무 조사", description: "부동산, 예금, 보험, 채무를 나누어 정리합니다." },
    { title: "절차 선택", description: "상속포기, 한정승인, 분할협의, 유류분 청구 가능성을 검토합니다." },
    { title: "신청·소송", description: "필요한 법원 절차 또는 협의를 진행합니다." },
  ],
  administrative: [
    { title: "처분 확인", description: "처분서, 통지일, 효력 발생일을 구분해 확인합니다." },
    { title: "기한 검토", description: "행정심판이나 행정소송 제기기간을 신속히 검토합니다." },
    { title: "자료정리", description: "처분 사유와 반박 자료, 영업 또는 면허 영향 자료를 정리합니다." },
    { title: "불복 절차", description: "이의신청, 행정심판, 행정소송 중 적절한 절차를 검토합니다." },
  ],
};
