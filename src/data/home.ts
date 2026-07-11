import type {
  FeaturedCase,
  LawyerHighlight,
  LegalGuide,
  PracticeArea,
  QuickIssue,
} from "@/types/content";

export const quickIssues: QuickIssue[] = [
  {
    title: "돈을 받지 못했습니다",
    description: "대여금, 미수금, 손해배상 문제를 확인합니다.",
    href: "/practice/civil",
    icon: "money",
  },
  {
    title: "계약 문제로 분쟁 중입니다",
    description: "계약서, 합의 내용, 이행 여부를 검토합니다.",
    href: "/practice/civil",
    icon: "contract",
  },
  {
    title: "부동산 문제가 생겼습니다",
    description: "매매, 임대차, 권리관계 분쟁을 살핍니다.",
    href: "/practice/civil",
    icon: "home",
  },
  {
    title: "경찰 연락을 받았습니다",
    description: "조사 전 준비와 진술 방향을 정리합니다.",
    href: "/practice/criminal",
    icon: "shield",
  },
  {
    title: "이혼을 고민하고 있습니다",
    description: "이혼 절차와 필요한 자료를 확인합니다.",
    href: "/practice/divorce",
    icon: "family",
  },
  {
    title: "재산분할이 걱정됩니다",
    description: "혼인 중 형성된 재산과 기여도를 검토합니다.",
    href: "/practice/divorce",
    icon: "scale",
  },
  {
    title: "상속 문제로 다투고 있습니다",
    description: "상속재산, 유류분, 포기 절차를 점검합니다.",
    href: "/practice/inheritance",
    icon: "tree",
  },
  {
    title: "어떤 분야인지 모르겠습니다",
    description: "간단한 질문으로 상담 방향을 찾아봅니다.",
    href: "/tools/ai-guide",
    icon: "help",
  },
];

export const practiceAreas: PracticeArea[] = [
  {
    number: "01",
    title: "민사소송",
    subtitle: "Civil Litigation",
    description: "대여금, 손해배상, 계약, 부동산",
    href: "/practice/civil",
    tone: "navy",
  },
  {
    number: "02",
    title: "형사소송",
    subtitle: "Criminal Defense",
    description: "경찰조사, 구속, 재판, 피해자 대응",
    href: "/practice/criminal",
    tone: "teal",
  },
  {
    number: "03",
    title: "이혼·가사",
    subtitle: "Divorce & Family",
    description: "이혼, 재산분할, 양육권, 위자료",
    href: "/practice/divorce",
    tone: "gold",
  },
  {
    number: "04",
    title: "상속",
    subtitle: "Inheritance",
    description: "상속재산분할, 유류분, 상속포기, 한정승인",
    href: "/practice/inheritance",
    tone: "yellow",
  },
];

export const featuredCases: FeaturedCase[] = [
  {
    category: "이혼·가사",
    title: "군인연금 50%를 요구받았지만 유리한 재산분할 결과를 얻은 사례",
    summary: "연금의 성격과 혼인 기간의 기여도를 중심으로 재산분할 쟁점을 정리했습니다.",
    href: "/cases",
  },
  {
    category: "민사",
    title: "계약 내용과 실제 합의가 달랐던 매매대금 분쟁 대응 사례",
    summary: "계약서와 대화 기록을 함께 검토해 실제 합의 내용을 다투었습니다.",
    href: "/cases",
  },
  {
    category: "이혼·가사",
    title: "혼인신고가 없었지만 사실혼과 재산분할을 인정받은 사례",
    summary: "공동생활 자료와 경제적 기여를 통해 사실혼 관계의 쟁점을 정리했습니다.",
    href: "/cases",
  },
  {
    category: "민사",
    title: "금전 지급 경위와 자료를 입증해 대여금 청구에 대응한 사례",
    summary: "입금 내역과 당사자 사이의 관계를 바탕으로 금전의 성격을 검토했습니다.",
    href: "/cases",
  },
  {
    category: "상속",
    title: "각서와 확인서의 효력을 입증한 상속분쟁 사례",
    summary: "문서 작성 경위와 당사자의 의사를 중심으로 상속분쟁의 핵심을 정리했습니다.",
    href: "/cases",
  },
  {
    category: "형사",
    title: "검사의 구형보다 낮은 형을 선고받은 형사사건 대응 사례",
    summary: "사실관계, 양형자료, 피해 회복 노력을 종합해 재판 대응 방향을 세웠습니다.",
    href: "/cases",
  },
];

export const legalGuides: LegalGuide[] = [
  {
    category: "민사",
    title: "차용증 없이 빌려준 돈도 받을 수 있을까요?",
    summary: "차용증이 없어도 송금 내역, 대화 기록, 변제 약속 등으로 입증을 준비할 수 있습니다.",
    meta: "읽는 시간 4분",
    href: "/legal-guide",
  },
  {
    category: "형사",
    title: "경찰 출석요구를 받았을 때 먼저 해야 할 일",
    summary: "조사 일정, 혐의 내용, 보유 자료를 확인하고 진술 방향을 신중히 정해야 합니다.",
    meta: "읽는 시간 5분",
    href: "/legal-guide",
  },
  {
    category: "이혼",
    title: "이혼 재산분할은 무조건 절반씩 나누나요?",
    summary: "재산분할은 재산 형성 과정, 혼인 기간, 기여도 등을 종합해 판단됩니다.",
    meta: "읽는 시간 4분",
    href: "/legal-guide",
  },
  {
    category: "상속",
    title: "상속포기와 한정승인은 어떻게 다른가요?",
    summary: "채무가 많은 상속에서는 기간과 절차를 놓치지 않는 것이 중요합니다.",
    meta: "읽는 시간 5분",
    href: "/legal-guide",
  },
];

export const lawyerHighlights: LawyerHighlight[] = [
  { label: "제1회 변호사시험 합격" },
  { label: "대한변호사협회 등록 이혼전문변호사" },
  { label: "대한변호사협회 등록 형사법 전문변호사" },
  { label: "세무사 자격" },
  { label: "충청북도·청주시 무료법률상담 활동" },
  { label: "충북지방변호사회 공로상" },
  { label: "청주지방법원 국선변호인 감사장" },
];
