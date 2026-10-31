import { z } from "zod"

/**
 * Which AI the user connected. Keys stay in this browser: in sessionStorage
 * (gone when the tab closes) unless the user chooses to remember them.
 * They are never part of exports or backups.
 */

export const PROVIDERS = ["anthropic", "gemini", "openai", "ondevice"] as const
export type ProviderId = (typeof PROVIDERS)[number]

export const PROVIDER_INFO: Record<ProviderId, { label: string; needsKey: boolean; keyUrl?: string; defaultModel: string; note: string }> = {
  anthropic: {
    label: "Anthropic (Claude)",
    needsKey: true,
    keyUrl: "https://console.anthropic.com/settings/keys",
    defaultModel: "claude-opus-5-5",
    note: "Paid API. Your CV text is sent to Anthropic.",
  },
  gemini: {
    label: "Google Gemini",
    needsKey: true,
    keyUrl: "https://aistudio.google.com/apikey",
    defaultModel: "",
    note: "Has a free tier. Your CV text is sent to Google.",
  },
  openai: {
    label: "OpenAI-compatible (OpenAI, Groq, OpenRouter, Ollama…)",
    needsKey: false,
    defaultModel: "",
    note: "Any service with an OpenAI-style API. With a local Ollama, nothing leaves your computer.",
  },
  ondevice: {
    label: "On-device (Chrome built-in, experimental)",
    needsKey: false,
    defaultModel: "",
    note: "Runs a small model inside Chrome. Free and private, but needs a recent Chrome with built-in AI turned on.",
  },
}

export const OPENAI_PRESETS = [
  { label: "OpenAI", baseUrl: "https://api.openai.com/v1" },
  { label: "Groq", baseUrl: "https://api.groq.com/openai/v1" },
  { label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1" },
  { label: "Ollama (local)", baseUrl: "http://localhost:11434/v1" },
] as const

export const AiSettingsSchema = z.object({
  provider: z.enum(PROVIDERS).catch("anthropic"),
  apiKey: z.string().catch(""),
  model: z.string().catch(""),
  baseUrl: z.string().catch(OPENAI_PRESETS[0].baseUrl),
  remember: z.boolean().catch(false),
})
export type AiSettings = z.infer<typeof AiSettingsSchema>

export const AI_KEY = "cvFormatter.ai"

export function defaultAiSettings(): AiSettings {
  return { provider: "anthropic", apiKey: "", model: PROVIDER_INFO.anthropic.defaultModel, baseUrl: OPENAI_PRESETS[0].baseUrl, remember: false }
}

export function loadAiSettings(): AiSettings {
  for (const store of [sessionStorage, localStorage]) {
    try {
      const raw = store.getItem(AI_KEY)
      if (raw) return AiSettingsSchema.parse(JSON.parse(raw))
    } catch {
      // ignore broken values
    }
  }
  return defaultAiSettings()
}

export function saveAiSettings(s: AiSettings) {
  try {
    const raw = JSON.stringify(s)
    if (s.remember) {
      localStorage.setItem(AI_KEY, raw)
      sessionStorage.removeItem(AI_KEY)
    } else {
      sessionStorage.setItem(AI_KEY, raw)
      localStorage.removeItem(AI_KEY)
    }
  } catch {
    // storage disabled: settings last until reload
  }
}

export function clearAiSettings() {
  localStorage.removeItem(AI_KEY)
  sessionStorage.removeItem(AI_KEY)
}

/** Ready to send requests? */
export function isConfigured(s: AiSettings): boolean {
  if (!s.model.trim() && s.provider !== "ondevice") return false
  if (s.provider === "anthropic" || s.provider === "gemini") return Boolean(s.apiKey.trim())
  if (s.provider === "openai") return Boolean(s.baseUrl.trim())
  return true
}
