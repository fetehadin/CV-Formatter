import { describe, expect, it } from "vitest"
import { duplicateItem, insertItem, moveItem, moveSection, removeItem, updateItem } from "./edit"
import { cleanBullets, displayUrl, formatRange, isEndBeforeStart, splitList, toHref } from "./format"
import { migrateV2, toBullets } from "./migrate"
import { emptyResume, normalizeSectionOrder, parseResume, SECTION_KEYS } from "./schema"
import { LEGACY_KEY, loadWorkspace, saveWorkspace, STORAGE_KEY } from "./workspace"

const memoryStorage = (init: Record<string, string> = {}) => {
  const data = { ...init }
  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => void (data[k] = v),
  }
}

describe("parseResume", () => {
  it("fills every field when given nothing", () => {
    const r = parseResume(undefined)
    expect(r.basics.name).toBe("")
    expect(r.experience).toEqual([])
    expect(r.sectionOrder).toEqual([...SECTION_KEYS])
  })

  it("repairs wrong types instead of throwing", () => {
    const r = parseResume({ basics: { name: 42 }, experience: "nope", summary: null, skills: [{ items: 7 }] })
    expect(r.basics.name).toBe("")
    expect(r.experience).toEqual([])
    expect(r.summary).toBe("")
    expect(r.skills[0].items).toBe("")
    expect(r.skills[0].id).toMatch(/[0-9a-f-]{36}/)
  })

  it("starts a new CV with one empty job and school", () => {
    const r = emptyResume()
    expect(r.experience).toHaveLength(1)
    expect(r.education).toHaveLength(1)
  })
})

describe("normalizeSectionOrder", () => {
  it("drops unknown and duplicate keys and appends missing ones", () => {
    const order = normalizeSectionOrder(["skills", "bogus", "skills", "summary"])
    expect(order.slice(0, 2)).toEqual(["skills", "summary"])
    expect(new Set(order).size).toBe(SECTION_KEYS.length)
  })
})

describe("migrateV2", () => {
  const v2 = {
    fullname: "Abebe Kebede",
    email: "a@example.com",
    country: "Addis Ababa",
    linkedin: "linkedin.com/in/abebe",
    summary: "Engineer.",
    education: [{ id: "e1", schoolname: "AAU", program: "B.Sc.", eduStartYear: "2018", eduEndYear: "2022", eduDescription: "- GPA 3.7\n\n• Thesis" }],
    experience: [{ id: "x1", company: "Chapa", profession: "Engineer", workStartMonth: "Aug", workStartYear: "2022", workEndYear: "Present", experienceDescription: "Built things" }],
    skills: "React, TypeScript\nNode.js",
  }

  it("maps the old flat fields", () => {
    const r = migrateV2(v2)
    expect(r.basics).toMatchObject({ name: "Abebe Kebede", location: "Addis Ababa", linkedin: "linkedin.com/in/abebe" })
    expect(r.education[0]).toMatchObject({ id: "e1", school: "AAU", degree: "B.Sc.", bullets: ["GPA 3.7", "Thesis"] })
    expect(r.skills[0].items).toBe("React, TypeScript, Node.js")
  })

  it('turns "Present" into current=true', () => {
    const x = migrateV2(v2).experience[0]
    expect(x.current).toBe(true)
    expect(x.end).toEqual({ month: "", year: "" })
    expect(x.start).toEqual({ month: "Aug", year: "2022" })
  })

  it("survives garbage", () => {
    expect(() => migrateV2("not an object")).not.toThrow()
    expect(migrateV2({ education: [null] }).education).toHaveLength(1)
  })

  it("strips typed bullet markers", () => {
    expect(toBullets("- one\n* two\n\n•three")).toEqual(["one", "two", "three"])
  })
})

describe("loadWorkspace", () => {
  it("creates a fresh workspace when storage is empty", () => {
    const ws = loadWorkspace(memoryStorage())
    expect(ws.documents).toHaveLength(1)
    expect(ws.activeId).toBe(ws.documents[0].id)
  })

  it("migrates the legacy key and leaves it as a backup", () => {
    const storage = memoryStorage({ [LEGACY_KEY]: JSON.stringify({ fullname: "Old Save" }) })
    const ws = loadWorkspace(storage)
    expect(ws.documents[0].resume.basics.name).toBe("Old Save")
    expect(storage.data[LEGACY_KEY]).toBeDefined()
  })

  it("does not crash on corrupt JSON", () => {
    const ws = loadWorkspace(memoryStorage({ [STORAGE_KEY]: "{not json" }))
    expect(ws.documents).toHaveLength(1)
  })

  it("round-trips through save", () => {
    const storage = memoryStorage()
    const ws = loadWorkspace(storage)
    ws.documents[0].resume.basics.name = "Saved"
    expect(saveWorkspace(ws, storage)).toBe(true)
    expect(loadWorkspace(storage).documents[0].resume.basics.name).toBe("Saved")
  })

  it("reports a failed save instead of throwing", () => {
    const full = { setItem: () => { throw new Error("QuotaExceededError") } }
    expect(saveWorkspace(loadWorkspace(memoryStorage()), full)).toBe(false)
  })
})

describe("format", () => {
  const ym = (month: string, year: string) => ({ month, year })

  it("formats date ranges", () => {
    expect(formatRange(ym("Sep", "2018"), ym("Jul", "2022"), false)).toBe("Sep 2018 – Jul 2022")
    expect(formatRange(ym("", "2018"), ym("", ""), true)).toBe("2018 – Present")
    expect(formatRange(ym("", "2018"), ym("", ""), false)).toBe("2018")
    expect(formatRange(ym("Jan", ""), ym("", ""), false)).toBe("")
  })

  it("detects an end date before the start", () => {
    expect(isEndBeforeStart(ym("Sep", "2022"), ym("Jan", "2022"), false)).toBe(true)
    expect(isEndBeforeStart(ym("Sep", "2022"), ym("Jan", "2022"), true)).toBe(false)
    expect(isEndBeforeStart(ym("", "2022"), ym("", "20"), false)).toBe(false)
  })

  it("makes links clickable and readable", () => {
    expect(toHref("linkedin.com/in/x")).toBe("https://linkedin.com/in/x")
    expect(toHref("http://x.dev")).toBe("http://x.dev")
    expect(toHref("mailto:a@b.c")).toBe("mailto:a@b.c")
    expect(toHref("  ")).toBe("")
    expect(displayUrl("https://www.linkedin.com/in/abebe/")).toBe("linkedin.com/in/abebe")
  })

  it("cleans bullets and lists", () => {
    expect(cleanBullets(["- a", "", "  ", "● b"])).toEqual(["a", "b"])
    expect(splitList("React,  TS ;Node\n,")).toEqual(["React", "TS", "Node"])
  })
})

describe("edit helpers", () => {
  const base = () =>
    parseResume({
      experience: [
        { id: "a", role: "A" },
        { id: "b", role: "B" },
        { id: "c", role: "C" },
      ],
    })
  const ids = (r: ReturnType<typeof base>) => r.experience.map((x) => x.id)

  it("moves items and ignores moves past the ends", () => {
    expect(ids(moveItem(base(), "experience", "a", 1))).toEqual(["b", "a", "c"])
    const r = base()
    expect(moveItem(r, "experience", "a", -1)).toBe(r)
  })

  it("duplicates right after the original with a new id", () => {
    const r = duplicateItem(base(), "experience", "a")
    expect(r.experience[1].role).toBe("A")
    expect(r.experience[1].id).not.toBe("a")
  })

  it("removes and restores at the same position", () => {
    const original = base()
    const removed = removeItem(original, "experience", "b")
    expect(ids(removed)).toEqual(["a", "c"])
    expect(ids(insertItem(removed, "experience", original.experience[1], 1))).toEqual(["a", "b", "c"])
  })

  it("updates one item without touching the others", () => {
    const r = updateItem(base(), "experience", "b", { role: "Lead" })
    expect(r.experience.map((x) => x.role)).toEqual(["A", "Lead", "C"])
  })

  it("moves whole sections", () => {
    const r = moveSection(base(), "experience", -1)
    expect(r.sectionOrder.slice(0, 2)).toEqual(["experience", "summary"])
  })
})
