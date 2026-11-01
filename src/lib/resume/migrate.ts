import { MONTHS, newId, parseResume, type Resume } from "./schema"

/**
 * Converts the flat v2 format (saved under `cvBuilderData_v2` before the
 * rewrite) into the current Resume shape.
 */

type V2Edu = Partial<Record<"id" | "schoolname" | "program" | "eduDescription" | "eduStartMonth" | "eduStartYear" | "eduEndMonth" | "eduEndYear", string>>
type V2Exp = Partial<Record<"id" | "company" | "profession" | "experienceDescription" | "workStartMonth" | "workStartYear" | "workEndMonth" | "workEndYear", string>>
type V2 = Partial<Record<"fullname" | "email" | "country" | "phone" | "linkedin" | "github" | "summary" | "skills", string>> & {
  education?: V2Edu[]
  experience?: V2Exp[]
}

const str = (v: unknown) => (typeof v === "string" ? v : "")

/** Splits a free-text block into bullet lines, dropping typed "-", "*" or "•" markers. */
export function toBullets(block: unknown): string[] {
  return str(block)
    .split("\n")
    .map((line) => line.trim().replace(/^[-*•●]\s*/, ""))
    .filter(Boolean)
}

function month(v: unknown) {
  const m = str(v)
  return (MONTHS as readonly string[]).includes(m) ? m : ""
}

function range(startMonth: unknown, startYear: unknown, endMonth: unknown, endYear: unknown) {
  const current = str(endYear) === "Present"
  return {
    start: { month: month(startMonth), year: str(startYear) },
    end: current ? { month: "", year: "" } : { month: month(endMonth), year: str(endYear) },
    current,
  }
}

export function migrateV2(raw: unknown): Resume {
  const v2 = (raw && typeof raw === "object" ? raw : {}) as V2
  const skillItems = str(v2.skills)
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  return parseResume({
    basics: {
      name: str(v2.fullname),
      email: str(v2.email),
      phone: str(v2.phone),
      location: str(v2.country),
      linkedin: str(v2.linkedin),
      github: str(v2.github),
    },
    summary: str(v2.summary),
    education: (Array.isArray(v2.education) ? v2.education : []).map((e) => ({
      id: str(e?.id) || newId(),
      school: str(e?.schoolname),
      degree: str(e?.program),
      ...range(e?.eduStartMonth, e?.eduStartYear, e?.eduEndMonth, e?.eduEndYear),
      bullets: toBullets(e?.eduDescription),
    })),
    experience: (Array.isArray(v2.experience) ? v2.experience : []).map((x) => ({
      id: str(x?.id) || newId(),
      company: str(x?.company),
      role: str(x?.profession),
      ...range(x?.workStartMonth, x?.workStartYear, x?.workEndMonth, x?.workEndYear),
      bullets: toBullets(x?.experienceDescription),
    })),
    skills: skillItems.length ? [{ id: newId(), name: "", items: skillItems.join(", ") }] : [],
  })
}
