import "server-only";

import { siteConfig } from "@/config/site";
import { consultationCategoryLabels } from "@/data/consultation";
import type { ConsultationCategory, ConsultationFormValues } from "@/types/consultation";

type ConsultationEmailPayload = {
  receptionNumber: string;
  name: string;
  phone: string;
  category: ConsultationCategory;
  message: string;
  source: string;
  aiSummary?: ConsultationFormValues["aiSummary"];
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[character] as string;
  });
}

function lineBreaks(value: string) {
  return escapeHtml(value).replace(/\n/g, "<br />");
}

function list(items: string[] | undefined) {
  if (!items?.length) return "<li>없음</li>";
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function buildEmailHtml(payload: ConsultationEmailPayload) {
  const categoryLabel = consultationCategoryLabels[payload.category];
  const aiSummary = payload.aiSummary;

  return `
    <div style="font-family:Arial,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#0e223d;line-height:1.6">
      <h2 style="margin:0 0 16px">새 상담신청이 접수되었습니다.</h2>
      <table style="width:100%;border-collapse:collapse;border-top:2px solid #0f2d52">
        <tbody>
          <tr><th style="text-align:left;padding:10px;border-bottom:1px solid #e5e7eb;width:130px">접수번호</th><td style="padding:10px;border-bottom:1px solid #e5e7eb">${escapeHtml(payload.receptionNumber)}</td></tr>
          <tr><th style="text-align:left;padding:10px;border-bottom:1px solid #e5e7eb">이름</th><td style="padding:10px;border-bottom:1px solid #e5e7eb">${escapeHtml(payload.name)}</td></tr>
          <tr><th style="text-align:left;padding:10px;border-bottom:1px solid #e5e7eb">연락처</th><td style="padding:10px;border-bottom:1px solid #e5e7eb">${escapeHtml(payload.phone)}</td></tr>
          <tr><th style="text-align:left;padding:10px;border-bottom:1px solid #e5e7eb">분야</th><td style="padding:10px;border-bottom:1px solid #e5e7eb">${escapeHtml(categoryLabel)}</td></tr>
          <tr><th style="text-align:left;padding:10px;border-bottom:1px solid #e5e7eb">접수경로</th><td style="padding:10px;border-bottom:1px solid #e5e7eb">${escapeHtml(payload.source)}</td></tr>
          <tr><th style="text-align:left;padding:10px;border-bottom:1px solid #e5e7eb;vertical-align:top">상담내용</th><td style="padding:10px;border-bottom:1px solid #e5e7eb">${lineBreaks(payload.message)}</td></tr>
        </tbody>
      </table>
      ${
        aiSummary
          ? `
            <h3 style="margin:24px 0 10px">AI 상담요약</h3>
            <p><strong>분류:</strong> ${escapeHtml(aiSummary.categoryLabel)}${aiSummary.subcategoryLabel ? ` / ${escapeHtml(aiSummary.subcategoryLabel)}` : ""}</p>
            <p><strong>긴급도:</strong> ${escapeHtml(aiSummary.urgencyLevel)}</p>
            <p><strong>상황요약:</strong> ${escapeHtml(aiSummary.situationSummary)}</p>
            <p><strong>확인된 내용</strong></p>
            <ul>${list(aiSummary.confirmedFacts)}</ul>
            <p><strong>보유 증거</strong></p>
            <ul>${list(aiSummary.availableEvidence)}</ul>
            <p><strong>추가 확인사항</strong></p>
            <ul>${list(aiSummary.missingInformation)}</ul>
          `
          : ""
      }
      <p style="margin-top:24px;color:#526273">관리자 페이지에서 상담 상태와 메모를 관리할 수 있습니다.</p>
    </div>
  `;
}

export async function notifyAdminOfConsultation(payload: ConsultationEmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_NOTIFICATION_EMAIL || siteConfig.email;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from || !to) {
    return { sent: false, reason: "missing_email_config" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `[법률사무소 제우] 새 상담신청 ${payload.receptionNumber}`,
      html: buildEmailHtml(payload),
      reply_to: siteConfig.email,
    }),
  });

  if (!response.ok) {
    return { sent: false, reason: "email_provider_error" };
  }

  return { sent: true };
}
