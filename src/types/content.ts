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
