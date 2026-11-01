import Anthropic from "@anthropic-ai/sdk"
import { AiError } from "./errors"
import type { AiSettings } from "./settings"

/**
 * One small interface over several AI providers, called straight from the
 * browser with the user's own key:
 *   - listModels: what the key can use (so model names never go stale in code)
 *   - generateJson: one structured answer
 *   - streamText: a long answer shown as it arrives
 */

export type Ask = {
  system: string
  prompt: string
  signal?: AbortSignal
  /** Called when the chosen model failed and another one answered instead. */
  onModelChange?: (model: string) => void
}
export type JsonAsk = Ask & { schema: Record<string, unknown> }

export { AiError }

// --- Shared helpers ---

/** Reads a Server-Sent Events stream and yields each `data:` payload. */
export async function* sseData(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ""
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let cut: number
    while ((cut = buffer.search(/\r?\n\r?\n/)) !== -1) {
      const event = buffer.slice(0, cut)
      buffer = buffer.slice(cut).replace(/^\r?\n\r?\n/, "")
      const data = event
        .split(/\r?\n/)
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trimStart())
        .join("\n")
      if (data) yield data
    }
  }
}

/** Pulls a JSON object out of a reply, tolerating ```json fences or text around it. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const candidate = fenced ? fenced[1] : text
  const start = candidate.indexOf("{")
  const end = candidate.lastIndexOf("}")
  if (start === -1 || end <= start) throw new AiError("The AI didn't return JSON.", "Try again, or pick a stronger model.")
  return JSON.parse(candidate.slice(start, end + 1))
}

/** Models a key can list but that can't write text (speech, images, music, robots…). */
const NOT_TEXT = /tts|image|banana|lyria|robotics|computer-use|transcribe|deep-research|antigravity|embedding|customtools|aqa|omni|audio|live|veo|imagen/i

/** Text models first, with the recommended one at the top. Exported for tests. */
export function pickTextModels(ids: string[], recommended: string[]): string[] {
  const text = ids.filter((id) => !NOT_TEXT.test(id))
  const first = recommended.filter((r) => text.includes(r))
  return [...first, ...text.filter((id) => !first.includes(id))]
}

/** Gives up on a request that hangs, so the user isn't left waiting forever. */
function withTimeout(signal: AbortSignal | undefined, ms: number): AbortSignal {
  const timeout = AbortSignal.timeout(ms)
  return signal ? AbortSignal.any([signal, timeout]) : timeout
}

function networkError(err: unknown, provider: string): never {
  if (err instanceof DOMException && err.name === "TimeoutError") throw new AiError(`${provider} took too long to answer.`, "Try again, or pick a faster model (Flash or Lite).", true)
  if (err instanceof TypeError) throw new AiError(`Couldn't reach ${provider}.`, "Check your internet connection. Some networks and ad blockers block AI services.")
  throw err
}

async function httpError(res: Response, provider: string, model?: string): Promise<AiError> {
  let detail = ""
  try {
    const body = await res.json()
    detail = body?.error?.message ?? body?.message ?? ""
  } catch {
    // not JSON
  }
  if (res.status === 401 || res.status === 403) return new AiError(`${provider} rejected the API key.`, "Check the key in AI settings.")
  if (res.status === 429) return new AiError(`${provider} rate limit reached.`, "Wait a minute and try again. Free tiers have low limits.")
  if (res.status === 404) return new AiError(`${provider} couldn't use the model "${model || "(none)"}".`, detail || "Open AI settings, press Load models and pick one from the list.", true)
  if (res.status === 503 || res.status === 500) return new AiError(`${provider} is busy right now.`, "Try again in a moment, or pick another model.", true)
  if (res.status === 400 && /api key/i.test(detail)) return new AiError(`${provider} rejected the API key.`, "Check the key in AI settings.")
  return new AiError(`${provider} error ${res.status}${detail ? `: ${detail}` : ""}`)
}

const schemaHint = (schema: Record<string, unknown>) =>
  `\n\nReply with only a JSON object matching this JSON Schema, no other text:\n${JSON.stringify(schema)}`

// --- Gemini model fallback ---

/** Google-maintained aliases: tried, in order, when the chosen model is retired, busy or slow. */
export const GEMINI_FALLBACKS = ["gemini-flash-lite-latest", "gemini-flash-latest"]

/**
 * Runs a Gemini request on the chosen model, then on the fallback aliases if it
 * fails in a way another model could fix. Reports the model that answered.
 */
export async function withGeminiFallback<T>(s: AiSettings, ask: Ask, run: (model: string) => Promise<T>): Promise<T> {
  const candidates = [s.model, ...GEMINI_FALLBACKS.filter((m) => m !== s.model)]
  let lastError: unknown
  for (const model of candidates) {
    try {
      const result = await run(model)
      if (model !== s.model) ask.onModelChange?.(model)
      return result
    } catch (err) {
      if (ask.signal?.aborted) throw err
      const retryable = (err instanceof AiError && err.tryAnotherModel) || (err instanceof DOMException && err.name === "TimeoutError")
      if (!retryable) throw err
      lastError = err
    }
  }
  throw lastError
}

// --- Anthropic (official SDK) ---

/** Models where server-side refusal fallbacks and the effort setting are supported. */
const SUPPORTS_FALLBACK = /^claude-(fable-5-1|opus-5-5|opus-5|sonnet-5-5)$/
const SUPPORTS_EFFORT = /^claude-(fable|opus|sonnet-5)/

function anthropicClient(s: AiSettings) {
  // The key is the user's own and never leaves their browser except to Anthropic.
  return new Anthropic({ apiKey: s.apiKey, dangerouslyAllowBrowser: true, maxRetries: 2 })
}

function anthropicParams(s: AiSettings, ask: Ask, maxTokens: number) {
  const fallback = SUPPORTS_FALLBACK.test(s.model)
  return {
    model: s.model,
    max_tokens: maxTokens,
    system: ask.system,
    messages: [{ role: "user" as const, content: ask.prompt }],
    // On a safety decline, let the API retry on Anthropic's recommended model instead of failing.
    ...(fallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
  }
}

function anthropicError(err: unknown): AiError {
  if (err instanceof Anthropic.AuthenticationError) return new AiError("Anthropic rejected the API key.", "Check the key in AI settings.")
  if (err instanceof Anthropic.RateLimitError) return new AiError("Anthropic rate limit reached.", "Wait a minute and try again.")
  if (err instanceof Anthropic.NotFoundError) return new AiError("Anthropic couldn't find that model.", "Load the model list again and pick one.")
  if (err instanceof Anthropic.APIUserAbortError) return new AiError("Stopped.")
  if (err instanceof Anthropic.APIError) return new AiError(`Anthropic error ${err.status ?? ""}: ${err.message}`)
  return err instanceof AiError ? err : new AiError(String(err))
}

function refusalCheck(stopReason: string | null | undefined) {
  if (stopReason === "refusal") throw new AiError("The model declined this request.", "Rephrase the text, or try another model.")
}

// --- On-device (Chrome built-in Prompt API, experimental) ---

type LanguageModelSession = {
  prompt: (input: string, opts?: { responseConstraint?: unknown; signal?: AbortSignal }) => Promise<string>
  promptStreaming: (input: string, opts?: { signal?: AbortSignal }) => ReadableStream<string>
  destroy: () => void
}
type LanguageModelApi = {
  availability: (opts?: unknown) => Promise<"unavailable" | "downloadable" | "downloading" | "available">
  create: (opts?: unknown) => Promise<LanguageModelSession>
}

function onDeviceApi(): LanguageModelApi | null {
  return (globalThis as unknown as { LanguageModel?: LanguageModelApi }).LanguageModel ?? null
}

export async function onDeviceAvailability(): Promise<string> {
  const api = onDeviceApi()
  if (!api) return "unavailable"
  try {
    return await api.availability({ expectedInputs: [{ type: "text", languages: ["en"] }], expectedOutputs: [{ type: "text", languages: ["en"] }] })
  } catch {
    return "unavailable"
  }
}

async function onDeviceSession(system: string): Promise<LanguageModelSession> {
  const api = onDeviceApi()
  if (!api) throw new AiError("This browser has no built-in AI.", "Use Chrome with built-in AI turned on, or pick another provider.")
  return api.create({
    initialPrompts: [{ role: "system", content: system }],
    expectedInputs: [{ type: "text", languages: ["en"] }],
    expectedOutputs: [{ type: "text", languages: ["en"] }],
  })
}

// --- Public API ---

async function listModelsRaw(s: AiSettings): Promise<string[]> {
  switch (s.provider) {
    case "anthropic": {
      try {
        const ids: string[] = []
        for await (const m of anthropicClient(s).models.list()) ids.push(m.id)
        return ids
      } catch (err) {
        throw anthropicError(err)
      }
    }
    case "gemini": {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": s.apiKey } })
      if (!res.ok) throw await httpError(res, "Gemini")
      const body = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] }
      const ids = (body.models ?? [])
        .filter((m) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m) => m.name.replace(/^models\//, ""))
        .filter((id) => /gemini|gemma/i.test(id))
      return pickTextModels(ids, ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-pro-latest"])
    }
    case "openai": {
      const res = await fetch(`${s.baseUrl.replace(/\/+$/, "")}/models`, { headers: s.apiKey ? { Authorization: `Bearer ${s.apiKey}` } : {} })
      if (!res.ok) throw await httpError(res, "The AI service")
      const body = (await res.json()) as { data?: { id: string }[] }
      return (body.data ?? []).map((m) => m.id).sort()
    }
    case "ondevice":
      return (await onDeviceAvailability()) === "unavailable" ? [] : ["built-in"]
  }
}

async function generateJsonRaw(s: AiSettings, ask: JsonAsk): Promise<unknown> {
  switch (s.provider) {
    case "anthropic": {
      try {
        const params = anthropicParams(s, ask, 4000)
        const res = await anthropicClient(s).beta.messages.create(
          {
            ...params,
            output_config: {
              format: { type: "json_schema", schema: ask.schema },
              ...(SUPPORTS_EFFORT.test(s.model) ? { effort: "medium" as const } : {}),
            },
          },
          { signal: ask.signal },
        )
        refusalCheck(res.stop_reason)
        const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("")
        return extractJson(text)
      } catch (err) {
        throw anthropicError(err)
      }
    }
    case "gemini":
      return withGeminiFallback(s, ask, async (model) => {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
          method: "POST",
          signal: withTimeout(ask.signal, 45_000),
          headers: { "Content-Type": "application/json", "x-goog-api-key": s.apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: ask.system }] },
            contents: [{ role: "user", parts: [{ text: ask.prompt + schemaHint(ask.schema) }] }],
            generationConfig: { responseMimeType: "application/json" },
          }),
        })
        if (!res.ok) throw await httpError(res, "Gemini", model)
        const body = (await res.json()) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[] }
        const cand = body.candidates?.[0]
        if (cand?.finishReason === "SAFETY") throw new AiError("Gemini declined this request.")
        return extractJson(cand?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? "").join("") ?? "")
      })
    case "openai": {
      const res = await fetch(`${s.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        signal: withTimeout(ask.signal, 90_000),
        headers: { "Content-Type": "application/json", ...(s.apiKey ? { Authorization: `Bearer ${s.apiKey}` } : {}) },
        body: JSON.stringify({
          model: s.model,
          messages: [
            { role: "system", content: ask.system },
            { role: "user", content: ask.prompt + schemaHint(ask.schema) },
          ],
          response_format: { type: "json_object" },
        }),
      })
      if (!res.ok) throw await httpError(res, "The AI service", s.model)
      const body = (await res.json()) as { choices?: { message?: { content?: string } }[] }
      return extractJson(body.choices?.[0]?.message?.content ?? "")
    }
    case "ondevice": {
      const session = await onDeviceSession(ask.system)
      try {
        return extractJson(await session.prompt(ask.prompt, { responseConstraint: ask.schema, signal: ask.signal }))
      } finally {
        session.destroy()
      }
    }
  }
}

async function streamTextRaw(s: AiSettings, ask: Ask, onText: (text: string) => void): Promise<string> {
  let text = ""
  const push = (delta: string) => {
    text += delta
    onText(text)
  }
  switch (s.provider) {
    case "anthropic": {
      try {
        const stream = anthropicClient(s).beta.messages.stream(
          {
            ...anthropicParams(s, ask, 16000),
            ...(SUPPORTS_EFFORT.test(s.model) ? { output_config: { effort: "medium" as const } } : {}),
          },
          { signal: ask.signal },
        )
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") push(event.delta.text)
        }
        refusalCheck((await stream.finalMessage()).stop_reason)
        return text
      } catch (err) {
        throw anthropicError(err)
      }
    }
    case "gemini":
      return withGeminiFallback(s, ask, async (model) => {
        // Fallback is only safe before any text has been shown.
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`, {
          method: "POST",
          signal: withTimeout(ask.signal, 180_000),
          headers: { "Content-Type": "application/json", "x-goog-api-key": s.apiKey },
          body: JSON.stringify({ systemInstruction: { parts: [{ text: ask.system }] }, contents: [{ role: "user", parts: [{ text: ask.prompt }] }] }),
        })
        if (!res.ok || !res.body) throw await httpError(res, "Gemini", model)
        for await (const data of sseData(res.body)) {
          const chunk = JSON.parse(data) as { candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] } }[] }
          push(chunk.candidates?.[0]?.content?.parts?.filter((p) => !p.thought).map((p) => p.text ?? "").join("") ?? "")
        }
        return text
      })
    case "openai": {
      const res = await fetch(`${s.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        signal: withTimeout(ask.signal, 180_000),
        headers: { "Content-Type": "application/json", ...(s.apiKey ? { Authorization: `Bearer ${s.apiKey}` } : {}) },
        body: JSON.stringify({
          model: s.model,
          stream: true,
          messages: [
            { role: "system", content: ask.system },
            { role: "user", content: ask.prompt },
          ],
        }),
      })
      if (!res.ok || !res.body) throw await httpError(res, "The AI service", s.model)
      for await (const data of sseData(res.body)) {
        if (data === "[DONE]") break
        const chunk = JSON.parse(data) as { choices?: { delta?: { content?: string } }[] }
        push(chunk.choices?.[0]?.delta?.content ?? "")
      }
      return text
    }
    case "ondevice": {
      const session = await onDeviceSession(ask.system)
      try {
        const reader = session.promptStreaming(ask.prompt, { signal: ask.signal }).getReader()
        for (;;) {
          const { value, done } = await reader.read()
          if (done) break
          push(value)
        }
        return text
      } finally {
        session.destroy()
      }
    }
  }
}

// Public entry points: same as above, but network failures and timeouts become clear messages.

const providerName = (s: AiSettings) => ({ anthropic: "Anthropic", gemini: "Gemini", openai: "The AI service", ondevice: "The on-device model" })[s.provider]

export function listModels(s: AiSettings): Promise<string[]> {
  return listModelsRaw(s).catch((e) => networkError(e, providerName(s)))
}

export function generateJson(s: AiSettings, ask: JsonAsk): Promise<unknown> {
  return generateJsonRaw(s, ask).catch((e) => networkError(e, providerName(s)))
}

/** Streams a long answer. Calls onText with the full text so far; resolves with the final text. */
export function streamText(s: AiSettings, ask: Ask, onText: (text: string) => void): Promise<string> {
  return streamTextRaw(s, ask, onText).catch((e) => networkError(e, providerName(s)))
}
