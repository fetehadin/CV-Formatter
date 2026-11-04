import { PROFILE_INFO } from "@/lib/resume/design"
import { cleanBullets, isEndBeforeStart, splitList, toMonthNumber } from "@/lib/resume/format"
import { sectionTitle, visibleSections, type Resume, type SectionKey } from "@/lib/resume/schema"
import { BUZZWORDS, FIRST_PERSON, isActionVerb, isStandardHeading, WEAK_OPENERS } from "./words"

/**
 * The CV score. A CV *earns* points, rather than starting at 100 and losing
 * them, so an empty CV can't look good and writing more never costs points.
 *
 *   Contact                 10
 *   Sections                75, shared by the sections this CV shows
 *   Formatting and length   15
 *
 * The 75 section points are split by career stage (`design.profile`) over
 * the visible sections only: hiding a section hands its points to the rest,
 * while a visible section left empty earns nothing. Quality inside a section
 * is measured as a share ("4 of 9 bullets have a number"), never a count.
 */

export const CONTACT_POINTS = 10
export const SECTION_POINTS = 75
export const FORMAT_POINTS = 15
/** Any "Must fix" issue keeps the score below "Good". */
export const MUST_FIX_CAP = 69
/** Below this the CV isn't scored at all. */
export const MIN_WORDS = 40

export type Band = "strong" | "good" | "fair" | "weak"
export const BAND_LABELS: Record<Band, string> = { strong: "Strong", good: "Good", fair: "Fair", weak: "Needs work" }

export function bandFor(score: number): Band {
  return score >= 85 ? "strong" : score >= 70 ? "good" : score >= 50 ? "fair" : "weak"
}

export type ScorePart = {
  id: "contact" | SectionKey | "format"
  label: string
  earned: number
  max: number
  /** The most useful next step for this part, or "" when it's full. */
  hint: string
}

export type Score =
  | { status: "scored"; score: number; band: Band; capped: boolean; parts: ScorePart[] }
  | { status: "unscored"; needed: string[]; parts: ScorePart[] }

// --- Helpers ---

const words = (s: string) => s.split(/\s+/).filter(Boolean)
const share = (n: number, of: number) => (of ? n / of : 0)
/** 0..1, reaching 1 at `target`. */
const toward = (value: number, target: number) => Math.min(1, Math.max(0, value / target))
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
const HAS_METRIC = /\d|\b(doubled|tripled|halved|quadrupled|percent|million|thousand|hundred|dozen)\b/i
const isWeak = (b: string) => WEAK_OPENERS.some((w) => b.toLowerCase().startsWith(w)) || FIRST_PERSON.test(b)
const goodLength = (b: string) => b.length >= 25 && b.length <= 220
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

type Component = { weight: number; value: number; hint: string }

/** Weighted average of components, plus the hint of the one losing the most points. */
function combine(components: Component[]): { quality: number; hint: string } {
  const total = components.reduce((a, c) => a + c.weight, 0)
  const quality = components.reduce((a, c) => a + c.weight * c.value, 0) / total
  const worst = components.filter((c) => c.value < 0.999).sort((a, b) => b.weight * (1 - b.value) - a.weight * (1 - a.value))[0]
  return { quality, hint: worst?.hint ?? "" }
}

/** Bullet quality shared by experience and projects. */
function bulletComponents(bullets: string[], metricTarget: number): Component[] {
  const n = bullets.length
  const withNumbers = bullets.filter((b) => HAS_METRIC.test(b)).length
  const withVerbs = bullets.filter((b) => isActionVerb(words(b)[0] ?? "")).length
  const weak = bullets.filter(isWeak).length
  const sized = bullets.filter(goodLength).length
  return [
    { weight: 30, value: toward(share(withNumbers, n), metricTarget), hint: `${withNumbers} of ${plural(n, "bullet")} show a result with a number. Add real figures where you have them.` },
    { weight: 15, value: toward(share(withVerbs, n), 0.8), hint: `${withVerbs} of ${plural(n, "bullet")} open with an action verb.` },
    { weight: 10, value: 1 - share(weak, n), hint: `${plural(weak, "bullet")} start with "Responsible for", "Helped" or use "I".` },
    { weight: 5, value: share(sized, n), hint: `${plural(n - sized, "bullet")} are too short or too long. Aim for one or two lines.` },
  ]
}

// --- Section scorers (each returns quality 0..1, or null when the section is empty) ---

type Scored = { quality: number; hint: string } | null

function scoreSection(key: SectionKey, r: Resume): Scored {
  switch (key) {
    case "summary": {
      const text = r.summary.trim()
      if (!text) return null
      const n = words(text).length
      const lower = text.toLowerCase()
      return combine([
        { weight: 40, value: n <= 80 ? toward(n, 25) : Math.max(0, 1 - (n - 80) / 80), hint: n > 80 ? `${n} words. Keep it under 80.` : `Only ${n} words. Say who you are, your strongest skills and one result.` },
        { weight: 30, value: FIRST_PERSON.test(text) ? 0 : 1, hint: 'Drop "I" and "my": "Engineer with…" instead of "I am an engineer…".' },
        { weight: 30, value: BUZZWORDS.some((w) => lower.includes(w)) ? 0 : 1, hint: "Replace clichés (passionate, hard-working…) with what you've actually done." },
      ])
    }

    case "experience": {
      const jobs = r.experience.filter((x) => x.role || x.company || cleanBullets(x.bullets).length)
      if (!jobs.length) return null
      const bullets = jobs.flatMap((x) => cleanBullets(x.bullets))
      const filled = jobs.map((x) => avg([x.role ? 1 : 0, x.company ? 1 : 0, x.start.year ? 1 : 0, x.current || x.end.year ? 1 : 0]))
      return combine([
        { weight: 25, value: avg(filled), hint: "Give every job a title, company, start and end date." },
        { weight: 15, value: avg(jobs.map((x) => toward(cleanBullets(x.bullets).length, 3))), hint: "Give each job at least 3 bullet points." },
        ...bulletComponents(bullets, 0.5),
      ])
    }

    case "projects": {
      const items = r.projects.filter((p) => p.name || cleanBullets(p.bullets).length)
      if (!items.length) return null
      const bullets = items.flatMap((p) => cleanBullets(p.bullets))
      return combine([
        { weight: 25, value: avg(items.map((p) => avg([p.name ? 1 : 0, cleanBullets(p.bullets).length ? 1 : 0, p.tech.trim() ? 1 : 0]))), hint: "Give every project a name, what you built, and the tech used." },
        ...bulletComponents(bullets, 0.3),
      ])
    }

    case "education": {
      const items = r.education.filter((e) => e.school || e.degree)
      if (!items.length) return null
      return combine([
        { weight: 60, value: avg(items.map((e) => avg([e.school ? 1 : 0, e.degree ? 1 : 0]))), hint: "Add the school and the degree or program for each entry." },
        { weight: 40, value: avg(items.map((e) => (e.start.year || e.end.year || e.current ? 1 : 0))), hint: "Add the years for each entry." },
      ])
    }

    case "skills": {
      const all = r.skills.flatMap((g) => splitList(g.items))
      if (!all.length) return null
      const unique = new Set(all.map((s) => s.toLowerCase())).size
      return combine([
        { weight: 60, value: toward(unique, 6), hint: `${plural(unique, "skill")} listed. Add the ones the jobs you want ask for (6 or more).` },
        { weight: 20, value: unique === all.length ? 1 : 0, hint: "Some skills are listed twice." },
        { weight: 20, value: unique <= 40 ? 1 : 0.5, hint: `${unique} skills is a lot. Keep the relevant ones.` },
      ])
    }

    case "certifications": {
      const items = r.certifications.filter((c) => c.name)
      if (!items.length) return null
      return combine([
        { weight: 50, value: 1, hint: "" },
        { weight: 25, value: avg(items.map((c) => (c.issuer ? 1 : 0))), hint: "Add who issued each certification." },
        { weight: 25, value: avg(items.map((c) => (c.date.year ? 1 : 0))), hint: "Add the year of each certification." },
      ])
    }

    case "languages": {
      const items = r.languages.filter((l) => l.language)
      if (!items.length) return null
      return combine([
        { weight: 60, value: 1, hint: "" },
        { weight: 40, value: avg(items.map((l) => (l.fluency ? 1 : 0))), hint: "Add your level for each language." },
      ])
    }
  }
}

/** The words a section contributes, for the "enough to score" check. */
function sectionText(key: SectionKey, r: Resume): string {
  switch (key) {
    case "summary":
      return r.summary
    case "experience":
      return r.experience.flatMap((x) => [x.role, x.company, ...x.bullets]).join(" ")
    case "education":
      return r.education.flatMap((e) => [e.school, e.degree, ...e.bullets]).join(" ")
    case "projects":
      return r.projects.flatMap((p) => [p.name, p.tech, ...p.bullets]).join(" ")
    case "skills":
      return r.skills.map((g) => g.items).join(" ")
    case "certifications":
      return r.certifications.map((c) => `${c.name} ${c.issuer}`).join(" ")
    case "languages":
      return r.languages.map((l) => `${l.language} ${l.fluency}`).join(" ")
  }
}

/** Splits `total` points over weighted keys as whole numbers that add up exactly (largest remainder). */
export function allocate<K extends string>(total: number, weights: Record<K, number>): Record<K, number> {
  const keys = Object.keys(weights) as K[]
  const sum = keys.reduce((a, k) => a + weights[k], 0)
  const exact = keys.map((k) => ({ k, v: (total * weights[k]) / sum }))
  const out = Object.fromEntries(exact.map(({ k, v }) => [k, Math.floor(v)])) as Record<K, number>
  let left = total - keys.reduce((a, k) => a + out[k], 0)
  for (const { k } of exact.toSorted((a, b) => (b.v % 1) - (a.v % 1))) {
    if (left-- <= 0) break
    out[k]++
  }
  return out
}

// --- The score ---

export function scoreResume(r: Resume, opts: { pages?: number | null; hasMustFix?: boolean } = {}): Score {
  const b = r.basics
  const parts: ScorePart[] = []

  // Contact (10)
  const email = b.email.trim()
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)
  const contactItems: [number, boolean, string][] = [
    [3, Boolean(b.name.trim()), "Add your name."],
    [3, emailOk, email ? "Check your email address." : "Add an email address."],
    [2, Boolean(b.phone.trim()), "Add a phone number."],
    [1, Boolean(b.location.trim()), "Add your city and country."],
    [1, Boolean(b.linkedin.trim() || b.github.trim() || b.website.trim()), "Add LinkedIn, GitHub or a portfolio link."],
  ]
  parts.push({
    id: "contact",
    label: "Contact details",
    earned: contactItems.reduce((a, [pts, ok]) => a + (ok ? pts : 0), 0),
    max: CONTACT_POINTS,
    hint: contactItems.find(([, ok]) => !ok)?.[2] ?? "",
  })

  // Sections (75), weighted by career stage over the visible sections
  const shown = visibleSections(r)
  const base = PROFILE_INFO[r.design.profile].weights
  const maxes = shown.length ? allocate(SECTION_POINTS, Object.fromEntries(shown.map((k) => [k, base[k]])) as Record<SectionKey, number>) : ({} as Record<SectionKey, number>)
  let filledSections = 0
  for (const key of shown) {
    const result = scoreSection(key, r)
    if (result) filledSections++
    const max = maxes[key]
    parts.push({
      id: key,
      label: sectionTitle(r, key),
      earned: result ? Math.round(max * result.quality) : 0,
      max,
      hint: result ? result.hint : "Empty. Fill it in, or remove this section in Design.",
    })
  }

  // Formatting and length (15)
  const dated = [...r.experience, ...r.education, ...r.projects]
  const now = new Date()
  const nowN = now.getFullYear() * 12 + now.getMonth() + 1
  const badDates = dated.filter((x) => isEndBeforeStart(x.start, x.end, x.current) || (toMonthNumber(x.start) ?? 0) > nowN).length
  const odd = shown.filter((k) => r.design.headings[k]?.trim() && !isStandardHeading(k, r.design.headings[k]))
  const text = JSON.stringify({ basics: b, summary: r.summary, ...Object.fromEntries(shown.map((k) => [k, r[k]])) })
  const placeholders = /\[[^\]]{1,40}\]/.test(text)
  const emoji = /\p{Extended_Pictographic}/u.test(text)
  const pages = opts.pages ?? null
  const limit = r.design.profile === "early" ? 1 : 2
  const lengthValue = pages === null || pages <= limit ? 1 : pages === limit + 1 ? 0.4 : 0
  const formatItems: [number, number, string][] = [
    [3, badDates ? 0 : 1, `${plural(badDates, "date")} ${badDates === 1 ? "is" : "are"} backwards or in the future.`],
    [3, odd.length ? 0 : 1, `Use a standard title instead of "${r.design.headings[odd[0]]?.trim()}".`],
    [3, placeholders ? 0 : 1, "Fill in the [ ] placeholders."],
    [2, emoji ? 0 : 1, "Remove emoji. Some ATS turn them into garbage."],
    [1, r.design.fontSize >= 9.5 ? 1 : 0, "Text under 9.5 pt is hard to read."],
    [3, lengthValue, `${pages} pages is long for ${r.design.profile === "early" ? "an early career. Aim for 1" : "a CV. Aim for 2 at most"}.`],
  ]
  parts.push({
    id: "format",
    label: "Formatting and length",
    earned: Math.round(formatItems.reduce((a, [pts, v]) => a + pts * v, 0)),
    max: FORMAT_POINTS,
    hint: formatItems.find(([, v]) => v < 1)?.[2] ?? "",
  })

  // Not enough of a CV to judge yet.
  const totalWords = words(shown.map((k) => sectionText(k, r)).join(" ")).length
  const needed: string[] = []
  if (!b.name.trim()) needed.push("Add your name")
  const minSections = Math.min(2, shown.length)
  if (filledSections < minSections) needed.push(`Fill in at least ${minSections} sections (${filledSections} so far)`)
  if (totalWords < MIN_WORDS) needed.push(`Write a little more: about ${MIN_WORDS} words (${totalWords} so far)`)
  if (needed.length) return { status: "unscored", needed, parts }

  const raw = parts.reduce((a, p) => a + p.earned, 0)
  const capped = Boolean(opts.hasMustFix) && raw > MUST_FIX_CAP
  const score = capped ? MUST_FIX_CAP : raw
  return { status: "scored", score, band: bandFor(score), capped, parts }
}
