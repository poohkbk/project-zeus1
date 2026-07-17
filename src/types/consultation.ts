export type ConsultationCategory = "civil" | "criminal" | "divorce" | "inheritance" | "administrative";
export type ConsultationSubmissionStatus = "new" | "reviewing" | "contacted" | "closed";

export interface ConsultationFormValues {
  name: string;
  phone: string;
  preferredDate: string;
  preferredTime: string;
  category: ConsultationCategory | "";
  message: string;
  privacyAgreed: boolean;
  source?: "direct" | "ai-guide";
  aiTransferToken?: string;
  aiSummary?: {
    category?: string;
    categoryLabel: string;
    subcategory?: string;
    subcategoryLabel?: string;
    situationSummary: string;
    confirmedFacts: string[];
    availableEvidence: string[];
    missingInformation: string[];
    keyIssues: string[];
    urgencyLevel: string;
    urgencyReasons: string[];
    generatedAt: string;
  };
}

export interface ConsultationFormErrors {
  name?: string;
  phone?: string;
  preferredDate?: string;
  preferredTime?: string;
  category?: string;
  message?: string;
  privacyAgreed?: string;
  submit?: string;
}

export interface ConsultationSubmissionResult {
  success: boolean;
  receptionNumber?: string;
  errorMessage?: string;
}

export interface ConsultationSubmission {
  id: string;
  receptionNumber: string;
  name: string;
  phone: string;
  preferredDate: string;
  preferredTime: string;
  category: ConsultationCategory;
  categoryLabel: string;
  message: string;
  privacyAgreed: true;
  source: "direct" | "ai-guide";
  aiTransferToken?: string;
  aiSummary?: ConsultationFormValues["aiSummary"];
  status: ConsultationSubmissionStatus;
  memo: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationCategoryOption {
  value: ConsultationCategory;
  label: string;
  description: string;
  icon: "scale" | "shield" | "family" | "tree";
  accent: "navy" | "teal" | "gold" | "blue";
}
