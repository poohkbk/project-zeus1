import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "ai-provider-settings.json");

export interface AiProviderSettings {
  generativeEnabled: boolean;
}

function envFlag(value: string | undefined, defaultValue: boolean) {
  if (value === undefined || value === "") return defaultValue;
  return value === "true" || value === "1" || value === "on";
}

function readStoredSettings(): Partial<AiProviderSettings> {
  try {
    if (!existsSync(SETTINGS_FILE)) return {};
    return JSON.parse(readFileSync(SETTINGS_FILE, "utf8")) as Partial<AiProviderSettings>;
  } catch {
    return {};
  }
}

export function getAiProviderSettings(): AiProviderSettings {
  const stored = readStoredSettings();
  return {
    generativeEnabled:
      stored.generativeEnabled ?? envFlag(process.env.AI_GENERATIVE_ENABLED, false),
  };
}

export function saveAiProviderSettings(settings: AiProviderSettings) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  return settings;
}

export function getPromptVersion() {
  return process.env.AI_PROMPT_VERSION ?? "zeu-ai-guide-v1";
}

export function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY || process.env.AI_API_KEY || "";
}
