import type { AiLegalCategory, AiSubcategory } from "@/types/ai-guide";

export interface AiKeywordRule {
  category: Exclude<AiLegalCategory, "unclear">;
  subcategory: AiSubcategory;
  tags: string[];
  keywords: string[];
  reason: string;
}

export const aiKeywordRules: AiKeywordRule[] = [
  {
    category: "civil",
    subcategory: "debt",
    tags: ["civil", "debt", "loan", "evidence"],
    keywords: ["돈", "빌려", "대여금", "차용증", "계좌이체", "못 받고", "안 갚"],
    reason: "돈을 빌려주거나 돌려받지 못한 내용이 포함되어 있습니다.",
  },
  {
    category: "civil",
    subcategory: "contract",
    tags: ["civil", "contract", "payment"],
    keywords: ["계약", "해제", "위약금", "매매", "대금", "납품"],
    reason: "계약 이행이나 대금 분쟁으로 볼 수 있는 표현이 포함되어 있습니다.",
  },
  {
    category: "civil",
    subcategory: "damages",
    tags: ["civil", "damages", "evidence"],
    keywords: ["손해배상", "피해", "파손", "하자", "배상"],
    reason: "손해 발생과 배상 문제가 포함되어 있습니다.",
  },
  {
    category: "criminal",
    subcategory: "police-investigation",
    tags: ["criminal", "police-investigation"],
    keywords: ["경찰", "조사", "출석", "고소", "피의자", "피해자", "검찰"],
    reason: "수사기관 조사나 고소 관련 표현이 포함되어 있습니다.",
  },
  {
    category: "criminal",
    subcategory: "fraud",
    tags: ["criminal", "fraud", "police-investigation"],
    keywords: ["사기", "기망", "고소당", "고소했"],
    reason: "사기 또는 형사 고소와 관련된 표현이 포함되어 있습니다.",
  },
  {
    category: "criminal",
    subcategory: "dui",
    tags: ["criminal", "dui"],
    keywords: ["음주운전", "혈중알코올", "면허정지", "면허취소"],
    reason: "음주운전 또는 면허 관련 형사 절차 표현이 포함되어 있습니다.",
  },
  {
    category: "divorce",
    subcategory: "property-division",
    tags: ["divorce", "property-division", "family"],
    keywords: ["이혼", "재산분할", "위자료", "혼인", "별거", "연금"],
    reason: "이혼과 재산 또는 위자료 문제가 포함되어 있습니다.",
  },
  {
    category: "divorce",
    subcategory: "custody",
    tags: ["divorce", "custody", "child-support", "family"],
    keywords: ["양육권", "친권", "양육비", "미성년", "자녀"],
    reason: "자녀와 양육 관련 표현이 포함되어 있습니다.",
  },
  {
    category: "divorce",
    subcategory: "affair",
    tags: ["divorce", "affair", "damages"],
    keywords: ["외도", "상간", "불륜", "부정행위"],
    reason: "부정행위 또는 상간자 손해배상 관련 표현이 포함되어 있습니다.",
  },
  {
    category: "inheritance",
    subcategory: "renunciation",
    tags: ["inheritance", "renunciation", "inheritance-debt"],
    keywords: ["상속포기", "돌아가", "사망", "빚", "채무", "상속인"],
    reason: "사망 이후 상속과 채무 문제가 포함되어 있습니다.",
  },
  {
    category: "inheritance",
    subcategory: "limited-acceptance",
    tags: ["inheritance", "limited-acceptance", "inheritance-debt"],
    keywords: ["한정승인", "상속채무", "재산보다 빚"],
    reason: "상속채무와 한정승인 관련 표현이 포함되어 있습니다.",
  },
  {
    category: "inheritance",
    subcategory: "reserved-share",
    tags: ["inheritance", "reserved-share", "special-benefit"],
    keywords: ["유류분", "증여", "유언", "상속재산"],
    reason: "유류분 또는 상속재산 분쟁 표현이 포함되어 있습니다.",
  },
  {
    category: "administrative",
    subcategory: "business-suspension",
    tags: ["administrative", "business-suspension", "administrative-appeal"],
    keywords: ["영업정지", "과징금", "처분서", "식당", "업소"],
    reason: "영업정지 또는 행정처분 관련 표현이 포함되어 있습니다.",
  },
  {
    category: "administrative",
    subcategory: "license-cancellation",
    tags: ["administrative", "license-cancellation", "administrative-appeal"],
    keywords: ["면허취소", "면허정지", "운전면허", "자격정지"],
    reason: "면허취소 또는 면허정지 관련 표현이 포함되어 있습니다.",
  },
  {
    category: "administrative",
    subcategory: "discipline",
    tags: ["administrative", "discipline"],
    keywords: ["징계", "공무원", "감봉", "정직", "해임"],
    reason: "징계 처분 관련 표현이 포함되어 있습니다.",
  },
  {
    category: "administrative",
    subcategory: "administrative-lawsuit",
    tags: ["administrative", "administrative-lawsuit", "administrative-appeal"],
    keywords: ["행정소송", "행정심판", "처분취소", "취소소송", "이의신청"],
    reason: "행정심판 또는 행정소송 관련 표현이 포함되어 있습니다.",
  },
];
