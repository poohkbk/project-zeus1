export type CaseCategory = "civil" | "criminal" | "divorce" | "inheritance";

export type CaseAccent = "navy" | "teal" | "gold";

export type CaseSortOption = "latest" | "featured" | "relevance";

export type CasePlacement = "home" | "category" | "practice" | "search";

export interface CaseIssue {
  title: string;
  description: string;
}

export interface CaseResponseStep {
  title: string;
  description: string;
}

export interface CaseVisibilitySettings {
  isFeatured: boolean;
  showOnHome: boolean;
  showOnCategory: boolean;
  showOnPractice: boolean;
  showOnSearch: boolean;
  featuredOrder?: number;
  featuredStartAt?: string;
  featuredEndAt?: string;
  published: boolean;
  publishedAt: string;
  updatedAt?: string;
  createdAt?: string;
  updatedBy?: string;
}

export interface CaseContent {
  id: string;
  slug: string;
  href: string;
  category: CaseCategory;
  categoryLabel: string;
  subcategory: string;
  title: string;
  excerpt: string;
  heroImage?: string;
  accent: CaseAccent;
  tags: string[];
  visibility: CaseVisibilitySettings;
  summary: string;
  reconstructedFacts: string[];
  issues: CaseIssue[];
  response: CaseResponseStep[];
  resultTitle: string;
  resultDescription: string;
  lawyerComment: string;
  seoTitle: string;
  seoDescription: string;
  internalCaseReference?: string;
  internalCourt?: string;
  internalDecisionDate?: string;
  internalDocumentPath?: string;
  internalNotes?: string;
}

export type PublicCaseContent = Omit<
  CaseContent,
  | "internalCaseReference"
  | "internalCourt"
  | "internalDecisionDate"
  | "internalDocumentPath"
  | "internalNotes"
>;

export interface CaseFilterState {
  category: CaseCategory | "all";
  tags: string[];
  q: string;
  sort: CaseSortOption;
}

export interface CaseFilterResult {
  cases: PublicCaseContent[];
  total: number;
  searchRecommendations: PublicCaseContent[];
}
