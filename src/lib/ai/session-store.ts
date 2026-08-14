import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { aiSubcategoryLabels } from "@/data/ai/categories";
import { classifyLegalQuestion } from "@/lib/ai/classifier";
import { hasSupabaseConfig, supabaseRequest } from "@/lib/supabase-rest";
import type { AiGuideAnswer, AiGuideResult, AiGuideSessionRecord, AiLegalCategory, AiSubcategory } from "@/types/ai-guide";

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

type StoredSessionRow = {
  id: string;
  public_token_hash: string;
  status: AiGuideSessionRecord["status"];
  initial_question_redacted: string;
  category: AiLegalCategory;
  subcategory?: AiSubcategory | null;
  classification_confidence?: number | null;
  consent_to_transfer: boolean;
  created_at: string;
  updated_at: string;
  expires_at: string;
};

type StoredAnswerRow = {
  question_id: string;
  field_name: string;
  answer_redacted: AiGuideAnswer["value"];
  created_at: string;
};

type StoredResultRow = { result_data: AiGuideResult };

export async function getAiGuideSession(id: string) {
  const local = getLocalAiGuideSession(id);
  if (local || !hasSupabaseConfig()) return local;

  const sessionRows = await supabaseRequest(
    `ai_guide_sessions?id=eq.${encodeURIComponent(id)}&select=*&limit=1`,
    { method: "GET" },
  ) as StoredSessionRow[] | undefined;
  const row = sessionRows?.[0];
  if (!row || new Date(row.expires_at).getTime() <= Date.now()) return undefined;

  const [answerRows, resultRows] = await Promise.all([
    supabaseRequest(
      `ai_guide_answers?session_id=eq.${encodeURIComponent(id)}&select=question_id,field_name,answer_redacted,created_at&order=created_at.asc`,
      { method: "GET" },
    ) as Promise<StoredAnswerRow[] | undefined>,
    supabaseRequest(
      `ai_guide_results?session_id=eq.${encodeURIComponent(id)}&select=result_data&limit=1`,
      { method: "GET" },
    ) as Promise<StoredResultRow[] | undefined>,
  ]);

  const answerMap = new Map<string, AiGuideAnswer>();
  for (const answer of answerRows ?? []) {
    answerMap.set(answer.question_id, {
      questionId: answer.question_id,
      field: answer.field_name,
      value: answer.answer_redacted,
      answeredAt: answer.created_at,
    });
  }

  const baseClassification = classifyLegalQuestion(row.initial_question_redacted, row.category);
  const classification = {
    ...baseClassification,
    subcategory: row.subcategory ?? baseClassification.subcategory,
    subcategoryLabel: row.subcategory
      ? aiSubcategoryLabels[row.subcategory]
      : baseClassification.subcategoryLabel,
    confidence: Number(row.classification_confidence ?? baseClassification.confidence),
  };
  const record: AiGuideSessionRecord = {
    id: row.id,
    publicToken: row.public_token_hash,
    status: row.status,
    initialQuestionRedacted: row.initial_question_redacted,
    classification,
    answers: Array.from(answerMap.values()),
    result: resultRows?.[0]?.result_data,
    consentToTransfer: row.consent_to_transfer,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    expiresAt: row.expires_at,
  };
  persistLocal(record);
  return record;
}

function decodeTransferToken(token: string) {
  if (!token.startsWith("v1.")) return undefined;
  try {
    return JSON.parse(Buffer.from(token.slice(3), "base64url").toString("utf8")) as {
      sessionId?: string;
      publicToken?: string;
    };
  } catch {
    return undefined;
  }
}

export async function getAiGuideSessionByTransferToken(token: string) {
  const decoded = decodeTransferToken(token);
  if (decoded?.sessionId && decoded.publicToken) {
    const record = await getAiGuideSession(decoded.sessionId);
    return record?.publicToken === decoded.publicToken ? record : undefined;
  }

  loadLocalSessions();
  return Array.from(sessionStore.values()).find(
    (record) => record.transferToken === token && new Date(record.expiresAt).getTime() > Date.now(),
  );
}

export function createAiSessionId() {
  return crypto.randomUUID();
}

export function createTransferToken(sessionId?: string, publicToken?: string) {
  if (sessionId && publicToken) {
    return `v1.${Buffer.from(JSON.stringify({ sessionId, publicToken })).toString("base64url")}`;
  }
  return `transfer-${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
}

export function createExpiry(days = 30) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt.toISOString();
}
