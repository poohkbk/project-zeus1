import { NextRequest, NextResponse } from "next/server";
import { consultationCategoryLabels } from "@/data/consultation";
import { requireAdminApi } from "@/lib/admin/auth";
import { listConsultations, updateConsultation } from "@/lib/data/consultations";
import { rejectCrossOriginRequest } from "@/lib/security/request-guard";
import type { ConsultationSubmission, ConsultationSubmissionStatus } from "@/types/consultation";
import type { ConsultationRow } from "@/types/database";

export const dynamic = "force-dynamic";

const statuses = new Set<ConsultationSubmissionStatus>(["new", "reviewing", "contacted", "closed"]);

function toSubmission(row: ConsultationRow): ConsultationSubmission {
  return {
    id: row.id,
    receptionNumber: row.reception_number,
    name: row.name,
    phone: row.phone,
    preferredDate: row.preferred_date ?? "",
    preferredTime: row.preferred_time ? row.preferred_time.slice(0, 5) : "",
    category: row.category,
    categoryLabel: consultationCategoryLabels[row.category],
    message: row.message,
    privacyAgreed: true,
    source: row.source,
    aiSummary: row.ai_summary as ConsultationSubmission["aiSummary"],
    status: row.status,
    memo: row.memo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET() {
  const { response } = await requireAdminApi();
  if (response) return response;

  const rows = await listConsultations();
  return NextResponse.json({ submissions: rows?.map(toSubmission) ?? [] });
}

export async function PATCH(request: NextRequest) {
  const originRejection = rejectCrossOriginRequest(request);
  if (originRejection) return originRejection;

  const { response } = await requireAdminApi();
  if (response) return response;

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    memo?: string;
    status?: ConsultationSubmissionStatus;
  };
  const id = String(body.id ?? "").trim();
  const status = body.status;
  const memo = String(body.memo ?? "").slice(0, 2000);

  if (!id || (status && !statuses.has(status))) {
    return NextResponse.json({ message: "수정할 상담 정보를 확인해 주세요." }, { status: 400 });
  }

  const row = await updateConsultation(id, {
    ...(status ? { status } : {}),
    ...(body.memo !== undefined ? { memo } : {}),
  });

  if (!row) return NextResponse.json({ message: "상담 정보를 수정하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ submission: toSubmission(row) });
}
