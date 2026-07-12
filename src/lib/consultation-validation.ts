import { consultationCategories } from "@/data/consultation";
import type {
  ConsultationCategory,
  ConsultationFormErrors,
  ConsultationFormValues,
  ConsultationSubmissionResult,
} from "@/types/consultation";
import { saveConsultationSubmission } from "./consultation-submissions";

const categoryValues = new Set<string>(consultationCategories.map((category) => category.value));

export function trimAndNormalizeSpaces(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizePhoneDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 11);
}

export function formatKoreanMobilePhone(value: string) {
  const digits = normalizePhoneDigits(value);

  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function validateConsultationName(value: string) {
  const normalized = trimAndNormalizeSpaces(value);

  if (!normalized) return "이름을 입력해 주세요.";
  if (normalized.length < 2) return "이름은 2자 이상 입력해 주세요.";
  if (normalized.length > 30) return "이름은 30자 이하로 입력해 주세요.";
  if (/^\d+$/.test(normalized)) return "올바른 이름을 입력해 주세요.";
  if (!/^[가-힣a-zA-Z\s.-]+$/.test(normalized)) return "올바른 이름을 입력해 주세요.";

  return undefined;
}

export function validateConsultationPhone(value: string) {
  const digits = normalizePhoneDigits(value);

  if (!digits) return "연락처를 입력해 주세요.";
  if (!/^010\d{8}$/.test(digits)) {
    return "010으로 시작하는 휴대전화 번호를 입력해 주세요.";
  }

  return undefined;
}

export function validateConsultationCategory(value: string) {
  if (!value || !categoryValues.has(value)) {
    return "상담받을 사건 분야를 선택해 주세요.";
  }

  return undefined;
}

export function validateConsultationMessage(value: string) {
  const normalized = trimAndNormalizeSpaces(value);

  if (!normalized) return "상담 내용을 입력해 주세요.";
  if (normalized.length < 20) return "상담 내용은 20자 이상 작성해 주세요.";
  if (normalized.length > 3000) return "상담 내용은 3,000자 이하로 작성해 주세요.";

  return undefined;
}

export function validatePrivacyAgreement(value: boolean) {
  if (!value) return "개인정보 수집·이용에 동의해 주세요.";
  return undefined;
}

export function validateConsultationForm(values: ConsultationFormValues): ConsultationFormErrors {
  const errors: ConsultationFormErrors = {};
  const nameError = validateConsultationName(values.name);
  const phoneError = validateConsultationPhone(values.phone);
  const categoryError = validateConsultationCategory(values.category);
  const messageError = validateConsultationMessage(values.message);
  const privacyError = validatePrivacyAgreement(values.privacyAgreed);

  if (nameError) errors.name = nameError;
  if (phoneError) errors.phone = phoneError;
  if (categoryError) errors.category = categoryError;
  if (messageError) errors.message = messageError;
  if (privacyError) errors.privacyAgreed = privacyError;

  return errors;
}

function createReceptionNumber() {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `ZEU-${datePart}-${randomPart}`;
}

export async function submitConsultation(
  values: ConsultationFormValues,
): Promise<ConsultationSubmissionResult> {
  const errors = validateConsultationForm(values);

  if (Object.keys(errors).length > 0) {
    return {
      success: false,
      errorMessage: "입력 내용을 다시 확인해 주세요.",
    };
  }

  const payload = {
    name: trimAndNormalizeSpaces(values.name),
    phone: normalizePhoneDigits(values.phone),
    category: values.category as ConsultationCategory,
    message: trimAndNormalizeSpaces(values.message),
    privacyAgreed: true,
    source: values.source ?? "direct",
    aiTransferToken: values.aiTransferToken,
    aiSummary: values.aiSummary,
  };

  await new Promise((resolve) => {
    window.setTimeout(resolve, 650);
  });

  const receptionNumber = createReceptionNumber();
  saveConsultationSubmission(payload, receptionNumber);

  return {
    success: true,
    receptionNumber,
  };
}
