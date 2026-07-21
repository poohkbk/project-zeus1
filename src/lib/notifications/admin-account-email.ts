import "server-only";

import { siteConfig } from "@/config/site";

type AdminAccountEmailPayload = {
  mode: "created" | "password_reset";
  name: string;
  email: string;
  temporaryPassword: string;
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

function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.jwlaw.co.kr").replace(/\/$/, "");
}

function buildAdminEmailHtml(payload: AdminAccountEmailPayload) {
  const title =
    payload.mode === "created"
      ? "법률사무소 제우 관리자 계정이 생성되었습니다."
      : "법률사무소 제우 관리자 임시 비밀번호가 재설정되었습니다.";
  const loginUrl = `${getSiteUrl()}/admin/login`;

  return `
    <div style="font-family:Arial,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#0e223d;line-height:1.65">
      <h2 style="margin:0 0 16px">${escapeHtml(title)}</h2>
      <p>${escapeHtml(payload.name)}님, 아래 정보로 관리자 페이지에 로그인할 수 있습니다.</p>
      <table style="width:100%;border-collapse:collapse;border-top:2px solid #0f2d52;margin:18px 0">
        <tbody>
          <tr>
            <th style="text-align:left;padding:10px;border-bottom:1px solid #e5e7eb;width:140px">관리자 페이지</th>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb">
              <a href="${escapeHtml(loginUrl)}">${escapeHtml(loginUrl)}</a>
            </td>
          </tr>
          <tr>
            <th style="text-align:left;padding:10px;border-bottom:1px solid #e5e7eb">이메일</th>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb">${escapeHtml(payload.email)}</td>
          </tr>
          <tr>
            <th style="text-align:left;padding:10px;border-bottom:1px solid #e5e7eb">임시 비밀번호</th>
            <td style="padding:10px;border-bottom:1px solid #e5e7eb"><strong>${escapeHtml(payload.temporaryPassword)}</strong></td>
          </tr>
        </tbody>
      </table>
      <p style="margin-top:18px;color:#526273">임시 비밀번호는 외부에 공유하지 말고 안전하게 보관해 주세요.</p>
      <p style="margin-top:24px;color:#526273">${escapeHtml(siteConfig.name)} · ${escapeHtml(siteConfig.phone)}</p>
    </div>
  `;
}

function buildAdminEmailText(payload: AdminAccountEmailPayload) {
  const title =
    payload.mode === "created"
      ? "법률사무소 제우 관리자 계정이 생성되었습니다."
      : "법률사무소 제우 관리자 임시 비밀번호가 재설정되었습니다.";

  return [
    title,
    "",
    `관리자 페이지: ${getSiteUrl()}/admin/login`,
    `이메일: ${payload.email}`,
    `임시 비밀번호: ${payload.temporaryPassword}`,
    "",
    "임시 비밀번호는 외부에 공유하지 말고 안전하게 보관해 주세요.",
  ].join("\n");
}

export async function notifyAdminAccount(payload: AdminAccountEmailPayload) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from || !payload.email) {
    return { sent: false, reason: "missing_email_config" };
  }

  const subject =
    payload.mode === "created"
      ? `[${siteConfig.name}] 관리자 계정이 생성되었습니다`
      : `[${siteConfig.name}] 관리자 임시 비밀번호가 재설정되었습니다`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: payload.email,
      subject,
      html: buildAdminEmailHtml(payload),
      text: buildAdminEmailText(payload),
      reply_to: siteConfig.email,
    }),
  });

  if (!response.ok) {
    return { sent: false, reason: "email_provider_error" };
  }

  return { sent: true };
}
