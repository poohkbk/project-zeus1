const legalGuideCategoryLabels: Record<string, string> = {
  civil: "민사",
  criminal: "형사",
  divorce: "이혼·가사",
  family: "이혼·가사",
  inheritance: "상속",
  administrative: "행정",
  admin: "행정",
  "민사": "민사",
  "형사": "형사",
  "이혼": "이혼·가사",
  "이혼·가사": "이혼·가사",
  "가사이혼": "이혼·가사",
  "상속": "상속",
  "행정": "행정",
};

export function getLegalGuideCategoryLabel(category?: string | null) {
  if (!category) return "법률가이드";
  const normalized = category.trim();
  return legalGuideCategoryLabels[normalized] ?? normalized;
}
