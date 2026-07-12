"use client";

import { consultationCategoryLabels } from "@/data/consultation";
import type {
  ConsultationCategory,
  ConsultationFormValues,
  ConsultationSubmission,
  ConsultationSubmissionStatus,
} from "@/types/consultation";

const SUBMISSIONS_KEY = "zeu-consultation-submissions-v1";

function readSubmissions() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(SUBMISSIONS_KEY);
    return raw ? (JSON.parse(raw) as ConsultationSubmission[]) : [];
  } catch {
    return [];
  }
}

function writeSubmissions(submissions: ConsultationSubmission[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(submissions));
}

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function cleanPhone(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function loadConsultationSubmissions() {
  return readSubmissions().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveConsultationSubmission(
  values: ConsultationFormValues,
  receptionNumber: string,
) {
  const now = new Date().toISOString();
  const category = values.category as ConsultationCategory;
  const submission: ConsultationSubmission = {
    id: `consultation-${Date.now()}`,
    receptionNumber,
    name: cleanText(values.name),
    phone: cleanPhone(values.phone),
    category,
    categoryLabel: consultationCategoryLabels[category],
    message: cleanText(values.message),
    privacyAgreed: true,
    source: values.source ?? "direct",
    aiTransferToken: values.aiTransferToken,
    aiSummary: values.aiSummary,
    status: "new",
    memo: "",
    createdAt: now,
    updatedAt: now,
  };

  writeSubmissions([submission, ...readSubmissions()]);
  return submission;
}

export function updateConsultationSubmission(
  id: string,
  updates: Partial<Pick<ConsultationSubmission, "memo" | "status">>,
) {
  const nextSubmissions = readSubmissions().map((submission) =>
    submission.id === id
      ? {
          ...submission,
          ...updates,
          updatedAt: new Date().toISOString(),
        }
      : submission,
  );
  writeSubmissions(nextSubmissions);
  return nextSubmissions;
}

export function getConsultationStatusLabel(status: ConsultationSubmissionStatus) {
  return {
    new: "새 상담",
    reviewing: "검토 중",
    contacted: "연락 완료",
    closed: "종결",
  }[status];
}
