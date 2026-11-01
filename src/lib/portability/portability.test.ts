import { describe, expect, it } from "vitest"
import { resumeToPlainText } from "@/lib/analysis/plaintext"
import { parseResume } from "@/lib/resume/schema"
import { loadWorkspace } from "@/lib/resume/workspace"
import { fromIsoDate, fromJsonResume, mergeWorkspace, readJson, toBackup, toIsoDate, toJsonResume } from "./json"
import { parseCvText, takeDates } from "./parse-text"
import { itemsToLines } from "./pdf"

const sample = () =>
  parseResume({
    basics: { name: "Abebe Kebede", headline: "Frontend Engineer", email: "abebe@example.com", phone: "+251 911 000000", location: "Addis Ababa, Ethiopia", linkedin: "linkedin.com/in/abebe", github: "github.com/abebe" },
    summary: "Frontend engineer with 3 years building React apps.",
    experience: [{ id: "x", role: "Frontend Engineer", company: "Chapa", start: { month: "Aug", year: "2022" }, current: true, bullets: ["Built the merchant dashboard", "Cut load time by 45%"] }],
    education: [{ id: "e", school: "Addis Ababa University", degree: "B.Sc. Software Engineering", start: { month: "Sep", year: "2018" }, end: { month: "Jul", year: "2022" }, bullets: ["GPA 3.7"] }],
    projects: [{ id: "p", name: "Clinic Records", tech: "React, IndexedDB", bullets: ["Offline-first app used by 3 clinics"] }],
    skills: [{ id: "s", name: "Languages", items: "TypeScript, Python" }],
    certifications: [{ id: "c", name: "AWS Cloud Practitioner", issuer: "Amazon", date: { month: "Mar", year: "2023" } }],
    languages: [{ id: "l", language: "Amharic", fluency: "Native" }, { id: "l2", language: "English", fluency: "Fluent" }],
  })

describe("takeDates", () => {
  it("reads common date formats", () => {
    expect(takeDates("Chapa | Aug 2022 – Present")).toMatchObject({ rest: "Chapa", start: { month: "Aug", year: "2022" }, current: true })
    expect(takeDates("September 2018 - July 2022")).toMatchObject({ start: { month: "Sep", year: "2018" }, end: { month: "Jul", year: "2022" } })
    expect(takeDates("03/2021 to 11/2023")).toMatchObject({ start: { month: "Mar", year: "2021" }, end: { month: "Nov", year: "2023" } })
    expect(takeDates("2019 — 2021")).toMatchObject({ start: { year: "2019" }, end: { year: "2021" } })
    expect(takeDates("Frontend Engineer")).toBeNull()
  })
})

describe("parseCvText", () => {
  it("round-trips our own plain text", () => {
    const { resume, warnings } = parseCvText(resumeToPlainText(sample()))
    expect(warnings).toEqual([])
    expect(resume.basics).toMatchObject({ name: "Abebe Kebede", email: "abebe@example.com", phone: "+251 911 000000", location: "Addis Ababa, Ethiopia" })
    expect(resume.basics.linkedin).toContain("linkedin.com/in/abebe")
    expect(resume.experience[0]).toMatchObject({ role: "Frontend Engineer", company: "Chapa", current: true, bullets: ["Built the merchant dashboard", "Cut load time by 45%"] })
    expect(resume.education[0]).toMatchObject({ school: "Addis Ababa University", degree: "B.Sc. Software Engineering" })
    expect(resume.projects[0]).toMatchObject({ name: "Clinic Records", tech: "React, IndexedDB" })
    expect(resume.skills[0]).toMatchObject({ name: "Languages", items: "TypeScript, Python" })
    expect(resume.languages.map((l) => [l.language, l.fluency])).toEqual([["Amharic", "Native"], ["English", "Fluent"]])
    expect(resume.certifications[0]).toMatchObject({ name: "AWS Cloud Practitioner", issuer: "Amazon" })
  })

  it("reads a typical CV laid out by Word or a PDF", () => {
    const text = `Sara Tesfaye
Addis Ababa, Ethiopia • sara.t@mail.com • +251 922 111 222 • linkedin.com/in/sarat

PROFESSIONAL EXPERIENCE
Ethio Telecom | Jan 2021 – Present
Data Analyst
• Built weekly churn dashboards in Power BI for 12 regional managers
• Automated a reporting pipeline in Python, saving 10 hours a week
Safaricom Ethiopia | 06/2019 - 12/2020
Junior Analyst
• Cleaned and merged billing data from 4 systems

EDUCATION
Bahir Dar University, B.A. Economics, 2015 - 2019

Skills
Python, SQL, Power BI, Excel`
    const { resume, found } = parseCvText(text)
    expect(found).toEqual(expect.arrayContaining(["experience", "education", "skills"]))
    expect(resume.basics).toMatchObject({ name: "Sara Tesfaye", email: "sara.t@mail.com", location: "Addis Ababa, Ethiopia" })
    expect(resume.experience).toHaveLength(2)
    expect(resume.experience[0]).toMatchObject({ company: "Ethio Telecom", role: "Data Analyst", current: true })
    expect(resume.experience[0].bullets).toHaveLength(2)
    expect(resume.experience[1]).toMatchObject({ company: "Safaricom Ethiopia", role: "Junior Analyst", start: { month: "Jun", year: "2019" } })
    expect(resume.education[0]).toMatchObject({ school: "Bahir Dar University", degree: "B.A. Economics", start: { year: "2015" } })
    expect(resume.skills[0].items).toBe("Python, SQL, Power BI, Excel")
  })

  it("joins a bullet that wrapped onto the next line", () => {
    const { resume } = parseCvText("Name Here\nExperience\nAcme | 2020 - 2021\nEngineer\n• Built a thing that was long enough to\nwrap onto a second line")
    expect(resume.experience[0].bullets).toEqual(["Built a thing that was long enough to wrap onto a second line"])
  })

  it("reads a PDF of our own layout (bullets without markers, name in capitals)", () => {
    const text = `ABEBE KEBEDE
Addis Ababa, Ethiopia | +251 911 000000 | abebe@example.com
WORK EXPERIENCE
Chapa Financial Technologies | Aug 2022 – Present
Frontend Engineer
Built merchant dashboard in React + TypeScript
Cut page load time by 45% by code-splitting
Mentored 2 interns
EDUCATION
Addis Ababa University | Sep 2018 – Jul 2022
B.Sc. Software Engineering
GPA 3.7/4.0`
    const { resume } = parseCvText(text)
    expect(resume.basics.name).toBe("Abebe Kebede")
    expect(resume.experience).toHaveLength(1)
    expect(resume.experience[0].bullets).toHaveLength(3)
    expect(resume.education).toHaveLength(1)
    expect(resume.education[0].bullets).toEqual(["GPA 3.7/4.0"])
  })

  it("warns when headings are missing", () => {
    expect(parseCvText("just some words").warnings.length).toBeGreaterThan(0)
  })
})

describe("itemsToLines", () => {
  it("groups by line, orders left to right and separates far-apart text", () => {
    const lines = itemsToLines([
      { str: "Aug 2022 – Present", x: 450, y: 700, w: 80, h: 10 },
      { str: "Chapa", x: 50, y: 700.5, w: 30, h: 10 },
      { str: "Frontend", x: 50, y: 686, w: 40, h: 10 },
      { str: "Engineer", x: 93, y: 686, w: 40, h: 10 },
    ])
    expect(lines).toEqual(["Chapa | Aug 2022 – Present", "Frontend Engineer"])
  })
})

describe("JSON Resume", () => {
  it("converts dates both ways", () => {
    expect(toIsoDate({ month: "Aug", year: "2022" })).toBe("2022-08")
    expect(toIsoDate({ month: "", year: "2022" })).toBe("2022")
    expect(toIsoDate({ month: "", year: "" })).toBeUndefined()
    expect(fromIsoDate("2022-08-15")).toEqual({ month: "Aug", year: "2022" })
    expect(fromIsoDate(42)).toEqual({ month: "", year: "" })
  })

  it("round-trips a CV through the open format", () => {
    const original = sample()
    const back = fromJsonResume(JSON.parse(JSON.stringify(toJsonResume(original))))
    expect(back.basics).toMatchObject({ name: "Abebe Kebede", email: "abebe@example.com", location: "Addis Ababa, Ethiopia" })
    expect(back.basics.linkedin).toBe("https://linkedin.com/in/abebe")
    expect(back.experience[0]).toMatchObject({ role: "Frontend Engineer", company: "Chapa", current: true, start: { month: "Aug", year: "2022" } })
    expect(back.experience[0].bullets).toEqual(original.experience[0].bullets)
    expect(back.skills[0]).toMatchObject({ name: "Languages", items: "TypeScript, Python" })
    expect(back.sectionOrder).toEqual(original.sectionOrder)
  })

  it("reads files made by other JSON Resume tools", () => {
    const r = fromJsonResume({
      basics: { name: "Lena", location: { city: "Berlin", countryCode: "DE" }, profiles: [{ network: "GitHub", username: "lena" }] },
      work: [{ name: "Acme", position: "Dev", startDate: "2020-01", endDate: "2021-06", summary: "Did things", highlights: ["Shipped X"] }],
      education: [{ institution: "TU", studyType: "M.Sc.", area: "CS", score: "1.3" }],
    })
    expect(r.basics).toMatchObject({ location: "Berlin, DE", github: "github.com/lena" })
    expect(r.experience[0]).toMatchObject({ current: false, end: { month: "Jun", year: "2021" }, bullets: ["Did things", "Shipped X"] })
    expect(r.education[0]).toMatchObject({ degree: "M.Sc. CS", bullets: ["GPA 1.3"] })
  })
})

describe("readJson", () => {
  it("recognises each kind of file", () => {
    const ws = loadWorkspace({ getItem: () => null })
    expect(readJson(JSON.stringify(toBackup(ws))).kind).toBe("backup")
    expect(readJson(JSON.stringify(toJsonResume(sample()))).kind).toBe("jsonresume")
    expect(readJson(JSON.stringify(sample())).kind).toBe("native")
    expect(readJson("{oops").kind).toBe("unknown")
    expect(readJson("[1,2]").kind).toBe("unknown")
  })

  it("merges a backup without overwriting, keeping base links", () => {
    const mine = loadWorkspace({ getItem: () => null })
    const theirs = loadWorkspace({ getItem: () => null })
    theirs.documents.push({ ...theirs.documents[0], id: "copy", baseId: theirs.documents[0].id })
    const merged = mergeWorkspace(mine, theirs)
    expect(merged.documents).toHaveLength(3)
    const [, base, copy] = merged.documents
    expect(base.id).not.toBe(theirs.documents[0].id)
    expect(copy.baseId).toBe(base.id)
    expect(merged.activeId).toBe(base.id)
  })
})
