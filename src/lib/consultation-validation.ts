import { consultationCategories } from "@/data/consultation";
import type {
  ConsultationCategory,
  ConsultationFormErrors,
  ConsultationFormValues,
  ConsultationSubmissionResult,
} from "@/types/consultation";
import { saveConsultationSubmission } from "./consultation-submissions";

const categoryValues = new Set<string>(consultationCategories.map((category) => category.value));

export const consultationTimeOptions = Array.from({ length: 19 }, (_, index) => {
  const totalMinutes = 9 * 60 + index * 30;
  const hour = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

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

export function validateConsultationPreferredDate(value: string) {
  if (!value) return "상담 희망일을 선택해 주세요.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "상담 희망일을 다시 선택해 주세요.";

  const today = new Date();
  const todayText = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  if (value < todayText) return "상담 희망일은 오늘 이후 날짜로 선택해 주세요.";
  return undefined;
}

export function validateConsultationPreferredTime(value: string) {
  if (!value) return "상담 희망시간을 선택해 주세요.";
  if (!consultationTimeOptions.includes(value)) return "상담 희망시간은 09:00부터 18:00 사이 30분 단위로 선택해 주세요.";
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
  const preferredDateError = validateConsultationPreferredDate(values.preferredDate);
  const preferredTimeError = validateConsultationPreferredTime(values.preferredTime);
  const categoryError = validateConsultationCategory(values.category);
  const messageError = validateConsultationMessage(values.message);
  const privacyError = validatePrivacyAgreement(values.privacyAgreed);

  if (nameError) errors.name = nameError;
  if (phoneError) errors.phone = phoneError;
  if (preferredDateError) errors.preferredDate = preferredDateError;
  if (preferredTimeError) errors.preferredTime = preferredTimeError;
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
    preferredDate: values.preferredDate,
    preferredTime: values.preferredTime,
    category: values.category as ConsultationCategory,
    message: trimAndNormalizeSpaces(values.message),
    privacyAgreed: true,
    source: values.source ?? "direct",
    aiTransferToken: values.aiTransferToken,
    aiSummary: values.aiSummary,
  };

  let receptionNumber = createReceptionNumber();
  try {
    const response = await fetch("/api/consultations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => ({}))) as {
      success?: boolean;
      receptionNumber?: string;
      message?: string;
    };
    if (!response.ok || !data.success || !data.receptionNumber) {
      return {
        success: false,
        errorMessage: data.message || "상담신청을 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      };
    }
    receptionNumber = data.receptionNumber;
  } catch {
    await new Promise((resolve) => {
      window.setTimeout(resolve, 650);
    });
  }

  saveConsultationSubmission(payload, receptionNumber);

  return {
    success: true,
    receptionNumber,
  };
}
