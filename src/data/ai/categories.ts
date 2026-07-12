import type { AiLegalCategory, AiSubcategory } from "@/types/ai-guide";

export const aiCategoryLabels: Record<AiLegalCategory, string> = {
  civil: "민사",
  criminal: "형사",
  divorce: "이혼·가사",
  inheritance: "상속",
  administrative: "행정",
  unclear: "기타",
};

export const aiSubcategoryLabels: Record<AiSubcategory, string> = {
  debt: "대여금",
  contract: "계약분쟁",
  damages: "손해배상",
  "police-investigation": "경찰조사",
  fraud: "사기",
  dui: "음주운전",
  "property-division": "재산분할",
  custody: "친권·양육권",
  affair: "상간자소송",
  renunciation: "상속포기",
  "limited-acceptance": "한정승인",
  "reserved-share": "유류분",
  "business-suspension": "영업정지",
  "license-cancellation": "면허취소",
  discipline: "징계",
  "administrative-appeal": "행정심판",
  "administrative-lawsuit": "행정소송",
  general: "일반",
};

export const aiCategoryOptions = [
  { value: "civil", label: aiCategoryLabels.civil },
  { value: "criminal", label: aiCategoryLabels.criminal },
  { value: "divorce", label: aiCategoryLabels.divorce },
  { value: "inheritance", label: aiCategoryLabels.inheritance },
  { value: "administrative", label: aiCategoryLabels.administrative },
] as const;

export const aiCategoryToPracticeSlug: Partial<
  Record<Exclude<AiLegalCategory, "unclear">, "civil" | "criminal" | "divorce" | "inheritance">
> = {
  civil: "civil",
  criminal: "criminal",
  divorce: "divorce",
  inheritance: "inheritance",
};

export const aiCategoryBaseTags: Record<Exclude<AiLegalCategory, "unclear">, string[]> = {
  civil: ["civil"],
  criminal: ["criminal"],
  divorce: ["divorce", "family"],
  inheritance: ["inheritance"],
  administrative: ["administrative", "administrative-appeal", "administrative-lawsuit"],
};
