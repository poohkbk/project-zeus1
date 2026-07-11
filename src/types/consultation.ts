export type ConsultationCategory = "civil" | "criminal" | "divorce" | "inheritance";

export interface ConsultationFormValues {
  name: string;
  phone: string;
  category: ConsultationCategory | "";
  message: string;
  privacyAgreed: boolean;
}

export interface ConsultationFormErrors {
  name?: string;
  phone?: string;
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

export interface ConsultationCategoryOption {
  value: ConsultationCategory;
  label: string;
  description: string;
  icon: "scale" | "shield" | "family" | "tree";
  accent: "navy" | "teal" | "gold" | "blue";
}
