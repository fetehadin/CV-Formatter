import { describe, expect, it } from "vitest"
import { parseResume } from "@/lib/resume/schema"
import { guardSuggestion } from "./guard"
import { AiError, extractJson, GEMINI_FALLBACKS, pickTextModels, sseData, withGeminiFallback } from "./providers"
import { AiSettingsSchema, isConfigured } from "./settings"
import { BulletResultSchema, bulletAsk, sourceText, summaryAsk } from "./tasks"

const resume = parseResume({
  basics: { name: "Abebe Kebede", email: "abebe@example.com", phone: "+251 911 000000" },
  experience: [{ id: "x", role: "Frontend Engineer", company: "Chapa", current: true, bullets: ["Built the merchant dashboard in React", "Cut load time by 45%"] }],
  skills: [{ id: "s", name: "", items: "React, TypeScript" }],
})

describe("guardSuggestion", () => {
  const source = sourceText(resume)

  it("passes a rewrite that only uses known facts", () => {
    const r = guardSuggestion("Reduced dashboard load time by 45% using React code-splitting", source)
    expect(r).toMatchObject({ ok: true, newNumbers: [], newSkills: [] })
  })

  it("flags invented numbers and skills", () => {
    const r = guardSuggestion("Built a React and GraphQL dashboard for 400 merchants, raising revenue 3x", source)
    expect(r.ok).toBe(false)
    expect(r.newNumbers).toEqual(expect.arrayContaining(["400", "3x"]))
    expect(r.newSkills).toContain("GraphQL")
    expect(r.newSkills).not.toContain("React")
  })

  it("treats [placeholders] as gaps to fill, not invented facts", () => {
    const r = guardSuggestion("Built the dashboard used by [N] merchants, saving [X%] support time", source)
    expect(r.ok).toBe(true)
    expect(r.placeholders).toEqual(["[N]", "[X%]"])
  })

  it("matches numbers written differently", () => {
    expect(guardSuggestion("Cut load time by 45 percent", source).ok).toBe(true)
  })
})

describe("prompts", () => {
  it("never send contact details", () => {
    const ask = bulletAsk(resume, { title: "Frontend Engineer", current: true, bullets: resume.experience[0].bullets }, "Built the merchant dashboard in React", null)
    const all = ask.system + ask.prompt + summaryAsk(resume, null).prompt
    expect(all).not.toContain("abebe@example.com")
    expect(all).not.toContain("911")
    expect(all).not.toContain("Abebe")
  })

  it("asks for present tense on current roles and leaves the target bullet out of 'others'", () => {
    const ask = bulletAsk(resume, { title: "FE", current: true, bullets: resume.experience[0].bullets }, "Cut load time by 45%", null)
    expect(ask.system).toContain("present tense")
    const others = ask.prompt.split("Other bullets in this entry")[1].split("Bullet to rewrite")[0]
    expect(others).toContain("- Built the merchant dashboard in React")
    expect(others).not.toContain("Cut load time")
  })

  it("adds the job only when there is one", () => {
    expect(summaryAsk(resume, null).prompt).not.toContain("<job_description>")
    const job = { company: "Acme", title: "Dev", url: "", description: "Need React", status: "saved" as const, notes: "" }
    expect(summaryAsk(resume, job).prompt).toContain("<job_description>")
  })
})

describe("extractJson", () => {
  it("reads plain, fenced and wrapped JSON", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 })
    expect(extractJson('Sure!\n```json\n{"a":2}\n```')).toEqual({ a: 2 })
    expect(extractJson('Here: {"a":{"b":3}} done')).toEqual({ a: { b: 3 } })
    expect(() => extractJson("no json")).toThrow(AiError)
  })

  it("validates the bullet shape", () => {
    expect(BulletResultSchema.safeParse({ variants: [], question: "" }).success).toBe(false)
    expect(BulletResultSchema.parse({ variants: [{ text: "x" }] })).toEqual({ variants: [{ text: "x", focus: "" }], question: "" })
  })
})

describe("pickTextModels", () => {
  it("drops speech/image/music models and puts the recommended one first", () => {
    const ids = ["gemini-2.5-flash", "gemini-2.5-flash-preview-tts", "gemini-3-pro-image", "lyria-3.5", "gemini-flash-latest", "gemini-robotics-er-2-preview", "gemma-4-31b-it", "nano-banana-pro-preview"]
    expect(pickTextModels(ids, ["gemini-flash-latest", "missing"])).toEqual(["gemini-flash-latest", "gemini-2.5-flash", "gemma-4-31b-it"])
  })
})

describe("sseData", () => {
  it("splits events across chunk boundaries", async () => {
    const enc = new TextEncoder()
    const chunks = ['data: {"a":1}\n\nda', 'ta: {"a":2}\r\n\r\n', "data: [DONE]\n\n"]
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        for (const ch of chunks) c.enqueue(enc.encode(ch))
        c.close()
      },
    })
    const out: string[] = []
    for await (const d of sseData(body)) out.push(d)
    expect(out).toEqual(['{"a":1}', '{"a":2}', "[DONE]"])
  })
})

describe("AI settings", () => {
  it("needs a key and model for cloud providers, a base URL for OpenAI-style", () => {
    const s = AiSettingsSchema.parse({})
    expect(isConfigured(s)).toBe(false)
    expect(isConfigured({ ...s, apiKey: "k", model: "claude-opus-5-5" })).toBe(true)
    expect(isConfigured({ ...s, provider: "openai", model: "llama3", apiKey: "" })).toBe(true)
    expect(isConfigured({ ...s, provider: "ondevice", model: "" })).toBe(true)
  })
})

describe("withGeminiFallback", () => {
  const settings = { ...AiSettingsSchema.parse({}), provider: "gemini" as const, apiKey: "k", model: "gemini-2.5-flash" }

  it("moves on from a retired or busy model and reports the one that answered", async () => {
    const tried: string[] = []
    let switched = ""
    const result = await withGeminiFallback(settings, { system: "", prompt: "", onModelChange: (m) => (switched = m) }, async (model) => {
      tried.push(model)
      if (model !== "gemini-flash-latest") throw new AiError("busy", undefined, true)
      return "ok"
    })
    expect(result).toBe("ok")
    expect(tried).toEqual(["gemini-2.5-flash", ...GEMINI_FALLBACKS])
    expect(switched).toBe("gemini-flash-latest")
  })

  it("doesn't retry errors another model can't fix, like a bad key", async () => {
    const tried: string[] = []
    await expect(
      withGeminiFallback(settings, { system: "", prompt: "" }, async (model) => {
        tried.push(model)
        throw new AiError("bad key")
      }),
    ).rejects.toThrow("bad key")
    expect(tried).toEqual(["gemini-2.5-flash"])
  })
})
