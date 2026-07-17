import { NextRequest, NextResponse } from "next/server";
import { getAiGuideSessionByTransferToken, linkAiGuideSessionToConsultation } from "@/lib/ai/session-store";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { createConsultation } from "@/lib/data/consultations";
import { notifyAdminOfConsultation } from "@/lib/notifications/consultation-email";
import { getClientIp, rejectCrossOriginRequest } from "@/lib/security/request-guard";
import type { ConsultationCategory, ConsultationFormValues } from "@/types/consultation";

export const dynamic = "force-dynamic";

const categoryValues = new Set(["civil", "criminal", "divorce", "inheritance", "administrative"]);
const timeValues = new Set(
  Array.from({ length: 19 }, (_, index) => {
    const totalMinutes = 9 * 60 + index * 30;
    const hour = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }),
);

function cleanText(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function cleanPhone(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 11);
}

function cleanDate(value: unknown) {
  const text = String(value ?? "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : "";
}

function cleanTime(value: unknown) {
  const text = String(value ?? "").trim();
  return timeValues.has(text) ? text : "";
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

function validatePayload(values: ConsultationFormValues) {
  const name = cleanText(values.name);
  const phone = cleanPhone(values.phone);
  const preferredDate = cleanDate(values.preferredDate);
  const preferredTime = cleanTime(values.preferredTime);
  const category = String(values.category ?? "");
  const message = cleanText(values.message);
  const today = new Date();
  const todayText = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");

  if (name.length < 2 || name.length > 30) return undefined;
  if (!/^010\d{8}$/.test(phone)) return undefined;
  if (!preferredDate || preferredDate < todayText) return undefined;
  if (!preferredTime) return undefined;
  if (!categoryValues.has(category)) return undefined;
  if (message.length < 20 || message.length > 3000) return undefined;
  if (!values.privacyAgreed) return undefined;

  return {
    name,
    phone,
    preferredDate,
    preferredTime,
    category: category as ConsultationCategory,
    message,
  };
}

export async function POST(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;

  const limited = checkRateLimit(`consultation:${getClientIp(request)}`, 3, 10 * 60_000);
  if (!limited.allowed) {
    return NextResponse.json(
      {
        message: "상담신청 요청이 잠시 많습니다. 잠시 후 다시 시도하거나 전화로 문의해 주세요.",
        retryAfterSeconds: limited.retryAfterSeconds,
      },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as ConsultationFormValues;
  const normalized = validatePayload(body);
  if (!normalized) {
    return NextResponse.json({ message: "상담신청 입력값을 확인해 주세요." }, { status: 400 });
  }

  const receptionNumber = createReceptionNumber();
  const source = body.source ?? "direct";
  const transferSession = body.aiTransferToken
    ? getAiGuideSessionByTransferToken(body.aiTransferToken)
    : undefined;
  const aiSummary = transferSession?.result?.consultationSummary ?? body.aiSummary;

  const inserted = await createConsultation({
    reception_number: receptionNumber,
    name: normalized.name,
    phone: normalized.phone,
    preferred_date: normalized.preferredDate,
    preferred_time: normalized.preferredTime,
    category: normalized.category,
    message: normalized.message,
    privacy_agreed: true,
    source,
    ai_session_id: transferSession?.id,
    ai_summary: aiSummary,
    ai_urgency_level: aiSummary?.urgencyLevel,
    ai_category: aiSummary?.category,
    ai_subcategory: aiSummary?.subcategory,
    ai_transfer_consent: Boolean(transferSession?.consentToTransfer),
  });

  if (inserted?.id && transferSession?.id) {
    await linkAiGuideSessionToConsultation(transferSession.id, inserted.id);
  }

  const emailNotification = await notifyAdminOfConsultation({
    receptionNumber,
    name: normalized.name,
    phone: normalized.phone,
    preferredDate: normalized.preferredDate,
    preferredTime: normalized.preferredTime,
    category: normalized.category,
    message: normalized.message,
    source,
    aiSummary,
  }).catch(() => ({ sent: false, reason: "email_exception" as const }));

  return NextResponse.json({ success: true, receptionNumber, emailSent: emailNotification.sent });
}
