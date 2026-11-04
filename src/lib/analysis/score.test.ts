import { describe, expect, it } from "vitest"
import { PROFILES } from "@/lib/resume/design"
import { exampleResume } from "@/lib/resume/example"
import { parseResume, SECTION_KEYS, type Resume, type SectionKey } from "@/lib/resume/schema"
import { analyzeResume } from "./analyze"
import { allocate, bandFor, MUST_FIX_CAP, scoreResume, SECTION_POINTS } from "./score"

const cv = (): Resume =>
  parseResume({
    basics: { name: "Fetehadin Negash", email: "fetehadinnegash@gmail.com", phone: "+251 986 955 964", location: "Addis Ababa, Ethiopia", github: "github.com/fetehadin" },
    summary: "Full-stack software engineer building scalable web applications with Python, Django and Next.js.",
    experience: [
      {
        role: "Full-Stack Software Engineer",
        company: "EduConnect",
        start: { month: "Jul", year: "2025" },
        current: true,
        bullets: ["Designed a role-based access control system for 3 campus services", "Built a dashboard tracking academic events with Django and PostgreSQL", "Implemented an announcement board used across the campus"],
      },
    ],
    education: [{ school: "HiLCoE", degree: "B.Sc. Software Engineering", start: { year: "2025" }, current: true }],
    projects: [{ name: "Library Management System", tech: "Django, PostgreSQL", bullets: ["Built CRUD operations with optimized queries for 500 books"] }],
    skills: [{ items: "Python, Django, JavaScript, Next.js, PostgreSQL, Docker" }],
    design: { hidden: ["certifications", "languages"] },
  })

const total = (r: Resume, pages = 1) => {
  const s = scoreResume(r, { pages })
  if (s.status !== "scored") throw new Error(`unscored: ${s.needed.join(", ")}`)
  return s
}
const part = (r: Resume, id: string) => scoreResume(r, { pages: 1 }).parts.find((p) => p.id === id)

describe("scoreResume: when to score", () => {
  it("gives no number to an empty CV or to contact details alone", () => {
    expect(scoreResume(parseResume({})).status).toBe("unscored")
    expect(scoreResume(parseResume({ basics: { name: "A B", email: "a@b.co", phone: "1" } })).status).toBe("unscored")
  })

  it("scores once there is a name, two filled sections and enough words", () => {
    expect(total(cv()).score).toBeGreaterThan(0)
  })
})

describe("scoreResume: weights", () => {
  it("always adds up to 100, for every career stage and any set of sections", () => {
    for (const profile of PROFILES) {
      for (const hidden of [[], ["languages"], ["projects", "certifications", "languages"], ["summary", "skills"]] as SectionKey[][]) {
        const r = cv()
        r.design = { ...r.design, profile, hidden }
        const parts = scoreResume(r).parts
        expect(parts.reduce((a, p) => a + p.max, 0), `${profile} ${hidden}`).toBe(100)
        for (const key of hidden) expect(parts.map((p) => p.id)).not.toContain(key)
      }
    }
  })

  it("hands a hidden section's points to the others", () => {
    const r = cv()
    const before = part(r, "experience")!.max
    r.design.hidden = [...r.design.hidden, "projects"]
    expect(part(r, "experience")!.max).toBeGreaterThan(before)
    expect(part(r, "projects")).toBeUndefined()
  })

  it("gives nothing for a section left on but empty, and says so", () => {
    const r = cv()
    r.design.hidden = []
    const langs = part(r, "languages")!
    expect(langs.earned).toBe(0)
    expect(langs.hint).toMatch(/remove this section in Design/)
    // Removing the empty sections raises the score.
    r.design.hidden = ["certifications", "languages"]
    const withEmpty = cv()
    withEmpty.design.hidden = []
    expect(total(r).score).toBeGreaterThan(total(withEmpty).score)
  })

  it("weights education and projects above experience for students", () => {
    const r = cv()
    r.design.profile = "early"
    expect(part(r, "education")!.max).toBeGreaterThan(part(r, "experience")!.max)
    expect(part(r, "projects")!.max).toBeGreaterThan(part(r, "experience")!.max)
    r.design.profile = "experienced"
    expect(part(r, "experience")!.max).toBeGreaterThan(part(r, "education")!.max * 2)
  })

  it("splits points into whole numbers that add up exactly", () => {
    const parts = allocate(SECTION_POINTS, { a: 1, b: 1, c: 1 })
    expect(Object.values(parts).reduce((x, y) => x + y, 0)).toBe(SECTION_POINTS)
    expect(Object.values(parts).toSorted()).toEqual([25, 25, 25])
  })
})

describe("scoreResume: fairness", () => {
  it("never lowers the score for adding a good bullet", () => {
    const r = cv()
    const before = total(r).score
    r.experience[0].bullets.push("Cut page load time by 40% by caching database queries")
    expect(total(r).score).toBeGreaterThanOrEqual(before)
  })

  it("measures bullets as a share, so more good writing isn't punished", () => {
    const short = cv()
    const long = cv()
    long.experience[0].bullets = [...long.experience[0].bullets, ...long.experience[0].bullets]
    expect(part(long, "experience")!.earned).toBe(part(short, "experience")!.earned)
  })

  it("rewards numbers in bullets", () => {
    const vague = cv()
    vague.experience[0].bullets = ["Designed a role-based access control system", "Built a dashboard tracking academic events", "Implemented an announcement board"]
    expect(part(cv(), "experience")!.earned).toBeGreaterThan(part(vague, "experience")!.earned)
    expect(part(vague, "experience")!.hint).toMatch(/0 of 3 bullets show a result with a number/)
  })

  it("holds the score below Good while a Must fix remains", () => {
    const r = cv()
    r.basics.email = ""
    const report = analyzeResume(r, { pages: 1 })
    expect(report.counts.error).toBeGreaterThan(0)
    expect(report.score.status === "scored" && report.score.score).toBeLessThanOrEqual(MUST_FIX_CAP)
  })

  it("expects one page for a student and up to two otherwise", () => {
    const r = cv()
    r.design.profile = "early"
    expect(part(r, "format")!.earned).toBe(15)
    expect(scoreResume(r, { pages: 2 }).parts.find((p) => p.id === "format")!.earned).toBeLessThan(15)
    r.design.profile = "experienced"
    expect(scoreResume(r, { pages: 2 }).parts.find((p) => p.id === "format")!.earned).toBe(15)
  })

  it("scores the maker's real CV, with the gap being numbers", () => {
    const s = total(exampleResume(), 2)
    expect(s.parts.map((p) => p.id)).toEqual(["contact", "summary", "education", "experience", "projects", "skills", "format"])
    expect(part(exampleResume(), "experience")!.hint).toMatch(/show a result with a number/)
  })

  it("has the agreed bands", () => {
    expect([bandFor(90), bandFor(85), bandFor(84), bandFor(70), bandFor(69), bandFor(50), bandFor(49)]).toEqual(["strong", "strong", "good", "good", "fair", "fair", "weak"])
  })
})

it("covers every section", () => {
  const r = cv()
  r.design.hidden = []
  expect(scoreResume(r).parts.map((p) => p.id).toSorted()).toEqual(["contact", "format", ...SECTION_KEYS].toSorted())
})
