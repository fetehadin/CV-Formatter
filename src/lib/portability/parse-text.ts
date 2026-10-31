import { MONTHS, newId, parseResume, type Resume, type SectionKey, type YearMonth } from "@/lib/resume/schema"

/**
 * Turns plain CV text (from a PDF, Word or a paste) into a Resume.
 * Heuristic: it finds contact details, section headings and date ranges.
 * It is a starting point the user reviews, never a final answer.
 */

const HEADINGS: [SectionKey, RegExp][] = [
  ["summary", /^(summary|professional summary|profile|about me|about|objective|career objective)$/i],
  ["experience", /^(work experience|experience|professional experience|employment( history)?|work history|career history)$/i],
  ["education", /^(education|academic background|education and training|qualifications)$/i],
  ["projects", /^(projects|personal projects|selected projects|key projects)$/i],
  ["skills", /^(skills|technical skills|core skills|core competencies|technologies|tools|skills (&|and) tools)$/i],
  ["certifications", /^(certifications?|certificates|licen[cs]es( (&|and) certifications)?|courses)$/i],
  ["languages", /^(languages|language skills)$/i],
]

const EMAIL = /[^\s@|,;]+@[^\s@|,;]+\.[a-z]{2,}/i
const PHONE = /(?:\+?\d[\d\s().-]{6,}\d)/
const URL = /(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?:\/[^\s|,]*)?/i
const BULLET = /^[-*•●▪◦‣–]\s*/

const MONTH_RE = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"
const POINT = `(?:${MONTH_RE}\\.?\\s+(\\d{4})|(\\d{1,2})\\/(\\d{4})|(\\d{4}))`
const RANGE = new RegExp(`${POINT}\\s*(?:-|–|—|to)\\s*(?:${POINT}|(present|current|now|ongoing))`, "i")
const SINGLE = new RegExp(POINT, "i")

const ROLE_WORDS = /\b(engineer|developer|manager|intern|designer|analyst|lead|consultant|specialist|assistant|officer|director|scientist|architect|administrator|coordinator|head|founder|programmer|technician|teacher|tutor|researcher|associate|volunteer|representative|accountant)\b/i
const SCHOOL_WORDS = /\b(university|college|institute|school|academy|bootcamp|polytechnic)\b/i

function point(m: RegExpMatchArray, offset: number): YearMonth {
  const [mon, monYear, num, numYear, year] = [m[offset], m[offset + 1], m[offset + 2], m[offset + 3], m[offset + 4]]
  if (mon && monYear) {
    const month = MONTHS.find((x) => x.toLowerCase() === mon.slice(0, 3).toLowerCase()) ?? ""
    return { month, year: monYear }
  }
  if (num && numYear) return { month: MONTHS[Number(num) - 1] ?? "", year: numYear }
  return { month: "", year: year ?? "" }
}

/** Finds a date range (or single date) in a line and returns the line without it. */
export function takeDates(line: string): { rest: string; start: YearMonth; end: YearMonth; current: boolean } | null {
  const r = line.match(RANGE)
  if (r) {
    const current = Boolean(r[11])
    return {
      rest: clean(line.replace(r[0], "")),
      start: point(r, 1),
      end: current ? { month: "", year: "" } : point(r, 6),
      current,
    }
  }
  const s = line.match(SINGLE)
  if (s && /\d{4}/.test(s[0]) && s[0].length >= 4) {
    return { rest: clean(line.replace(s[0], "")), start: point(s, 1), end: { month: "", year: "" }, current: false }
  }
  return null
}

function clean(s: string): string {
  return s.replace(/\(\s*\)/g, "").replace(/\s*[|,–—-]\s*$/, "").replace(/^\s*[|,–—-]\s*/, "").replace(/\s{2,}/g, " ").trim()
}

function headingOf(line: string): SectionKey | null {
  const t = line.replace(/[:：]$/, "").trim()
  if (t.length > 40) return null
  return HEADINGS.find(([, re]) => re.test(t))?.[0] ?? null
}

type Block = { headers: string[]; bullets: string[]; dates: ReturnType<typeof takeDates> }

/** Groups a section's lines into entries: header lines (title, company, dates) followed by bullets. */
function toBlocks(lines: string[]): Block[] {
  const blocks: Block[] = []
  let cur: Block | null = null
  for (const raw of lines) {
    const isBullet = BULLET.test(raw)
    const line = raw.replace(BULLET, "").trim()
    if (!line) continue
    const dates = isBullet ? null : takeDates(line)
    const looksLikeSentence = line.split(/\s+/).length > 8 || /[.;]$/.test(line)

    // After a dated header plus a title line, plain lines are almost always bullets without a marker.
    const afterFullHeader = Boolean(cur && cur.dates && cur.headers.length >= 2 && !dates)
    if (isBullet || afterFullHeader || (cur && cur.headers.length && looksLikeSentence && !dates)) {
      if (!cur) {
        cur = { headers: [], bullets: [], dates: null }
        blocks.push(cur)
      }
      if (!isBullet && cur.bullets.length && /^[a-z]/.test(line)) cur.bullets[cur.bullets.length - 1] += ` ${line}`
      else cur.bullets.push(line)
      continue
    }
    // A wrapped line from the previous bullet starts in lowercase.
    if (!dates && cur?.bullets.length && /^[a-z]/.test(line)) {
      cur.bullets[cur.bullets.length - 1] += ` ${line}`
      continue
    }
    const startNew = !cur || cur.bullets.length > 0 || (dates && cur.dates) || cur.headers.length >= 3
    if (startNew) {
      cur = { headers: [], bullets: [], dates: null }
      blocks.push(cur)
    }
    if (dates) {
      cur!.dates = dates
      if (dates.rest) cur!.headers.push(dates.rest)
    } else {
      cur!.headers.push(line)
    }
  }
  return blocks
}

/** "Frontend Engineer at Chapa", "Chapa | Frontend Engineer", or two separate lines. */
function splitParts(headers: string[]): string[] {
  return headers.flatMap((h) => h.split(/\s+(?:\||—|–|-|@|at)\s+|\s*\|\s*|,\s+(?=[A-Z])/)).map((s) => s.trim()).filter(Boolean)
}

function experienceFrom(b: Block) {
  const parts = splitParts(b.headers)
  const roleIndex = parts.findIndex((p) => ROLE_WORDS.test(p))
  const role = roleIndex >= 0 ? parts[roleIndex] : (parts[1] ?? "")
  const others = parts.filter((_, i) => i !== (roleIndex >= 0 ? roleIndex : 1))
  return {
    id: newId(),
    role,
    company: others[0] ?? "",
    location: others[1] ?? "",
    start: b.dates?.start,
    end: b.dates?.end,
    current: b.dates?.current ?? false,
    bullets: b.bullets,
  }
}

function educationFrom(b: Block) {
  const parts = splitParts(b.headers)
  const schoolIndex = parts.findIndex((p) => SCHOOL_WORDS.test(p))
  const school = schoolIndex >= 0 ? parts[schoolIndex] : (parts[0] ?? "")
  const others = parts.filter((_, i) => i !== (schoolIndex >= 0 ? schoolIndex : 0))
  return { id: newId(), school, degree: others[0] ?? "", location: others[1] ?? "", start: b.dates?.start, end: b.dates?.end, current: b.dates?.current ?? false, bullets: b.bullets }
}

function projectFrom(b: Block) {
  const [first = "", ...rest] = b.headers
  const link = first.match(URL)?.[0] ?? ""
  const techLine = [...rest, ...b.bullets].find((l) => /^(tech|stack|built with|technologies)\s*:/i.test(l))
  return {
    id: newId(),
    name: clean(link ? first.replace(link, "") : first),
    link,
    tech: techLine ? techLine.replace(/^[^:]+:\s*/, "") : "",
    start: b.dates?.start,
    end: b.dates?.end,
    current: b.dates?.current ?? false,
    bullets: b.bullets.filter((l) => l !== techLine),
  }
}

/** "ABEBE KEBEDE" -> "Abebe Kebede"; names already in mixed case are left alone. */
export function titleCaseIfShouting(s: string): string {
  if (s !== s.toUpperCase()) return s
  return s.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase())
}

export type ParseResult = { resume: Resume; found: SectionKey[]; warnings: string[] }

export function parseCvText(text: string): ParseResult {
  const lines = text.split(/\r?\n/).map((l) => l.replace(/\s+/g, " ").trim())
  const sections: Partial<Record<SectionKey, string[]>> = {}
  const header: string[] = []
  let current: SectionKey | null = null

  for (const line of lines) {
    if (!line) continue
    const h = headingOf(line)
    if (h) {
      current = h
      sections[h] ??= []
      continue
    }
    if (current) sections[current]!.push(line)
    else header.push(line)
  }

  // --- Contact details from the top of the CV ---
  const basics = { name: "", headline: "", email: "", phone: "", location: "", linkedin: "", github: "", website: "" }
  const leftovers: string[] = []
  for (const line of header) {
    for (const part of line.split(/\s*[|•·]\s*/).map((p) => p.trim()).filter(Boolean)) {
      const email = part.match(EMAIL)?.[0]
      if (email && !basics.email) {
        basics.email = email
        continue
      }
      if (/linkedin\.com/i.test(part)) basics.linkedin ||= part.match(URL)?.[0] ?? part
      else if (/github\.com/i.test(part)) basics.github ||= part.match(URL)?.[0] ?? part
      else if (PHONE.test(part) && part.replace(/\D/g, "").length >= 7 && !/[a-z]{3,}/i.test(part)) basics.phone ||= part.match(PHONE)![0].trim()
      else if (URL.test(part) && !/\s/.test(part)) basics.website ||= part
      else leftovers.push(part)
    }
  }
  const nameIndex = leftovers.findIndex((p) => /^[\p{L}'.-]+(\s+[\p{L}'.-]+){1,4}$/u.test(p))
  if (nameIndex >= 0) basics.name = titleCaseIfShouting(leftovers.splice(nameIndex, 1)[0])
  const locIndex = leftovers.findIndex((p) => /,/.test(p) && p.length < 60 && !/\d{3,}/.test(p))
  if (locIndex >= 0) basics.location = leftovers.splice(locIndex, 1)[0]
  if (leftovers[0] && leftovers[0].length < 60) basics.headline = leftovers[0]

  // --- Sections ---
  const summary = (sections.summary ?? []).map((l) => l.replace(BULLET, "")).join(" ")
  const skills = (sections.skills ?? []).map((line) => {
    const [name, items] = line.includes(":") ? [line.split(":")[0], line.slice(line.indexOf(":") + 1)] : ["", line]
    const list = items.replace(BULLET, "").split(/[,|•·;]/).map((s) => s.trim()).filter(Boolean)
    return { id: newId(), name: name.replace(BULLET, "").trim(), items: list.join(", ") }
  })
  const languages = (sections.languages ?? [])
    .flatMap((l) => l.split(/\s*[,|•·;]\s*/))
    .map((l) => l.replace(BULLET, "").trim())
    .filter(Boolean)
    .map((l) => {
      const m = l.match(/^(.+?)\s*[(:–-]\s*([^)]+)\)?$/)
      return { id: newId(), language: m ? m[1].trim() : l, fluency: m ? m[2].trim() : "" }
    })
  const certifications = (sections.certifications ?? []).map((raw) => {
    const line = raw.replace(BULLET, "")
    const d = takeDates(line)
    const [name, issuer = ""] = (d?.rest ?? line).split(/\s*[,|–—]\s+/)
    return { id: newId(), name, issuer, date: d?.start ?? { month: "", year: "" }, link: "" }
  })

  const resume = parseResume({
    basics,
    summary,
    experience: toBlocks(sections.experience ?? []).map(experienceFrom),
    education: toBlocks(sections.education ?? []).map(educationFrom),
    projects: toBlocks(sections.projects ?? []).map(projectFrom),
    skills,
    certifications,
    languages,
  })

  const found = (Object.keys(sections) as SectionKey[]).filter((k) => (sections[k]?.length ?? 0) > 0)
  const warnings: string[] = []
  if (!basics.name) warnings.push("Couldn't find your name at the top.")
  if (!basics.email) warnings.push("Couldn't find an email address.")
  if (!found.includes("experience")) warnings.push('No "Experience" heading found. Use a standard heading so ATS can find it.')
  if (found.length < 2) warnings.push("Few standard section headings found. ATS rely on headings like Experience, Education and Skills.")
  return { resume, found, warnings }
}
