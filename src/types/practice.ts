import type { PracticeSlug } from "@/types/content";

export interface PracticeIssue {
  title: string;
  description: string;
}

export interface PracticeProcessStep {
  title: string;
  description: string;
}

export interface PracticeFaqItem {
  question: string;
  answer: string;
}

export interface PracticeArea {
  slug: PracticeSlug;
  order: number;
  title: string;
  englishTitle: string;
  shortDescription: string;
  summary: string;
  heroDescription: string;
  heroImage: string;
  icon: "scale" | "shield" | "family" | "landmark";
  accent: "navy" | "teal" | "gold";
  relatedTags: string[];
  issues: PracticeIssue[];
  process: PracticeProcessStep[];
  documents: string[];
  faq: PracticeFaqItem[];
  seoTitle: string;
  seoDescription: string;
  ctaTitle: string;
  ctaDescription: string;
}
