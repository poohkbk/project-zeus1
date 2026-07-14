export type QuickIssue = {
  title: string;
  description: string;
  href: string;
  icon: "money" | "contract" | "home" | "shield" | "family" | "scale" | "tree" | "help";
};

export type PracticeArea = {
  number: string;
  title: string;
  subtitle: string;
  description: string;
  href: string;
  tone: "navy" | "teal" | "gold" | "yellow";
};

export type FeaturedCase = {
  category: string;
  title: string;
  summary: string;
  href: string;
};

export type LegalGuide = {
  category: string;
  title: string;
  summary: string;
  meta: string;
  href: string;
};

export type LawyerHighlight = {
  label: string;
};

export type PracticeSlug = "civil" | "criminal" | "divorce" | "inheritance";

export interface RelatedContentBase {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  href: string;
  category: string;
  tags: string[];
  publishedAt?: string;
  featured?: boolean;
}

export interface CaseContent extends RelatedContentBase {
  resultLabel?: string;
}

export interface LegalGuideContent extends RelatedContentBase {
  readingTime?: string;
  sections?: {
    checkCases: string;
    legalView: string;
    process: string;
    cautions: string;
  };
}
