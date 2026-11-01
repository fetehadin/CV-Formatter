import { describe, expect, it } from "vitest"
import { buildTailorPrompt } from "@/lib/analysis/prompts"
import { parseResume } from "@/lib/resume/schema"
import { addBlankDocument, createTailoredCopy, deleteDocument, duplicateDocument, emptyJob, jobLabel, loadWorkspace, renameDocument, updateJob } from "@/lib/resume/workspace"
import { addSkill, aliasRegex, extractJobKeywords, matchResume, onlyInSkills } from "./match"

const JD = `Frontend Engineer at Chapa

About the role
You'll build our merchant dashboard with React and talk to the Payments team.

Requirements:
- 3+ years of experience with TypeScript and React
- Solid understanding of REST APIs
- Experience with PostgreSQL

Nice to have:
- Next.js
- Docker
- Familiarity with Kafka. Kafka powers our events.
`

const cv = () =>
  parseResume({
    summary: "Frontend engineer.",
    experience: [{ id: "x", role: "Frontend Engineer", bullets: ["Built dashboards in React and Typescript", "Designed restful APIs with Node"] }],
    skills: [{ id: "s", name: "", items: "React, TS, Docker, PostgreSQL" }],
  })

describe("aliasRegex", () => {
  it("matches whole terms only", () => {
    expect(aliasRegex("java").test("JavaScript")).toBe(false)
    expect(aliasRegex("sql").test("PostgreSQL")).toBe(false)
    expect(aliasRegex("c++").test("Modern C++ code")).toBe(true)
    expect(aliasRegex("node.js").test("Node.js.")).toBe(true)
  })

  it('doesn\'t find "js" inside "Next.js" or "Node.js"', () => {
    expect(aliasRegex("js").test("Next.js and Node.js")).toBe(false)
    expect(aliasRegex(".net").test("C# and .NET")).toBe(true)
  })

  it("respects case-sensitive aliases", () => {
    expect(aliasRegex("=Go").test("we go to market")).toBe(false)
    expect(aliasRegex("=Go").test("services in Go")).toBe(true)
  })

  it("treats spaces and hyphens alike", () => {
    expect(aliasRegex("end to end testing").test("end-to-end testing")).toBe(true)
  })
})

describe("extractJobKeywords", () => {
  const { keywords, years } = extractJobKeywords(JD, { exclude: ["Chapa"] })
  const get = (name: string) => keywords.find((k) => k.name === name)

  it("finds known skills under their canonical name", () => {
    expect(get("TypeScript")).toBeDefined()
    expect(get("REST APIs")).toBeDefined()
  })

  it("reads importance from the section headings and inline words", () => {
    expect(get("TypeScript")?.importance).toBe("required")
    expect(get("PostgreSQL")?.importance).toBe("required")
    expect(get("Docker")?.importance).toBe("preferred")
    expect(get("Next.js")?.importance).toBe("preferred")
  })

  it("keeps the highest importance when a skill appears twice", () => {
    expect(get("React")?.importance).toBe("required")
    expect(get("React")?.count).toBe(2)
  })

  it("picks up repeated unknown terms and skips excluded words", () => {
    expect(keywords.some((k) => k.name === "Chapa")).toBe(false)
    expect(keywords.some((k) => k.name === "Payments")).toBe(false) // said once only
  })

  it("doesn't invent JavaScript from Next.js", () => {
    expect(get("JavaScript")).toBeUndefined()
  })

  it("reads the years asked for", () => {
    expect(years).toBe("3+ years")
  })
})

describe("matchResume", () => {
  it("scores by importance and says where each keyword appears", () => {
    const result = matchResume(cv(), JD)
    const get = (name: string) => result.keywords.find((k) => k.name === name)!
    expect(get("TypeScript")).toMatchObject({ found: true, where: expect.arrayContaining(["experience", "skills"]) })
    expect(get("REST APIs").found).toBe(true) // "restful" in a bullet
    expect(get("Next.js").found).toBe(false)
    expect(onlyInSkills(get("PostgreSQL"))).toBe(true)
    expect(result.score).toBeGreaterThan(50)
    expect(result.score).toBeLessThan(100)
  })

  it("returns no score for an empty description", () => {
    expect(matchResume(cv(), "").score).toBeNull()
  })
})

describe("addSkill", () => {
  it("adds to an Other group once", () => {
    const once = addSkill(cv(), "Next.js")
    expect(once.skills.at(-1)).toMatchObject({ name: "Other", items: "Next.js" })
    const twice = addSkill(addSkill(once, "Kafka"), "next.js")
    expect(twice.skills.at(-1)?.items).toBe("Next.js, Kafka")
  })
})

describe("workspace documents", () => {
  const ws = () => loadWorkspace({ getItem: () => null })

  it("creates a tailored copy linked to its base and switches to it", () => {
    const base = ws()
    const next = createTailoredCopy(base, base.activeId, emptyJob({ company: "Chapa", title: "FE" }))
    expect(next.documents).toHaveLength(2)
    const copy = next.documents[1]
    expect(next.activeId).toBe(copy.id)
    expect(copy).toMatchObject({ baseId: base.activeId, title: "Chapa – FE" })
    copy.resume.basics.name = "changed"
    expect(next.documents[0].resume.basics.name).not.toBe("changed") // deep copy
  })

  it("copies of copies keep pointing at the original base", () => {
    const base = ws()
    const a = createTailoredCopy(base, base.activeId, emptyJob({ company: "A" }))
    const b = createTailoredCopy(a, a.activeId, emptyJob({ company: "B" }))
    expect(b.documents[2].baseId).toBe(base.activeId)
  })

  it("never deletes the last document", () => {
    const base = ws()
    const after = deleteDocument(base, base.activeId)
    expect(after.documents).toHaveLength(1)
    expect(after.activeId).toBe(after.documents[0].id)
  })

  it("renames, duplicates, adds and updates jobs", () => {
    let w = ws()
    const id = w.activeId
    w = renameDocument(w, id, "  Base CV ")
    expect(w.documents[0].title).toBe("Base CV")
    expect(renameDocument(w, id, "   ").documents[0].title).toBe("Base CV")
    w = duplicateDocument(w, id)
    expect(w.documents[1].title).toBe("Base CV (copy)")
    w = addBlankDocument(w)
    expect(w.documents).toHaveLength(3)
    w = updateJob(w, id, { status: "interview" })
    expect(w.documents[0].job?.status).toBe("interview")
  })

  it("labels jobs", () => {
    expect(jobLabel({ company: "", title: "" })).toBe("Untitled job")
    expect(jobLabel({ company: "Chapa", title: "" })).toBe("Chapa")
  })
})

describe("buildTailorPrompt", () => {
  it("includes the job, the gaps, the no-keyword-stuffing rule and the CV", () => {
    const match = matchResume(cv(), JD)
    const prompt = buildTailorPrompt(cv(), { company: "Chapa", title: "Frontend Engineer", description: JD }, match, { coverLetter: true })
    expect(prompt).toContain("Frontend Engineer at Chapa")
    expect(prompt).toContain("Never add a skill")
    expect(prompt).toContain("Not in my CV: ")
    expect(prompt).toContain("Next.js (preferred)")
    expect(prompt).toContain("<job_description>")
    expect(prompt).toContain("Cover letter")
  })
})
