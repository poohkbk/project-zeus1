export interface LocalSeoFaq {
  question: string;
  answer: string;
}

export interface LocalSeoPage {
  slug: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  eyebrow: string;
  title: string;
  h1: string;
  description: string;
  shortAnswer: string;
  introduction: string[];
  userSituations: Array<{
    title: string;
    description: string;
  }>;
  keyIssues: Array<{
    title: string;
    description: string;
  }>;
  preparationDocuments: string[];
  processSteps: Array<{
    title: string;
    description: string;
  }>;
  practiceSlug?: "civil" | "criminal" | "divorce" | "inheritance";
  relatedTags: string[];
  faqs: LocalSeoFaq[];
  ctaTitle: string;
  ctaDescription: string;
  canonicalPath: string;
  authorName: string;
  reviewerName?: string;
  publishedAt: string;
  updatedAt: string;
  index: boolean;
}
