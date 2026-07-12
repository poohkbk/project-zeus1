export type AiLegalCategory =
  | "civil"
  | "criminal"
  | "divorce"
  | "inheritance"
  | "administrative"
  | "unclear";

export type AiSubcategory =
  | "debt"
  | "contract"
  | "damages"
  | "police-investigation"
  | "fraud"
  | "dui"
  | "property-division"
  | "custody"
  | "affair"
  | "renunciation"
  | "limited-acceptance"
  | "reserved-share"
  | "business-suspension"
  | "license-cancellation"
  | "discipline"
  | "administrative-appeal"
  | "administrative-lawsuit"
  | "general";

export type AiUrgencyLevel = "normal" | "attention" | "urgent" | "emergency";

export type AiQuestionType =
  | "single_choice"
  | "multiple_choice"
  | "date"
  | "number"
  | "short_text"
  | "long_text"
  | "boolean";

export interface AiQuestionOption {
  value: string;
  label: string;
  description?: string;
}

export interface AiGuideQuestion {
  id: string;
  category: Exclude<AiLegalCategory, "unclear">;
  subcategory?: AiSubcategory;
  order: number;
  field: string;
  type: AiQuestionType;
  question: string;
  helpText?: string;
  required: boolean;
  options?: AiQuestionOption[];
  showWhen?: {
    field: string;
    operator: "equals" | "not_equals" | "includes";
    value: string | boolean | number;
  };
}

export interface AiGuideAnswer {
  questionId: string;
  field: string;
  value: string | string[] | number | boolean | null;
  answeredAt: string;
}

export interface AiClassificationResult {
  category: AiLegalCategory;
  categoryLabel: string;
  subcategory?: AiSubcategory;
  subcategoryLabel?: string;
  confidence: number;
  alternativeCategories: Array<{
    category: AiLegalCategory;
    confidence: number;
  }>;
  matchedTags: string[];
  reasonSummary: string;
  requiresConfirmation: boolean;
}

export type AiContentType = "practice" | "case" | "guide" | "faq";

export interface AiRelatedContent {
  id: string;
  type: AiContentType;
  slug: string;
  href: string;
  title: string;
  excerpt?: string;
  category: string;
  tags: string[];
  matchScore: number;
  matchedTags: string[];
}

export interface AiConsultationSummary {
  category: AiLegalCategory;
  categoryLabel: string;
  subcategory?: AiSubcategory;
  subcategoryLabel?: string;
  userQuestion: string;
  situationSummary: string;
  confirmedFacts: string[];
  availableEvidence: string[];
  missingInformation: string[];
  keyIssues: string[];
  urgencyLevel: AiUrgencyLevel;
  urgencyReasons: string[];
  relatedContentIds: string[];
  generatedAt: string;
}

export interface AiGuideResult {
  sessionId: string;
  classification: AiClassificationResult;
  urgency: {
    level: AiUrgencyLevel;
    reasons: string[];
    callFirst: boolean;
  };
  situationSummary: string;
  confirmedFacts: string[];
  missingInformation: string[];
  recommendedDocuments: string[];
  generalProcess: Array<{
    title: string;
    description: string;
  }>;
  relatedContent: {
    practices: AiRelatedContent[];
    cases: AiRelatedContent[];
    guides: AiRelatedContent[];
    faqs: AiRelatedContent[];
  };
  consultationSummary: AiConsultationSummary;
  safetyWarnings: string[];
  safetyNotice: string;
  generatedBy: "rule" | "ai" | "hybrid";
}

export type AiGuideUiState =
  | "start"
  | "classifying"
  | "confirming_category"
  | "questioning"
  | "analyzing"
  | "completed"
  | "urgent"
  | "rate_limited"
  | "failed"
  | "transferring";

export interface AiGuideSessionRecord {
  id: string;
  publicToken: string;
  status: "started" | "questioning" | "completed" | "abandoned" | "transferred";
  initialQuestionRedacted: string;
  classification: AiClassificationResult;
  answers: AiGuideAnswer[];
  result?: AiGuideResult;
  transferToken?: string;
  consentToTransfer: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface AiRedactionResult {
  redacted: string;
  findings: string[];
}
