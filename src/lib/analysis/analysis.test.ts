import { describe, expect, it } from "vitest"
import { parseResume, type Resume } from "@/lib/resume/schema"
import { analyzeResume } from "./analyze"
import { resumeToPlainText } from "./plaintext"
import { buildReviewPrompt, chatLink, AI_CHATS, MAX_PREFILL_CHARS } from "./prompts"
import { isActionVerb } from "./words"

const strong = (): Resume =>
  parseResume({
    basics: { name: "Abebe Kebede", email: "abebe@example.com", phone: "+251 911 000000", location: "Addis Ababa", linkedin: "linkedin.com/in/abebe" },
    summary: "Frontend engineer with 3 years building React apps for fintech.",
    experience: [
      {
        id: "x1",
        role: "Frontend Engineer",
        company: "Chapa",
        start: { month: "Aug", year: "2022" },
        current: true,
        bullets: ["Built the merchant dashboard used by 400 merchants", "Cut page load time by 45% with code-splitting", "Led a team of 3 engineers on the payments API"],
      },
    ],
    education: [{ id: "e1", school: "Addis Ababa University", degree: "B.Sc. Software Engineering", start: { year: "2018" }, end: { year: "2022" } }],
    skills: [{ id: "s1", name: "Languages", items: "TypeScript, Python" }],
  })

const rules = (r: Resume) => analyzeResume(r).issues.map((i) => i.rule)

describe("isActionVerb", () => {
  it("accepts past, present and irregular forms", () => {
    for (const w of ["Built", "build", "builds", "Led", "lead", "Reduced", "reduce", "optimize", "Spearheaded"]) expect(isActionVerb(w), w).toBe(true)
  })
  it("knows common verbs that real CVs open with", () => {
    for (const w of ["Ensured", "Posted", "Demonstrated", "Practiced", "Focused", "Mastered", "Applied", "Utilized"]) expect(isActionVerb(w), w).toBe(true)
  })
  it("rejects non-verbs", () => {
    for (const w of ["The", "Responsible", "Team", ""]) expect(isActionVerb(w), w).toBe(false)
  })
})

describe("analyzeResume", () => {
  it("gives a strong CV a high score and no errors", () => {
    const report = analyzeResume(strong(), { pages: 1 })
    expect(report.counts.error).toBe(0)
    expect(report.score).toBeGreaterThanOrEqual(85)
    expect(report.stats).toMatchObject({ bullets: 3, bulletsWithNumbers: 3, pages: 1 })
  })

  it("flags an empty CV as needing work", () => {
    const report = analyzeResume(parseResume({}))
    expect(report.score).toBeLessThan(65)
    expect(rules(parseResume({}))).toEqual(expect.arrayContaining(["basics.name", "basics.email", "skills.missing", "experience.missing"]))
  })

  it("catches weak openers and missing numbers", () => {
    const r = strong()
    r.experience[0].bullets = ["Responsible for the dashboard", "Worked on the API"]
    const found = rules(r)
    expect(found.filter((x) => x === "bullet.weak-opener")).toHaveLength(2)
    expect(found).toContain("entry.no-metrics")
  })

  it("catches backwards dates, emoji, duplicate skills and buzzwords", () => {
    const r = strong()
    r.education[0].start = { month: "", year: "2023" }
    r.basics.headline = "Engineer 🚀"
    r.skills[0].items = "React, react"
    r.summary = "Hard-working team player."
    expect(rules(r)).toEqual(expect.arrayContaining(["date.backwards", "text.emoji", "skills.duplicate", "text.buzzword"]))
  })

  it("flags [placeholders] left over from AI suggestions", () => {
    const r = strong()
    r.experience[0].bullets[0] = "Built the dashboard used by [N] merchants"
    expect(rules(r)).toContain("text.placeholder")
    expect(rules(strong())).not.toContain("text.placeholder")
  })

  it("puts errors before warnings before tips", () => {
    const order = analyzeResume(parseResume({})).issues.map((i) => i.severity)
    const rank = { error: 0, warning: 1, tip: 2 }
    const ranks = order.map((s) => rank[s])
    expect(ranks).toEqual(ranks.toSorted())
  })

  it("caps how much one repeated rule can cost", () => {
    const r = strong()
    r.experience[0].bullets = Array.from({ length: 12 }, (_, i) => `the thing number ${i} was done somehow`)
    expect(analyzeResume(r).score).toBeGreaterThan(50)
  })

  it("warns about long CVs", () => {
    expect(rules(strong())).not.toContain("length.pages")
    expect(analyzeResume(strong(), { pages: 3 }).issues.map((i) => i.rule)).toContain("length.pages")
  })
})

describe("resumeToPlainText", () => {
  it("lists sections in order with readable links", () => {
    const text = resumeToPlainText(strong())
    expect(text).toContain("linkedin.com/in/abebe")
    expect(text.indexOf("SUMMARY")).toBeLessThan(text.indexOf("WORK EXPERIENCE"))
    expect(text).toContain("Frontend Engineer | Chapa (Aug 2022 – Present)")
    expect(text).toContain("- Cut page load time by 45% with code-splitting")
  })

  it("redacts contact details when asked", () => {
    const text = resumeToPlainText(strong(), { redactContact: true })
    expect(text).not.toContain("abebe@example.com")
    expect(text).not.toContain("Abebe Kebede")
    expect(text).toContain("[EMAIL]")
  })
})

describe("buildReviewPrompt", () => {
  it("includes the rules, the findings and the CV, and hides contacts by default", () => {
    const r = strong()
    r.experience[0].bullets.push("Responsible for deployments")
    const prompt = buildReviewPrompt(r, analyzeResume(r, { pages: 1 }), { targetRole: "Frontend Engineer" })
    expect(prompt).toContain("Never invent facts")
    expect(prompt).toContain('Starts with "responsible for"')
    expect(prompt).toContain("<cv>")
    expect(prompt).toContain("hires for Frontend Engineer roles")
    expect(prompt).not.toContain("abebe@example.com")
  })

  it("asks the AI to infer the role when none is given", () => {
    expect(buildReviewPrompt(strong(), analyzeResume(strong()))).toContain("Infer the most likely role")
  })
})

describe("chatLink", () => {
  it("pre-fills short prompts and falls back to the home page for long ones", () => {
    const chatgpt = AI_CHATS[0]
    expect(chatLink(chatgpt, "hello").prefilled).toBe(true)
    expect(chatLink(chatgpt, "x".repeat(MAX_PREFILL_CHARS + 1))).toEqual({ href: chatgpt.home, prefilled: false })
    expect(chatLink(AI_CHATS[2], "hello").prefilled).toBe(false)
  })
})
