import "server-only";

import { siteConfig } from "@/config/site";

type AdminAccountEmailPayload = {
  mode: "created" | "password_reset";
  name: string;
  email: string;
  temporaryPassword: string;
};

type AdminAccountEmailFailureReason =
  | "missing_email_config"
  | "invalid_resend_api_key"
  | "invalid_from_email"
  | "from_domain_not_verified"
  | "resend_test_recipient_restricted"
  | "email_provider_error";

type AdminAccountEmailResult =
  | { sent: true }
  | { sent: false; reason: AdminAccountEmailFailureReason; detail?: string };

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

async function readProviderMessage(response: Response) {
  const body = await response.text().catch(() => "");
  if (!body) return "";

  try {
    const parsed = JSON.parse(body) as { message?: string; error?: string; name?: string };
    return parsed.message || parsed.error || parsed.name || body;
  } catch {
    return body;
  }
}

function classifyProviderError(status: number, message: string): AdminAccountEmailFailureReason {
  const normalized = message.toLowerCase();

  if (status === 401 || normalized.includes("api key")) {
    return "invalid_resend_api_key";
  }

  if (normalized.includes("own email address") || normalized.includes("verify a domain")) {
    return "resend_test_recipient_restricted";
  }

  if (normalized.includes("domain") && (normalized.includes("not verified") || normalized.includes("verify"))) {
    return "from_domain_not_verified";
  }

  if (normalized.includes("from")) {
    return "invalid_from_email";
  }

  return "email_provider_error";
}

export function getAdminAccountEmailFailureMessage(result: AdminAccountEmailResult) {
  if (result.sent) return "";

  switch (result.reason) {
    case "missing_email_config":
      return "RESEND_API_KEY 또는 RESEND_FROM_EMAIL 환경변수가 비어 있습니다.";
    case "invalid_resend_api_key":
      return "RESEND_API_KEY가 유효하지 않습니다. Resend에서 새 API 키를 확인해 주세요.";
    case "invalid_from_email":
      return "RESEND_FROM_EMAIL 형식이 올바르지 않습니다. 예: LAW OFFICE ZEU <onboarding@resend.dev>";
    case "from_domain_not_verified":
      return "발신자 도메인이 Resend에서 인증되지 않았습니다. 도메인 인증 전에는 onboarding@resend.dev를 사용해 주세요.";
    case "resend_test_recipient_restricted":
      return "Resend 테스트 발신자는 수신자가 제한될 수 있습니다. 다른 관리자 이메일로 보내려면 jwlaw.co.kr 도메인 인증이 필요합니다.";
    default:
      return "Resend가 이메일 발송을 거절했습니다. Resend Logs에서 실패 사유를 확인해 주세요.";
  }
}

export async function notifyAdminAccount(payload: AdminAccountEmailPayload): Promise<AdminAccountEmailResult> {
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
    const detail = await readProviderMessage(response);
    return { sent: false, reason: classifyProviderError(response.status, detail), detail };
  }

  return { sent: true };
}
