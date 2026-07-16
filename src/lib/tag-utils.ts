const koreanTagCollator = new Intl.Collator("ko-KR", {
  numeric: true,
  sensitivity: "base",
});

export function normalizeTagList(tags: string[]) {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
}

export function sortKoreanTags(tags: string[]) {
  return normalizeTagList(tags).sort((a, b) => koreanTagCollator.compare(a, b));
}
