import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import type { AiGuideResult, AiGuideSessionRecord } from "@/types/ai-guide";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "ai-guide-sessions.json");
const sessionStore = new Map<string, AiGuideSessionRecord>();

function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}

async function supabaseRequest(pathname: string, init: RequestInit) {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!baseUrl || !key) return undefined;

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/rest/v1/${pathname}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) return undefined;
  return response.json().catch(() => undefined) as Promise<unknown>;
}

function readFileStore() {
  try {
    if (!existsSync(STORE_FILE)) return [];
    const parsed = JSON.parse(readFileSync(STORE_FILE, "utf8")) as AiGuideSessionRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFileStore(records: AiGuideSessionRecord[]) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(STORE_FILE, JSON.stringify(records, null, 2));
}

function loadLocalSessions() {
  if (sessionStore.size > 0) return;
  for (const record of readFileStore()) {
    if (new Date(record.expiresAt).getTime() > Date.now()) sessionStore.set(record.id, record);
  }
}

function persistLocal(record: AiGuideSessionRecord) {
  loadLocalSessions();
  sessionStore.set(record.id, record);
  writeFileStore(Array.from(sessionStore.values()));
}

export async function saveAiGuideSession(record: AiGuideSessionRecord) {
  if (hasSupabaseConfig()) {
    await supabaseRequest("ai_guide_sessions", {
      method: "POST",
      body: JSON.stringify({
        id: record.id,
        public_token_hash: record.publicToken,
        status: record.status,
        initial_question_redacted: record.initialQuestionRedacted,
        category: record.classification.category,
        subcategory: record.classification.subcategory,
        classification_confidence: record.classification.confidence,
        generated_by: record.result?.generatedBy ?? "rule",
        expires_at: record.expiresAt,
        consent_to_transfer: record.consentToTransfer,
      }),
    });
  }

  persistLocal(record);
  return record;
}

export async function updateAiGuideSession(record: AiGuideSessionRecord) {
  const updated = { ...record, updatedAt: new Date().toISOString() };
  if (hasSupabaseConfig()) {
    await supabaseRequest(`ai_guide_sessions?id=eq.${encodeURIComponent(updated.id)}`, {
      method: "PATCH",
      body: JSON.stringify({
        status: updated.status,
        category: updated.classification.category,
        subcategory: updated.classification.subcategory,
        classification_confidence: updated.classification.confidence,
        consent_to_transfer: updated.consentToTransfer,
        updated_at: updated.updatedAt,
      }),
    });
    if (updated.answers.length > 0) {
      await supabaseRequest("ai_guide_answers", {
        method: "POST",
        body: JSON.stringify(
          updated.answers.map((answer) => ({
            session_id: updated.id,
            question_id: answer.questionId,
            field_name: answer.field,
            answer_redacted: answer.value,
          })),
        ),
      });
    }
    if (updated.result) await saveAiGuideResult(updated.id, updated.result);
  }

  persistLocal(updated);
  return updated;
}

export async function saveAiGuideResult(sessionId: string, result: AiGuideResult) {
  if (!hasSupabaseConfig()) return;
  await supabaseRequest("ai_guide_results", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      result_data: result,
      consultation_summary: result.consultationSummary,
      safety_flags: { urgency: result.urgency },
      related_content: result.relatedContent,
      prompt_version: process.env.AI_PROMPT_VERSION ?? "zeu-ai-guide-v1",
      model_name: "rule",
    }),
  });
}

export function getLocalAiGuideSession(id: string) {
  loadLocalSessions();
  const record = sessionStore.get(id);
  if (!record) return undefined;
  if (new Date(record.expiresAt).getTime() <= Date.now()) {
    sessionStore.delete(id);
    return undefined;
  }
  return record;
}

export function getAiGuideSessionByTransferToken(token: string) {
  loadLocalSessions();
  return Array.from(sessionStore.values()).find(
    (record) => record.transferToken === token && new Date(record.expiresAt).getTime() > Date.now(),
  );
}

export function createAiSessionId() {
  return crypto.randomUUID();
}

export function createTransferToken() {
  return `transfer-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

export function createExpiry(days = 30) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt.toISOString();
}
