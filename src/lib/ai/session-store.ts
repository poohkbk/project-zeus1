import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { hasSupabaseConfig, supabaseRequest } from "@/lib/supabase-rest";
import type { AiGuideResult, AiGuideSessionRecord } from "@/types/ai-guide";

const DATA_DIR = path.join(process.cwd(), "data");
const STORE_FILE = path.join(DATA_DIR, "ai-guide-sessions.json");
const sessionStore = new Map<string, AiGuideSessionRecord>();
const canUseFileStore = !process.env.VERCEL;

function readFileStore() {
  if (!canUseFileStore) return [];

  try {
    if (!existsSync(STORE_FILE)) return [];
    const parsed = JSON.parse(readFileSync(STORE_FILE, "utf8")) as AiGuideSessionRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFileStore(records: AiGuideSessionRecord[]) {
  if (!canUseFileStore) return;

  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(STORE_FILE, JSON.stringify(records, null, 2));
  } catch {
    // Serverless deployments can be read-only; keep the in-memory session as a fallback.
  }
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
  await saveAiGuideEvent(record.id, "session_started", {
    category: record.classification.category,
    subcategory: record.classification.subcategory,
  });
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

export async function linkAiGuideSessionToConsultation(sessionId: string, consultationId: string) {
  if (!hasSupabaseConfig()) return;
  await supabaseRequest(`ai_guide_sessions?id=eq.${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      status: "transferred",
      consultation_id: consultationId,
      updated_at: new Date().toISOString(),
    }),
  });
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
  await saveAiGuideEvent(sessionId, "result_created", {
    category: result.classification.category,
    urgency: result.urgency.level,
  });
}

export async function saveAiGuideEvent(sessionId: string | undefined, eventName: string, eventMetadata = {}) {
  if (!hasSupabaseConfig()) return;
  await supabaseRequest("ai_guide_events", {
    method: "POST",
    body: JSON.stringify({
      session_id: sessionId,
      event_name: eventName,
      event_metadata: eventMetadata,
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
