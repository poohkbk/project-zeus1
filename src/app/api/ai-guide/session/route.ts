import { NextRequest, NextResponse } from "next/server";
import { classifyLegalQuestion } from "@/lib/ai/classifier";
import { checkRateLimit } from "@/lib/ai/rate-limit";
import { evaluateSafetyGuidance } from "@/lib/ai/safety";
import { createAiSessionId, createExpiry, saveAiGuideSession } from "@/lib/ai/session-store";
import { redactSensitiveData } from "@/lib/ai/redaction";
import type { AiLegalCategory } from "@/types/ai-guide";

export const dynamic = "force-dynamic";

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwardedFor || realIp || "local-preview";
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limited = checkRateLimit(`ai-session:${ip}`, Number(process.env.AI_RATE_LIMIT_PER_MINUTE ?? 5), 60_000);
  if (!limited.allowed) {
    return NextResponse.json(
      { message: "현재 AI 안내 이용량이 많습니다. 잠시 후 다시 시도해 주세요.", retryAfterSeconds: limited.retryAfterSeconds },
      { status: 429 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    question?: string;
    category?: AiLegalCategory;
  };
  const question = String(body.question ?? "").slice(0, Number(process.env.AI_MAX_INPUT_CHARS ?? 2000));
  const redacted = redactSensitiveData(question);
  const classification = classifyLegalQuestion(redacted.redacted, body.category);
  const safetyGuidance = evaluateSafetyGuidance(redacted.redacted);
  const now = new Date().toISOString();
  const session = await saveAiGuideSession({
    id: createAiSessionId(),
    publicToken: Math.random().toString(36).slice(2, 18),
    status: "started",
    initialQuestionRedacted: redacted.redacted,
    classification,
    answers: [],
    consentToTransfer: false,
    createdAt: now,
    updatedAt: now,
    expiresAt: createExpiry(Number(process.env.AI_SESSION_RETENTION_DAYS ?? 30)),
  });

  return NextResponse.json({
    sessionId: session.id,
    classification: session.classification,
    redactionFindings: redacted.findings,
    safetyGuidance,
  });
}
