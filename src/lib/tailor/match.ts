import { cleanBullets, splitList } from "@/lib/resume/format"
import { newId, type Resume } from "@/lib/resume/schema"
import { DICTIONARY, type DictionaryEntry } from "./dictionary"

/**
 * Compares a job description with a CV, offline.
 *
 * 1. Find the job's keywords: known skills (from the dictionary, with all
 *    their spellings) plus capitalised terms the job repeats (e.g. "Kafka").
 * 2. Work out how important each is from where it appears: under
 *    "Requirements" vs "Nice to have", or next to "must"/"a plus".
 * 3. Look for each keyword in the CV and note which sections show it.
 */

export type Importance = "required" | "mentioned" | "preferred"
export type CvPlace = "summary" | "experience" | "projects" | "skills" | "education" | "certifications"

export type JobKeyword = { name: string; category: string; importance: Importance; count: number; known: boolean }
export type KeywordMatch = JobKeyword & { found: boolean; where: CvPlace[] }

export type MatchResult = {
  /** 0–100, weighted by importance; null when no keywords were found. */
  score: number | null
  keywords: KeywordMatch[]
  /** e.g. "3+ years", when the job states it. */
  years: string | null
}

const RANK: Record<Importance, number> = { preferred: 1, mentioned: 2, required: 3 }
const WEIGHT: Record<Importance, number> = { required: 3, mentioned: 2, preferred: 1 }

// --- Matching single terms ---

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

/** Whole-term regex: "java" must not match inside "javascript", "sql" not inside "postgresql". */
export function aliasRegex(alias: string): RegExp {
  const caseSensitive = alias.startsWith("=")
  const term = caseSensitive ? alias.slice(1) : alias
  const body = escape(term).replace(/\s+/g, "[\\s-]+")
  return new RegExp(`(?<![\\p{L}\\p{N}+#.])${body}(?![\\p{L}\\p{N}+#&])`, caseSensitive ? "gu" : "giu")
}

const compiled = new Map<DictionaryEntry, RegExp[]>()
function regexesFor(entry: DictionaryEntry): RegExp[] {
  let list = compiled.get(entry)
  if (!list) {
    list = entry.aliases.map(aliasRegex)
    compiled.set(entry, list)
  }
  return list
}

function countIn(text: string, regexes: RegExp[]): number {
  let n = 0
  for (const re of regexes) {
    re.lastIndex = 0
    n += text.match(re)?.length ?? 0
  }
  return n
}

// --- Reading the job description ---

const PREFERRED = /nice[\s-]to[\s-]have|preferred|bonus|\ba plus\b|is a plus|desirable|good to have|extra credit|familiarity with|exposure to/i
const REQUIRED = /requirement|qualifications|must[\s-]have|\bmust\b|required|what you.?ll need|what we.?re looking for|you (?:have|bring|should have)|minimum|essential|proficien|strong (?:experience|knowledge)|expert/i
const NEUTRAL_HEAD = /about (?:us|the company|the role|the team)|benefits|perks|what we offer|responsibilit|what you.?ll do|day[\s-]to[\s-]day|the role|our culture/i

function isHeading(line: string): boolean {
  const t = line.trim()
  if (!t || t.length > 70) return false
  if (/^[-*•●]/.test(t)) return false
  return t.endsWith(":") || /^#+\s/.test(t) || t.split(/\s+/).length <= 6
}

function lineImportance(line: string, section: Importance): Importance {
  if (PREFERRED.test(line)) return "preferred"
  if (REQUIRED.test(line)) return "required"
  return section
}

const STOP = new Set(
  `a an and are as at be but by can for from has have if in is it its of on or our the their this to we will with you your who what when where why how
  about after all also any both each every more most other some such than that these those very own same so just over under into onto per via etc
  join team teams company role job position candidate candidates experience requirements responsibilities qualifications benefits skills skill
  strong excellent good great ability able knowledge understanding working work years year bachelor bachelors master masters degree phd
  remote hybrid onsite office full time part contract salary equal opportunity employer apply application please new using use build help
  monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september october november december
  senior junior mid level lead engineer engineering developer development software manager management product design designer data
  responsible including include includes required preferred plus bonus nice must should would may might well within across while
  english amharic communication`
    .split(/\s+/)
    .filter(Boolean),
)

/** Capitalised words or acronyms the job repeats that the dictionary doesn't know. */
const KNOWN_ALIASES = new Set(DICTIONARY.flatMap((e) => e.aliases.map((a) => a.replace(/^=/, "").toLowerCase())))

function unknownTerms(text: string, exclude: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  const excluded = new Set(exclude.map((e) => e.toLowerCase()).filter(Boolean))
  const token = /(?<![\p{L}\p{N}])([A-Z][A-Za-z0-9]*(?:[.+#-][A-Za-z0-9+#]+)*|[A-Z]{2,}[0-9]*)(?![\p{L}\p{N}])/gu
  for (const line of text.split("\n")) {
    for (const m of line.matchAll(token)) {
      const word = m[1]
      const key = word.toLowerCase()
      if (word.length < 2 || STOP.has(key) || excluded.has(key)) continue
      if (KNOWN_ALIASES.has(key)) continue
      counts.set(word, (counts.get(word) ?? 0) + 1)
    }
  }
  return counts
}

export function extractJobKeywords(description: string, opts: { exclude?: string[] } = {}): { keywords: JobKeyword[]; years: string | null } {
  const lines = description.split(/\r?\n/)
  const found = new Map<string, JobKeyword>()
  let section: Importance = "mentioned"

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    if (isHeading(line)) {
      if (PREFERRED.test(line)) section = "preferred"
      else if (REQUIRED.test(line)) section = "required"
      else if (NEUTRAL_HEAD.test(line)) section = "mentioned"
    }
    const importance = lineImportance(line, section)
    for (const entry of DICTIONARY) {
      const n = countIn(line, regexesFor(entry))
      if (!n) continue
      const prev = found.get(entry.name)
      found.set(entry.name, {
        name: entry.name,
        category: entry.category,
        known: true,
        count: (prev?.count ?? 0) + n,
        importance: prev && RANK[prev.importance] >= RANK[importance] ? prev.importance : importance,
      })
    }
  }

  const extra = [...unknownTerms(description, opts.exclude ?? [])]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]): JobKeyword => ({ name, category: "Other terms", importance: "mentioned", count, known: false }))

  const years = description.match(/(\d{1,2})\s*\+?\s*(?:(?:-|–|to)\s*(\d{1,2})\s*)?\+?\s*years?/i)
  const keywords = [...found.values(), ...extra].sort((a, b) => RANK[b.importance] - RANK[a.importance] || b.count - a.count)
  return { keywords, years: years ? (years[2] ? `${years[1]}–${years[2]} years` : `${years[1]}+ years`) : null }
}

// --- Looking in the CV ---

function cvSections(r: Resume): Record<CvPlace, string> {
  return {
    summary: [r.basics.headline, r.summary].join("\n"),
    experience: r.experience.flatMap((x) => [x.role, ...cleanBullets(x.bullets)]).join("\n"),
    projects: r.projects.flatMap((p) => [p.name, p.tech, ...cleanBullets(p.bullets)]).join("\n"),
    skills: r.skills.flatMap((g) => splitList(g.items)).join("\n"),
    education: r.education.flatMap((e) => [e.degree, ...cleanBullets(e.bullets)]).join("\n"),
    certifications: r.certifications.map((c) => c.name).join("\n"),
  }
}

export function matchResume(resume: Resume, description: string, opts: { exclude?: string[] } = {}): MatchResult {
  const { keywords, years } = extractJobKeywords(description, opts)
  const sections = cvSections(resume)
  const byName = new Map(DICTIONARY.map((e) => [e.name, e]))

  const matches = keywords.map((k): KeywordMatch => {
    const entry = byName.get(k.name)
    const regexes = entry ? regexesFor(entry) : [aliasRegex(k.name)]
    const where = (Object.keys(sections) as CvPlace[]).filter((place) => countIn(sections[place], regexes) > 0)
    return { ...k, found: where.length > 0, where }
  })

  const weight = (m: KeywordMatch) => (m.known ? WEIGHT[m.importance] : 0.5)
  const total = matches.reduce((sum, m) => sum + weight(m), 0)
  const got = matches.filter((m) => m.found).reduce((sum, m) => sum + weight(m), 0)
  return { score: total ? Math.round((100 * got) / total) : null, keywords: matches, years }
}

/** Shown in skills but never in experience or projects: recruiters trust what you show you used. */
export function onlyInSkills(m: KeywordMatch): boolean {
  return m.found && m.where.every((w) => w === "skills")
}

/** Adds a skill the user confirmed they have. Goes into a group called "Other" (created if needed). */
export function addSkill(r: Resume, name: string): Resume {
  const exists = r.skills.some((g) => splitList(g.items).some((s) => s.toLowerCase() === name.toLowerCase()))
  if (exists) return r
  const index = r.skills.findIndex((g) => g.name.trim().toLowerCase() === "other")
  if (index === -1) return { ...r, skills: [...r.skills, { id: newId(), name: "Other", items: name }] }
  return {
    ...r,
    skills: r.skills.map((g, i) => (i === index ? { ...g, items: [...splitList(g.items), name].join(", ") } : g)),
  }
}
