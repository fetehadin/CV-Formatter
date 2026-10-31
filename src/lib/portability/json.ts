import { splitList, toHref } from "@/lib/resume/format"
import { MONTHS, newId, parseResume, ResumeSchema, type Resume, type YearMonth } from "@/lib/resume/schema"
import { normalizeWorkspace, newDocument, type Workspace } from "@/lib/resume/workspace"

/**
 * JSON in and out:
 * - JSON Resume (jsonresume.org), the open standard other tools read
 * - our own backup file (every CV version, with jobs)
 */

// --- Dates ---

/** {Aug, 2022} -> "2022-08"; {"", 2022} -> "2022" */
export function toIsoDate(d: YearMonth): string | undefined {
  if (!/^\d{4}$/.test(d.year)) return undefined
  const m = MONTHS.indexOf(d.month as (typeof MONTHS)[number])
  return m >= 0 ? `${d.year}-${String(m + 1).padStart(2, "0")}` : d.year
}

export function fromIsoDate(s: unknown): YearMonth {
  const m = typeof s === "string" ? s.match(/^(\d{4})(?:-(\d{1,2}))?/) : null
  if (!m) return { month: "", year: "" }
  return { year: m[1], month: m[2] ? (MONTHS[Number(m[2]) - 1] ?? "") : "" }
}

// --- JSON Resume ---

type Obj = Record<string, unknown>
const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {})
const arr = (v: unknown): Obj[] => (Array.isArray(v) ? v.map(obj) : [])
const str = (v: unknown) => (typeof v === "string" ? v : "")
const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [])

export function toJsonResume(r: Resume): object {
  const b = r.basics
  const profiles = [
    b.linkedin && { network: "LinkedIn", url: toHref(b.linkedin) },
    b.github && { network: "GitHub", url: toHref(b.github) },
  ].filter(Boolean)
  const range = (x: { start: YearMonth; end: YearMonth; current: boolean }) => ({
    startDate: toIsoDate(x.start),
    endDate: x.current ? undefined : toIsoDate(x.end),
  })
  return {
    $schema: "https://raw.githubusercontent.com/jsonresume/resume-schema/v1.0.0/schema.json",
    basics: {
      name: b.name,
      label: b.headline || undefined,
      email: b.email || undefined,
      phone: b.phone || undefined,
      url: b.website ? toHref(b.website) : undefined,
      summary: r.summary || undefined,
      location: b.location ? { city: b.location } : undefined,
      profiles,
    },
    work: r.experience.map((x) => ({ name: x.company, position: x.role, location: x.location || undefined, ...range(x), highlights: x.bullets.filter(Boolean) })),
    education: r.education.map((e) => ({ institution: e.school, area: e.degree, ...range(e), courses: e.bullets.filter(Boolean) })),
    projects: r.projects.map((p) => ({ name: p.name, url: p.link ? toHref(p.link) : undefined, keywords: splitList(p.tech), ...range(p), highlights: p.bullets.filter(Boolean) })),
    skills: r.skills.map((g) => ({ name: g.name, keywords: splitList(g.items) })),
    certificates: r.certifications.map((c) => ({ name: c.name, issuer: c.issuer || undefined, date: toIsoDate(c.date), url: c.link ? toHref(c.link) : undefined })),
    languages: r.languages.map((l) => ({ language: l.language, fluency: l.fluency || undefined })),
    meta: { canonical: "cv-formatter", sectionOrder: r.sectionOrder },
  }
}

export function fromJsonResume(input: unknown): Resume {
  const j = obj(input)
  const b = obj(j.basics)
  const loc = obj(b.location)
  const profiles = arr(b.profiles)
  const profile = (net: RegExp) => {
    const p = profiles.find((x) => net.test(str(x.network)) || net.test(str(x.url)))
    return p ? str(p.url) || (str(p.username) ? `${str(p.network).toLowerCase()}.com/${str(p.username)}` : "") : ""
  }
  const range = (x: Obj) => {
    const end = str(x.endDate)
    return { start: fromIsoDate(x.startDate), end: fromIsoDate(end), current: Boolean(x.startDate) && (!end || /present/i.test(end)) }
  }
  return parseResume({
    basics: {
      name: str(b.name),
      headline: str(b.label),
      email: str(b.email),
      phone: str(b.phone),
      location: [str(loc.city), str(loc.region), str(loc.countryCode)].filter(Boolean).join(", ") || str(loc.address),
      linkedin: profile(/linkedin/i),
      github: profile(/github/i),
      website: str(b.url) || str(b.website),
    },
    summary: str(b.summary),
    experience: arr(j.work ?? j.volunteer).map((x) => ({
      id: newId(),
      company: str(x.name) || str(x.company) || str(x.organization),
      role: str(x.position),
      location: str(x.location),
      ...range(x),
      bullets: [...(str(x.summary) ? [str(x.summary)] : []), ...strs(x.highlights)],
    })),
    education: arr(j.education).map((e) => ({
      id: newId(),
      school: str(e.institution),
      degree: [str(e.studyType), str(e.area)].filter(Boolean).join(" "),
      ...range(e),
      bullets: [...(str(e.score) ? [`GPA ${str(e.score)}`] : []), ...strs(e.courses)],
    })),
    projects: arr(j.projects).map((p) => ({
      id: newId(),
      name: str(p.name),
      link: str(p.url),
      tech: strs(p.keywords).join(", "),
      ...range(p),
      bullets: [...(str(p.description) ? [str(p.description)] : []), ...strs(p.highlights)],
    })),
    skills: arr(j.skills).map((s) => ({ id: newId(), name: str(s.name), items: strs(s.keywords).join(", ") })),
    certifications: arr(j.certificates).map((c) => ({ id: newId(), name: str(c.name), issuer: str(c.issuer), date: fromIsoDate(c.date), link: str(c.url) })),
    languages: arr(j.languages).map((l) => ({ id: newId(), language: str(l.language), fluency: str(l.fluency) })),
    sectionOrder: obj(j.meta).sectionOrder,
  })
}

// --- Backup ---

export const BACKUP_FORMAT = "cv-formatter-backup"

export function toBackup(ws: Workspace): object {
  return { format: BACKUP_FORMAT, exportedAt: new Date().toISOString(), workspace: ws }
}

// --- Detecting what a file is ---

export type ImportedJson =
  | { kind: "backup"; workspace: Workspace }
  | { kind: "jsonresume"; resume: Resume }
  | { kind: "native"; resume: Resume }
  | { kind: "unknown" }

export function readJson(text: string): ImportedJson {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { kind: "unknown" }
  }
  const o = obj(data)
  if (o.format === BACKUP_FORMAT || (Array.isArray(obj(o.workspace).documents) && o.workspace)) {
    return { kind: "backup", workspace: normalizeWorkspace(o.workspace) }
  }
  if (Array.isArray(o.documents)) return { kind: "backup", workspace: normalizeWorkspace(o) }
  if (o.basics && (Array.isArray(o.sectionOrder) || "experience" in o)) return { kind: "native", resume: ResumeSchema.parse(o) }
  if (o.basics || o.work || o.education) return { kind: "jsonresume", resume: fromJsonResume(o) }
  return { kind: "unknown" }
}

/** Adds imported CV versions next to the existing ones (new ids, nothing overwritten). */
export function mergeWorkspace(into: Workspace, incoming: Workspace): Workspace {
  const idMap = new Map(incoming.documents.map((d) => [d.id, newId()]))
  const docs = incoming.documents.map((d) =>
    newDocument(d.resume, { ...d, id: idMap.get(d.id)!, baseId: d.baseId ? (idMap.get(d.baseId) ?? null) : null }),
  )
  return { ...into, documents: [...into.documents, ...docs], activeId: docs[0]?.id ?? into.activeId }
}
