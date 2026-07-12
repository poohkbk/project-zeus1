import type { ConsultationCategory, ConsultationCategoryOption } from "@/types/consultation";

export const consultationCategories: ConsultationCategoryOption[] = [
  {
    value: "civil",
    label: "민사소송",
    description: "대여금, 계약, 손해배상, 부동산, 임대차 등",
    icon: "scale",
    accent: "navy",
  },
  {
    value: "criminal",
    label: "형사소송",
    description: "경찰조사, 고소, 구속, 형사재판, 피해자 대응 등",
    icon: "shield",
    accent: "teal",
  },
  {
    value: "divorce",
    label: "이혼·가사",
    description: "이혼, 재산분할, 위자료, 양육권, 상간소송 등",
    icon: "family",
    accent: "gold",
  },
  {
    value: "inheritance",
    label: "상속",
    description: "상속재산분할, 유류분, 상속포기, 한정승인 등",
    icon: "tree",
    accent: "blue",
  },
  {
    value: "administrative",
    label: "행정",
    description: "영업정지, 행정심판, 행정소송, 처분취소 등",
    icon: "scale",
    accent: "teal",
  },
];

export const consultationCategoryLabels: Record<ConsultationCategory, string> = {
  civil: "민사소송",
  criminal: "형사소송",
  divorce: "이혼·가사",
  inheritance: "상속",
  administrative: "행정",
};
