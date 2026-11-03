import { describe, expect, it } from "vitest"
import { analyzeResume } from "@/lib/analysis/analyze"
import { resumeToPlainText } from "@/lib/analysis/plaintext"
import { fromJsonResume, toJsonResume } from "@/lib/portability/json"
import { defaultDesign, DesignSchema, FONT_SIZE, MM_TO_PX, pageGeometry, pagesForHeight, shrinkSteps } from "./design"
import { formatRange, formatYearMonth } from "./format"
import { parseResume, sectionTitle } from "./schema"

describe("DesignSchema", () => {
  it("gives old saves the default design", () => {
    expect(parseResume({}).design).toEqual(defaultDesign())
    expect(parseResume({ design: "nonsense" }).design).toEqual(defaultDesign())
  })

  it("repairs bad values one field at a time", () => {
    const d = DesignSchema.parse({ template: "modern", font: "comic-sans", accent: "red", fontSize: 30, headings: { skills: "Tools", summary: 5 } })
    expect(d.template).toBe("modern")
    expect(d.font).toBe("arial")
    expect(d.accent).toBe("#1E3A8A")
    expect(d.fontSize).toBe(FONT_SIZE.max)
    expect(d.headings).toEqual({ skills: "Tools", summary: "" })
  })

  it("snaps font sizes to half points", () => {
    expect(DesignSchema.parse({ fontSize: 10.3 }).fontSize).toBe(10.5)
    expect(DesignSchema.parse({ fontSize: 2 }).fontSize).toBe(FONT_SIZE.min)
  })

  it("never shares default objects between calls", () => {
    const a = parseResume({})
    a.design.headings.skills = "changed"
    expect(parseResume({}).design.headings).toEqual({})
  })
})

describe("page geometry", () => {
  it("knows A4 and US Letter", () => {
    expect(pageGeometry({ paper: "a4", margins: "normal" }).widthMm).toBe(210)
    expect(pageGeometry({ paper: "letter", margins: "normal" }).heightMm).toBeCloseTo(279.4)
  })

  it("counts pages from the measured height", () => {
    const g = pageGeometry({ paper: "a4", margins: "normal" })
    const sheet = (contentPx: number) => contentPx + 2 * g.padYPx
    expect(pagesForHeight(sheet(100), g)).toBe(1)
    expect(pagesForHeight(sheet(g.contentPerPagePx), g)).toBe(1)
    expect(pagesForHeight(sheet(g.contentPerPagePx + 40), g)).toBe(2)
  })

  it("fits more on a page with narrow margins", () => {
    const narrow = pageGeometry({ paper: "a4", margins: "narrow" })
    const wide = pageGeometry({ paper: "a4", margins: "wide" })
    expect(narrow.contentPerPagePx).toBeGreaterThan(wide.contentPerPagePx)
    expect(narrow.contentPerPagePx).toBeCloseTo((297 - 16) * MM_TO_PX)
  })
})

describe("shrinkSteps", () => {
  it("tightens spacing, then margins, then text size, never below the minimum", () => {
    const steps = shrinkSteps({ ...defaultDesign(), spacing: "relaxed", margins: "wide", fontSize: 10 })
    expect(steps.map((s) => [s.spacing, s.margins, s.fontSize])).toEqual([
      ["normal", "wide", 10],
      ["compact", "wide", 10],
      ["compact", "normal", 10],
      ["compact", "narrow", 10],
      ["compact", "narrow", 9.5],
      ["compact", "narrow", 9],
    ])
  })

  it("keeps the template, font and colour", () => {
    const d = { ...defaultDesign(), template: "elegant" as const, font: "georgia" as const, accent: "#0F766E" }
    for (const s of shrinkSteps(d)) expect([s.template, s.font, s.accent]).toEqual(["elegant", "georgia", "#0F766E"])
  })

  it("has nothing left to try when already at the tightest layout", () => {
    expect(shrinkSteps({ ...defaultDesign(), spacing: "compact", margins: "narrow", fontSize: 9 })).toEqual([])
  })
})

describe("date styles", () => {
  const sep = { month: "Sep", year: "2022" }
  it("formats short, long and numeric dates", () => {
    expect(formatYearMonth(sep)).toBe("Sep 2022")
    expect(formatYearMonth(sep, "long")).toBe("September 2022")
    expect(formatYearMonth(sep, "numeric")).toBe("09/2022")
    expect(formatYearMonth({ month: "", year: "2022" }, "numeric")).toBe("2022")
    expect(formatRange(sep, { month: "", year: "" }, true, "long")).toBe("September 2022 – Present")
  })
})

describe("section titles", () => {
  const cv = () =>
    parseResume({
      summary: "Engineer.",
      experience: [{ role: "Engineer", company: "Chapa", start: { month: "Aug", year: "2022" }, current: true }],
    })

  it("uses the custom title in the CV text, or the standard one", () => {
    const r = cv()
    expect(sectionTitle(r, "experience")).toBe("Work Experience")
    r.design.headings.experience = "  Experience "
    r.design.dateStyle = "numeric"
    const text = resumeToPlainText(r)
    expect(text).toContain("\nEXPERIENCE\n")
    expect(text).toContain("(08/2022 – Present)")
  })

  it("only warns about titles an ATS may not recognise", () => {
    const r = cv()
    r.design.headings = { experience: "Professional Experience", skills: "Skills & Tools", summary: "My Journey" }
    const flagged = analyzeResume(r).issues.filter((i) => i.rule === "design.heading").map((i) => i.quote)
    expect(flagged).toEqual(["My Journey"])
  })

  it("warns when text is shrunk below 9.5 pt", () => {
    const r = cv()
    expect(analyzeResume(r).issues.map((i) => i.rule)).not.toContain("design.small-text")
    r.design.fontSize = 9
    expect(analyzeResume(r).issues.find((i) => i.rule === "design.small-text")?.section).toBe("design")
  })
})

describe("JSON Resume", () => {
  it("round-trips the design through meta", () => {
    const r = parseResume({ basics: { name: "A" }, design: { template: "compact", paper: "letter", accent: "#166534" } })
    const back = fromJsonResume(JSON.parse(JSON.stringify(toJsonResume(r))))
    expect(back.design).toMatchObject({ template: "compact", paper: "letter", accent: "#166534" })
  })
})
