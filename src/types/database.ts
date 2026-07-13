import type { ConsultationCategory } from "@/types/consultation";

export type ContentStatus = "draft" | "published" | "private" | "scheduled" | "trash";

export type CategoryRow = {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type CaseRow = {
  id: string;
  title: string;
  page_address: string | null;
  slug?: string | null;
  category: string;
  summary: string | null;
  body: string | null;
  status: ContentStatus;
  tags: string[];
  hero_image_url: string | null;
  hero_image_alt: string | null;
  is_featured: boolean;
  show_on_home: boolean;
  show_on_category: boolean;
  show_on_practice: boolean;
  show_on_search: boolean;
  featured_order: number | null;
  featured_start_at: string | null;
  featured_end_at: string | null;
  content?: unknown;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type LegalGuideRow = {
  id: string;
  title: string;
  page_address: string | null;
  slug?: string | null;
  category: string;
  summary: string | null;
  body: string | null;
  status: ContentStatus;
  tags: string[];
  hero_image_url: string | null;
  hero_image_alt: string | null;
  is_featured: boolean;
  show_on_home: boolean;
  show_on_search: boolean;
  featured_order: number | null;
  featured_start_at: string | null;
  featured_end_at: string | null;
  content?: unknown;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type FaqRow = {
  id: string;
  question: string;
  answer: string;
  category: string;
  status: ContentStatus;
  tags: string[];
  is_featured: boolean;
  show_on_home: boolean;
  show_on_search: boolean;
  sort_order: number | null;
  content?: unknown;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
};

export type ConsultationInsert = {
  reception_number: string;
  name: string;
  phone: string;
  category: ConsultationCategory;
  message: string;
  privacy_agreed: true;
  source: "direct" | "ai-guide";
  ai_session_id?: string;
  ai_summary?: unknown;
  ai_urgency_level?: string;
  ai_category?: string;
  ai_subcategory?: string;
  ai_transfer_consent?: boolean;
};

export type ConsultationRow = ConsultationInsert & {
  id: string;
  status: "new" | "reviewing" | "contacted" | "closed";
  memo: string;
  created_at: string;
  updated_at: string;
};
