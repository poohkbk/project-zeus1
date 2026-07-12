import type { CmsAdminUser, CmsCategory, CmsContentItem, CmsContentType } from "@/types/cms";

export const cmsCategoryLabels: Record<CmsCategory, string> = {
  civil: "민사",
  criminal: "형사",
  divorce: "이혼·가사",
  inheritance: "상속",
  administrative: "행정",
};

export const cmsTypeLabels: Record<CmsContentType, string> = {
  case: "승소사례",
  guide: "법률가이드",
  faq: "FAQ",
};

export const cmsDefaultTags = [
  "대여금",
  "계약",
  "손해배상",
  "경찰조사",
  "구속영장",
  "재산분할",
  "양육권",
  "상간소송",
  "상속재산분할",
  "유류분",
  "상속포기",
  "한정승인",
  "영업정지",
  "행정심판",
  "행정소송",
  "처분취소",
];

export const cmsSeedItems: CmsContentItem[] = [
  {
    id: "case-001",
    type: "case",
    title: "군인연금 재산분할 방어 사례",
    summary: "군인연금과 공동재산의 형성 과정을 나누어 정리한 승소사례입니다.",
    category: "divorce",
    status: "published",
    heroImage: "",
    heroImageAlt: "상담 자료를 검토하는 변호사",
    body: "사건 개요\n상대방이 군인연금의 절반을 요구한 사건입니다.\n\n제우의 대응\n혼인기간, 재산 형성 경위, 장래 수급 가능성을 나누어 정리했습니다.\n\n사건 결과\n의뢰인에게 유리한 재산분할 방향을 이끌었습니다.",
    tags: ["재산분할", "군인연금", "이혼"],
    visibility: {
      isFeatured: true,
      showOnHome: true,
      showOnCategory: true,
      showOnPractice: true,
      showOnSearch: true,
      featuredOrder: 1,
    },
    updatedAt: "2026-07-12T09:00:00+09:00",
    updatedBy: "최고관리자",
  },
  {
    id: "guide-001",
    type: "guide",
    title: "차용증 없이 빌려준 돈을 받을 수 있을까요?",
    summary: "계좌이체 내역과 문자, 통화 기록으로 대여 사실을 정리하는 방법입니다.",
    category: "civil",
    status: "published",
    body: "핵심 요약\n차용증이 없어도 돈을 빌려준 사실을 입증할 자료가 있으면 청구를 검토할 수 있습니다.\n\n준비할 자료\n계좌이체 내역, 문자, 카카오톡, 통화 녹음, 변제 약속 자료를 모아야 합니다.",
    tags: ["대여금", "차용증", "민사"],
    visibility: {
      isFeatured: true,
      showOnHome: true,
      showOnCategory: false,
      showOnPractice: false,
      showOnSearch: true,
      featuredOrder: 2,
    },
    updatedAt: "2026-07-12T09:20:00+09:00",
    updatedBy: "최고관리자",
  },
  {
    id: "faq-001",
    type: "faq",
    title: "상담 전에 어떤 자료를 준비해야 하나요?",
    summary: "계약서, 문자, 판결문, 통지서처럼 사건 흐름을 보여주는 자료를 준비해 주세요.",
    category: "civil",
    status: "draft",
    body: "상담 전에 사건의 흐름을 알 수 있는 자료를 준비하면 상담이 더 정확해집니다. 민감한 개인정보는 필요한 범위에서만 정리해 주세요.",
    tags: ["상담준비", "자료"],
    visibility: {
      isFeatured: false,
      showOnHome: false,
      showOnCategory: false,
      showOnPractice: false,
      showOnSearch: true,
    },
    updatedAt: "2026-07-12T10:00:00+09:00",
    updatedBy: "최고관리자",
  },
];

export const cmsSeedAdmins: CmsAdminUser[] = [
  {
    id: "admin-super",
    name: "최고관리자",
    email: "tglaw-kbk@nate.com",
    role: "super_admin",
    active: true,
    lastLoginAt: "2026-07-12T10:00:00+09:00",
  },
];
