import { NextRequest, NextResponse } from "next/server";
import { getAiGuideSessionByTransferToken, linkAiGuideSessionToConsultation } from "@/lib/ai/session-store";
import { hasSupabaseConfig, supabaseRequest } from "@/lib/supabase-rest";
import type { ConsultationCategory, ConsultationFormValues } from "@/types/consultation";

export const dynamic = "force-dynamic";

const categoryValues = new Set(["civil", "criminal", "divorce", "inheritance", "administrative"]);

function cleanText(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function cleanPhone(value: unknown) {
  return String(value ?? "").replace(/\D/g, "").slice(0, 11);
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
  const category = String(values.category ?? "");
  const message = cleanText(values.message);

  if (name.length < 2 || name.length > 30) return undefined;
  if (!/^010\d{8}$/.test(phone)) return undefined;
  if (!categoryValues.has(category)) return undefined;
  if (message.length < 20 || message.length > 3000) return undefined;
  if (!values.privacyAgreed) return undefined;

  return {
    name,
    phone,
    category: category as ConsultationCategory,
    message,
  };
}

export async function POST(request: NextRequest) {
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

  if (hasSupabaseConfig()) {
    const inserted = (await supabaseRequest("consultations", {
      method: "POST",
      body: JSON.stringify({
        reception_number: receptionNumber,
        name: normalized.name,
        phone: normalized.phone,
        category: normalized.category,
        message: normalized.message,
        source,
        ai_session_id: transferSession?.id,
        ai_summary: aiSummary,
        ai_urgency_level: aiSummary?.urgencyLevel,
        ai_category: aiSummary?.category,
        ai_subcategory: aiSummary?.subcategory,
        ai_transfer_consent: Boolean(transferSession?.consentToTransfer),
      }),
    })) as Array<{ id?: string }> | undefined;

    const consultationId = inserted?.[0]?.id;
    if (consultationId && transferSession?.id) {
      await linkAiGuideSessionToConsultation(transferSession.id, consultationId);
    }
  }

  return NextResponse.json({ success: true, receptionNumber });
}
