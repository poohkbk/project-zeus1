export type CmsContentType = "case" | "guide" | "faq";
export type CmsStatus = "draft" | "published" | "private" | "scheduled" | "trash";
export type CmsCategory = "civil" | "criminal" | "divorce" | "inheritance";
export type CmsRole = "super_admin" | "admin";

export interface CmsVisibility {
  isFeatured: boolean;
  showOnHome: boolean;
  showOnCategory: boolean;
  showOnPractice: boolean;
  showOnSearch: boolean;
  featuredOrder?: number;
  featuredStartAt?: string;
  featuredEndAt?: string;
}

export interface CmsContentItem {
  id: string;
  type: CmsContentType;
  title: string;
  summary: string;
  category: CmsCategory;
  status: CmsStatus;
  heroImage?: string;
  heroImageAlt?: string;
  body: string;
  tags: string[];
  visibility: CmsVisibility;
  updatedAt: string;
  updatedBy: string;
}

export interface CmsAdminUser {
  id: string;
  name: string;
  email: string;
  role: CmsRole;
  active: boolean;
  lastLoginAt: string;
  invitedAt?: string;
}

export interface CmsAiSuggestion {
  titles: string[];
  summary: string;
  outline: string[];
  tags: string[];
  warning?: string;
}
